/**
 * 메일이 **대행사만 꽂으면 나가는 상태인가.**
 *
 * 지금은 자격증명이 없어 한 통도 안 나간다. 그 상태에서 "구조는 다 됐다"
 * 고 말하려면 근거가 있어야 하고, 근거는 **실제로 보내 보는 것**이다.
 *
 * 그래서 가짜 SMTP 서버를 하나 띄우고 거기로 보낸다. 네트워크 건너편만
 * 가짜이고 나머지는 운영과 같은 길이다: 대기열에 쌓고 · 문면을 만들고 ·
 * nodemailer 로 보내고 · `sent` 로 표시한다.
 *
 * **쌓이기만 하는 것과 나가는 것은 다른 상태다.** 대행사를 붙인 날
 * 처음 보내 보면, 그날 못 나가는 까닭을 손님이 먼저 안다.
 *
 *   DATABASE_URL=... npx tsx scripts/mail-check.ts
 */
import { createServer, type Socket } from "node:net";
import { query, queryOne } from "../src/lib/db";
import { enqueue, flushOutbox, sendNow, renderMail } from "../src/lib/outbox";
import { hashPassword } from "../src/lib/password";

const T: { n: string; pass: boolean; d?: string }[] = [];
const ok = (n: string, pass: boolean, d?: string) => T.push({ n, pass, d });

/** 받은 편지들 */
const inbox: { to: string; body: string }[] = [];

/**
 * 가짜 SMTP.
 *
 * RFC 5321 의 아주 작은 부분만 말한다: 인사하고 · 받는 사람을 받고 ·
 * 본문을 받고 · 끝났다고 한다. **인증을 요구하지 않는다**: 여기서 재는
 * 것은 우리 쪽 길이 끝까지 이어져 있는가이지 대행사의 인증 방식이 아니다.
 */
function smtpSink(port: number): Promise<() => void> {
  return new Promise((done) => {
    const srv = createServer((sock: Socket) => {
      let data = false;
      let to = "";
      let body = "";
      sock.write("220 cm-mail-sink\r\n");
      sock.on("data", (chunk) => {
        const text = chunk.toString();
        if (data) {
          body += text;
          if (text.includes("\r\n.\r\n")) {
            data = false;
            inbox.push({ to, body });
            sock.write("250 OK\r\n");
          }
          return;
        }
        for (const line of text.split("\r\n")) {
          if (!line) continue;
          const up = line.toUpperCase();
          if (up.startsWith("EHLO") || up.startsWith("HELO")) {
            sock.write("250-cm-mail-sink\r\n250 OK\r\n");
          } else if (up.startsWith("MAIL FROM")) {
            sock.write("250 OK\r\n");
          } else if (up.startsWith("RCPT TO")) {
            to = (line.match(/<([^>]+)>/) ?? [])[1] ?? "";
            sock.write("250 OK\r\n");
          } else if (up.startsWith("DATA")) {
            data = true; body = "";
            sock.write("354 go\r\n");
          } else if (up.startsWith("QUIT")) {
            sock.write("221 bye\r\n"); sock.end();
          } else {
            sock.write("250 OK\r\n");
          }
        }
      });
      sock.on("error", () => { /* 끊겨도 검사는 계속한다 */ });
    });
    srv.listen(port, "127.0.0.1", () => done(() => srv.close()));
  });
}

async function main() {
  const PORT = 2526;
  const stop = await smtpSink(PORT);

  /* 운영과 같은 환경변수로 꽂는다. **코드를 고치지 않는다**: 대행사를
     붙이는 날 바뀌는 것이 이 다섯 줄뿐이라는 것이 이 검사의 요지다 */
  process.env.MAIL_HOST = "127.0.0.1";
  process.env.MAIL_PORT = String(PORT);
  process.env.MAIL_FROM = "no-reply@careermatri.com";
  delete process.env.MAIL_USER;
  delete process.env.MAIL_PASS;

  const pw = await hashPassword("mail-check-1234");
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, status, locale)
     VALUES ('mail-check@example.com','메일 검사',$1,'active','ko')
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id::text`, [pw]);
  const uid = u!.id;
  await query(`DELETE FROM outbox WHERE user_id = $1`, [uid]);

  /* ── 1. 다섯 가지가 쌓이고 나간다 ───────────────────────────────── */
  const kinds = ["signup", "purchase_done", "report_ready",
    "refund_requested", "refund_done"] as const;
  for (const k of kinds) {
    await enqueue({
      kind: k, userId: uid, toAddr: "mail-check@example.com",
      payload: { orderNo: "MAILCHECK1" },
      dedupeKey: `mailcheck:${k}:${Date.now()}`, locale: "ko",
    });
  }
  const queued = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM outbox WHERE user_id = $1 AND status='queued'`,
    [uid]);
  ok("거래 메일 다섯 가지가 대기열에 쌓인다", (queued?.n ?? 0) === kinds.length,
    `${queued?.n}통`);

  const r = await flushOutbox(50);
  ok("대기열이 실제로 나간다", r.sent >= kinds.length,
    `보냄 ${r.sent} · 건너뜀 ${r.skipped} · 보류 ${r.held} · 실패 ${r.failed}`);
  ok("받는 쪽에 그만큼 도착한다", inbox.length >= kinds.length,
    `${inbox.length}통`);

  const left = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM outbox WHERE user_id = $1 AND status='queued'`,
    [uid]);
  ok("보낸 것은 대기열에 남지 않는다", (left?.n ?? 0) === 0, `${left?.n}통 남음`);

  /* ── 2. 문면이 비어 있지 않다 ──────────────────────────────────── */
  const subjects = inbox.map((m) => m.body)
    .map((b) => (b.match(/^Subject: (.*)$/m) ?? [])[1] ?? "")
    .filter(Boolean);
  ok("보낸 메일에 제목이 들어 있다", subjects.length >= kinds.length,
    `${subjects.length}개`);
  /* **본문에 링크가 있는가.** 정규 주소가 비어 있으면 링크 없는 메일이
     나가고, 받은 사람은 어디로 가야 하는지 모른다 */
  const withLink = inbox.filter((m) => /https?:\/\//.test(m.body)).length;
  ok("본문에 돌아올 주소가 들어 있다", withLink > 0,
    `${withLink} / ${inbox.length}통. 비었으면 site_configs.canonical_url 을 봅니다`);

  /* ── 3. 열쇠가 든 메일은 대기열을 거치지 않는다 ────────────────── */
  const before = inbox.length;
  const sent = await sendNow({
    kind: "password_reset", userId: uid,
    link: "https://careermatri.com/password/reset/TOKEN", hours: 24,
  });
  ok("비밀번호 재설정이 그 자리에서 나간다", sent && inbox.length === before + 1,
    `${inbox.length - before}통`);
  const stored = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM outbox
      WHERE user_id = $1 AND payload::text LIKE '%TOKEN%'`, [uid]);
  ok("재설정 링크가 표에 적히지 않는다", (stored?.n ?? 0) === 0,
    `${stored?.n}줄`);

  const vsent = await sendNow({
    kind: "verify_email", userId: uid,
    link: "https://careermatri.com/verify/TOKEN2", hours: 72,
  });
  ok("주소 확인 메일이 그 자리에서 나간다", vsent, vsent ? "나감" : "안 나감");

  /* ── 4. 자격증명이 없으면 쌓아만 둔다 ──────────────────────────── */
  delete process.env.MAIL_HOST;
  await query(`DELETE FROM outbox WHERE user_id = $1`, [uid]);
  await enqueue({
    kind: "signup", userId: uid, toAddr: "mail-check@example.com",
    dedupeKey: `mailcheck:hold:${Date.now()}`, locale: "ko",
  });
  /* `transport()` 가 값을 기억해 두므로 다음 줄이 그것을 비운다 */
  const { resetMailTransport } = await import("../src/lib/outbox");
  resetMailTransport();
  const held = await flushOutbox(50);
  ok("자격증명이 없으면 보내지 않고 그대로 둔다", held.sent === 0 && held.held > 0,
    `보냄 ${held.sent} · 보류 ${held.held}`);

  /* ── 5. 두 언어가 다 선다 ──────────────────────────────────────── */
  ok("여섯 가지가 두 언어로 선다",
    (["signup", "purchase_done", "report_ready", "upgrade_done",
      "refund_requested", "refund_done"] as const)
      .every((k) => renderMail(k, "ko")?.subject && renderMail(k, "en")?.subject),
    "src/lib/outbox.ts 의 MAIL");

  await query(`DELETE FROM outbox WHERE user_id = $1`, [uid]);
  stop();

  const bad = T.filter((x) => !x.pass);
  for (const t of T) {
    console.log(`  ${t.pass ? "OK  " : "실패"} ${t.n}${t.d ? `  (${t.d})` : ""}`);
  }
  console.log(bad.length
    ? `\n${bad.length}개가 걸렸다.`
    : `\n메일 검사 OK — ${T.length}가지. 대행사만 꽂으면 나간다.`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
