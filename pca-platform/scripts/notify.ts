/**
 * 알림 발송기. 크론으로 5분마다 돌린다.
 *
 *   npm run notify            보낸다
 *   npm run notify -- --dry   보낼 것만 보여주고 표시는 남기지 않는다
 *
 * 하는 일 세 가지
 *   1. 응답 기한을 넘긴 신청을 닫고 시간대를 풀어준다
 *   2. 끝난 시간이 지난 확정 건을 completed 로 넘긴다 (후기를 쓸 수 있게)
 *   3. notifications 에서 때가 된 것을 보낸다
 *
 * 메일 발송은 MAIL_WEBHOOK_URL 로 POST 한다. 외부 메일 SDK 를 의존성으로
 * 들이지 않으려는 것이고, 어떤 발송 업체를 쓸지 아직 정하지 않았기 때문이다.
 * 주소가 없으면 보내지 않고 그대로 큐에 남긴다 — 보낸 척하지 않는다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { query } from "../src/lib/db";
import { completeDueSessions, expireStaleRequests } from "../src/lib/mentoring";

function loadEnv(file: string) {
  try {
    for (const line of readFileSync(resolve(process.cwd(), file), "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* 파일이 없으면 환경변수가 이미 있다고 본다 */
  }
}
loadEnv(".env.local");

const DRY = process.argv.includes("--dry");
const BATCH = 50;

type Due = {
  id: string;
  kind: string;
  subject: string;
  body: string;
  email: string;
  display_name: string;
};

async function due(): Promise<Due[]> {
  return query<Due>(
    `SELECT n.id, n.kind, n.subject, n.body, u.email, u.display_name
       FROM notifications n
       JOIN users u ON u.id = n.recipient_id
       LEFT JOIN mentoring_requests r ON r.id = n.request_id
      WHERE n.sent_at IS NULL
        AND n.channel = 'email'
        AND n.send_after <= now()
        AND u.email IS NOT NULL
        -- 취소·거절된 건의 리마인더는 보내지 않는다
        AND (n.kind NOT IN ('reminder_24h', 'reminder_1h') OR r.status = 'accepted')
      ORDER BY n.send_after
      LIMIT ${BATCH}`,
  );
}

async function send(row: Due): Promise<void> {
  const url = process.env.MAIL_WEBHOOK_URL;
  if (!url) throw new Error("MAIL_WEBHOOK_URL 이 없습니다");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.MAIL_WEBHOOK_TOKEN
        ? { Authorization: `Bearer ${process.env.MAIL_WEBHOOK_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || "no-reply@careerpeak.co.kr",
      to: row.email,
      subject: row.subject,
      text: row.body,
    }),
  });
  if (!res.ok) {
    throw new Error(`발송 실패 (${res.status}) ${(await res.text().catch(() => "")).slice(0, 200)}`);
  }
}

async function main() {
  const expired = await expireStaleRequests();
  const completed = await completeDueSessions();
  if (expired > 0) console.log(`기한 초과로 닫은 신청 ${expired}건`);
  if (completed > 0) console.log(`완료 처리한 세션 ${completed}건`);

  const rows = await due();
  if (rows.length === 0) {
    console.log("보낼 알림이 없습니다.");
    return;
  }

  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    if (DRY) {
      console.log(`\n--- [${row.kind}] → ${row.email}\n${row.subject}\n${row.body}`);
      continue;
    }
    try {
      await send(row);
      await query(`UPDATE notifications SET sent_at = now(), attempts = attempts + 1 WHERE id = $1`, [
        row.id,
      ]);
      sent++;
    } catch (e) {
      // 실패는 큐에 남긴다. 다음 실행에서 다시 시도한다.
      await query(
        `UPDATE notifications SET attempts = attempts + 1, last_error = $2 WHERE id = $1`,
        [row.id, e instanceof Error ? e.message : String(e)],
      );
      failed++;
    }
  }

  if (DRY) console.log(`\n(--dry) ${rows.length}건이 대기 중입니다. 아무것도 보내지 않았습니다.`);
  else console.log(`발송 ${sent}건, 실패 ${failed}건.`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
