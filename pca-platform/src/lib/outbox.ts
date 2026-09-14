import { createTransport, type Transporter } from "nodemailer";
import { query, queryOne } from "./db";

/**
 * 보낼 것 대기열.
 *
 * **화면은 한 줄 적고 끝낸다.** 결제 처리 한가운데에서 메일 서버를
 * 기다리면, 그 서버가 느린 날 결제가 실패한다. 돈이 들어오는 길에
 * 메일이 끼어 있으면 안 된다.
 *
 * 자격증명이 없으면 **쌓아만 둔다.** 나중에 붙는 날 순서대로 나간다.
 */

export type OutboxKind = "signup" | "report_ready" | "upgrade_done" | "code_low";

/**
 * 보낼 것을 적는다. 실패해도 던지지 않는다 — 알림 하나 때문에 결제나
 * 가입이 되돌아가면 안 된다. 못 적었으면 안 나가는 것으로 끝난다.
 */
export async function enqueue(opts: {
  kind: OutboxKind;
  userId?: string | null;
  toAddr?: string | null;
  payload?: Record<string, unknown>;
  /** 같은 일로 두 번 쌓이지 않게. 예: `report_ready:7978` */
  dedupeKey?: string;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO outbox (kind, user_id, to_addr, payload, dedupe_key)
       VALUES ($1,$2,$3,$4::jsonb,$5)
       ON CONFLICT (dedupe_key) DO NOTHING`,
      [
        opts.kind,
        opts.userId ?? null,
        opts.toAddr ?? null,
        JSON.stringify(opts.payload ?? {}),
        opts.dedupeKey ?? null,
      ],
    );
  } catch {
    // 적지 못한 것은 안 나간다. 그것뿐이다
  }
}

/**
 * 결과지가 열렸다고 알린다. **열린 것이 확인된 뒤에만 적는다.**
 *
 * 채점과 공개가 같은 순간이 아니기 때문이다 — 개인 결제는 채점이 곧
 * 공개지만, 승인제 회차는 담당자가 누를 때까지 학생에게 `"pending"` 이
 * 간다. 채점 직후에 보내면 그 학생은 메일을 받고 들어와 빈 화면을 본다.
 *
 * 그래서 두 곳에서 부른다 — 제출 직후(승인제면 여기서 조용히 접힌다)와
 * 담당자가 공개를 누를 때. 같은 응시로 두 번 쌓이지는 않는다.
 */
export async function notifyReportReady(attemptId: string): Promise<boolean> {
  const a = await queryOne<{ user_id: string; open: boolean }>(
    `SELECT a.user_id,
            (a.scored_at IS NOT NULL
             AND (ts.release_mode <> 'manual' OR ts.released_at IS NOT NULL)) AS open
       FROM attempts a JOIN test_sessions ts ON ts.id = a.session_id
      WHERE a.id = $1`,
    [attemptId],
  );
  if (!a || !a.open) return false;
  await enqueue({ kind: "report_ready", userId: a.user_id, dedupeKey: `report_ready:${attemptId}` });
  return true;
}

/** 회차 하나를 공개했을 때. 채점이 끝난 사람에게만 간다. */
export async function notifySessionReleased(sessionId: string): Promise<number> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM attempts WHERE session_id = $1 AND scored_at IS NOT NULL`, [sessionId]);
  let n = 0;
  for (const r of rows) if (await notifyReportReady(r.id)) n++;
  return n;
}

/** 메일을 보낼 수 있는 상태인가. 없으면 화면이 "준비 중" 이라고 말할 수 있다. */
export function mailReady(): boolean {
  return Boolean(process.env.MAIL_HOST && process.env.MAIL_FROM);
}

let cached: Transporter | null = null;
function transport(): Transporter | null {
  if (!mailReady()) return null;
  if (cached) return cached;
  cached = createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT ?? 587),
    secure: Number(process.env.MAIL_PORT ?? 587) === 465,
    auth: process.env.MAIL_USER
      ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
      : undefined,
  });
  return cached;
}

type Row = {
  id: string;
  kind: OutboxKind;
  to_addr: string | null;
  email: string | null;
  display_name: string | null;
  payload: Record<string, string>;
  attempts: number;
};

/**
 * 문면은 보낼 때 만든다. **표에 본문을 저장하지 않는다** — 결과지 내용이
 * 메일 표로 복사되면 파기(익명화)가 반쪽이 된다.
 *
 * 링크에 결과지 번호를 담지 않는다. 받는 사람이 로그인해서 자기 목록에서
 * 고르게 한다 — 메일은 전달 과정에서 남의 눈에 띌 수 있다.
 */
function compose(r: Row): { subject: string; text: string } | null {
  const name = r.display_name ?? "회원";
  const base = process.env.PLATFORM_URL ?? "";
  switch (r.kind) {
    case "signup":
      return {
        subject: "가입이 끝났습니다",
        text: `${name}님, 가입이 끝났습니다.\n\n로그인하시면 바로 시작하실 수 있습니다.\n${base}/login\n`,
      };
    case "report_ready":
      return {
        subject: "결과지가 준비됐습니다",
        text: `${name}님, 채점이 끝나 결과지가 열렸습니다.\n\n로그인하신 뒤 내 검사에서 보실 수 있습니다.\n${base}/my\n`,
      };
    case "upgrade_done":
      return {
        subject: "결과지가 넓어졌습니다",
        text: `${name}님, 결제가 확인되어 남은 절이 열렸습니다.\n문항을 다시 푸실 필요는 없습니다.\n\n${base}/my\n`,
      };
    case "code_low":
      return {
        subject: `[운영] 응시권 코드가 ${r.payload.left ?? "?"}장 남았습니다`,
        text:
          `상품 ${r.payload.product ?? "?"} 의 안 쓴 코드가 ${r.payload.left ?? "?"}장 남았습니다.\n` +
          `떨어지면 밤사이 구매가 멈춥니다.\n\n` +
          `  npm run metri:codes -- --product ${r.payload.product ?? "REPORT_HS"} --count 100 --batch <묶음>\n`,
      };
    default:
      return null;
  }
}

export type FlushResult = {
  sent: number;
  /** 보낼 곳이나 문면이 없어 접은 것. 다시 시도하지 않는다 */
  skipped: number;
  failed: number;
  /** 자격증명이 없어 그대로 둔 것. 붙는 날 나간다 — 접은 것과 다르다 */
  held: number;
};

/**
 * 쌓인 것을 내보낸다. 주기적으로 부른다(cron·컨테이너 사이드카).
 *
 * **세 번 실패하면 포기한다.** 죽은 주소에 영원히 매달리면 그 뒤에 줄
 * 선 것들이 안 나간다. 포기한 것은 `failed` 로 남아 브리핑에 뜬다.
 */
export async function flushOutbox(limit = 50): Promise<FlushResult> {
  const rows = await query<Row>(
    `SELECT o.id, o.kind, o.to_addr, u.email, u.display_name, o.payload, o.attempts
       FROM outbox o LEFT JOIN users u ON u.id = o.user_id
      WHERE o.status = 'queued'
      ORDER BY o.id
      LIMIT $1`,
    [limit],
  );
  const out: FlushResult = { sent: 0, skipped: 0, failed: 0, held: 0 };
  const tx = transport();

  for (const r of rows) {
    const to = r.to_addr ?? r.email;
    const msg = compose(r);
    // 보낼 곳이 없거나(익명화된 사람) 문면이 없으면 조용히 접는다
    if (!to || !msg) {
      await query(`UPDATE outbox SET status='skipped' WHERE id=$1`, [r.id]);
      out.skipped++;
      continue;
    }
    if (!tx) { out.held++; continue; } // 자격증명이 아직 없다. 그대로 둔다

    try {
      await tx.sendMail({ from: process.env.MAIL_FROM, to, subject: msg.subject, text: msg.text });
      await query(`UPDATE outbox SET status='sent', sent_at=now() WHERE id=$1`, [r.id]);
      out.sent++;
    } catch (e) {
      const attempts = r.attempts + 1;
      const dead = attempts >= 3;
      await query(
        `UPDATE outbox SET attempts=$2, last_error=$3, status=$4 WHERE id=$1`,
        [r.id, attempts, String(e).slice(0, 300), dead ? "failed" : "queued"],
      );
      out.failed++;
    }
  }
  return out;
}

/** 대기열 현황. 브리핑이 읽는다. */
export async function outboxStatus() {
  return query<{ kind: string; status: string; n: number }>(
    `SELECT kind, status, count(*)::int AS n FROM outbox GROUP BY kind, status ORDER BY kind, status`,
  );
}

/**
 * 응시권 코드 재고를 보고, 모자라면 운영자에게 한 줄 남긴다.
 *
 * **재고가 떨어지면 밤사이 구매가 멈추는데 아무도 모른다.** 그 자리를
 * 메우는 장치다. 같은 날 같은 상품으로는 한 번만 쌓인다.
 */
export async function checkCodeStock(): Promise<{ product: string; left: number }[]> {
  const min = Number(process.env.CODE_STOCK_MIN ?? 20);
  const to = process.env.OPS_EMAIL ?? process.env.MAIL_FROM ?? null;
  /**
   * **다 쓴 상품이 표에서 사라지면 안 된다.** 안 쓴 코드만 세면, 마지막
   * 한 장까지 팔린 상품은 행이 없어져 경고도 없이 조용해진다. 재고가
   * 0인 그때가 가장 급한 때인데 말이다.
   *
   * 그래서 한 번이라도 코드를 찍은 상품을 전부 세고, 그 안에서 아직
   * 살아 있는 장수를 센다. 코드로 파는 상품인지 아닌지는 찍어 본 적이
   * 있는가로만 알 수 있다.
   */
  const rows = await query<{ product_code: string; left: number }>(
    `SELECT product_code,
            count(*) FILTER (
              WHERE used_at IS NULL AND voided_at IS NULL
                AND (expires_at IS NULL OR expires_at > now()))::int AS left
       FROM redemption_codes
      GROUP BY product_code`,
  );
  const low = rows.filter((r) => r.left < min);
  const today = new Date().toISOString().slice(0, 10);
  for (const r of low) {
    await enqueue({
      kind: "code_low",
      toAddr: to,
      payload: { product: r.product_code, left: String(r.left) },
      dedupeKey: `code_low:${r.product_code}:${today}`,
    });
  }
  return low.map((r) => ({ product: r.product_code, left: r.left }));
}

/** 이 사람에게 이미 같은 종류를 보냈는가. 검사에서 쓴다. */
export async function outboxCount(kind: OutboxKind, userId: string): Promise<number> {
  const r = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM outbox WHERE kind=$1 AND user_id=$2`, [kind, userId]);
  return r?.n ?? 0;
}
