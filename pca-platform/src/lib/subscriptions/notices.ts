import { query, queryOne } from "@/lib/db";

/**
 * 정기결제 안내 메일(/legal/subscription 3 · 4 · 6조). **표에는 날짜 · 금액만 적고 글은 보낼 때 만든다.**
 *
 * 메일 대기열(`outbox`)과 따로 둔 까닭: 그 표의 종류 제약을 넓히려면 옛 스키마 파일 두 벌을 같이 고쳐야 한다
 * (`db-chain-check` 7번). 새 표 하나로 두면 더하기만으로 끝난다. 보내는 연결은 같은 것을 쓴다(`mailTransport`).
 * 자격증명이 없으면 쌓아만 두고, 붙는 날 차례로 나간다.
 */
export type NoticeKind =
  | "pre_renewal" | "charged" | "payment_failed" | "paused" | "price_change" | "canceled" | "school_ending";

export async function queueNotice(n: {
  kind: NoticeKind; userId: string; subscriptionId?: string | null; dedupeKey: string; payload?: Record<string, string | number>;
}): Promise<boolean> {
  const r = await query(
    `INSERT INTO subscription_notices (subscription_id, user_id, kind, dedupe_key, payload)
     VALUES ($1, $2, $3, $4, $5::jsonb) ON CONFLICT (dedupe_key) DO NOTHING RETURNING id`,
    [n.subscriptionId ?? null, n.userId, n.kind, n.dedupeKey, JSON.stringify(n.payload ?? {})],
  ).catch(() => []);
  return r.length > 0;
}

type P = Record<string, string>;
const CANCEL_KO = "해지는 [내 정보 › 이용권]에서 버튼 하나로 할 수 있습니다. 고객지원 이메일(hari_info@hari.re.kr)로도 됩니다.";
const CANCEL_EN = "You can cancel with one button under My info › Pass, or by emailing hari_info@hari.re.kr.";

const KO: Record<NoticeKind, (n: string, base: string, p: P) => { subject: string; text: string }> = {
  pre_renewal: (n, base, p) => ({
    subject: `MAT 이용권이 ${p.date}에 자동 결제됩니다`,
    text: `${n}님, MAT 이용권이 ${p.date}에 자동으로 결제됩니다.\n결제 금액: ${p.amount}\n\n${CANCEL_KO}\n해지해도 이미 결제한 기간은 끝까지 쓸 수 있습니다.\n${base}/mat/pass\n`,
  }),
  charged: (n, base, p) => ({
    subject: "MAT 이용권이 결제됐습니다",
    text: `${n}님, MAT 이용권 ${p.amount}이 결제됐습니다.\n다음 결제일: ${p.next}\n주문 번호 ${p.orderNo}\n\n${CANCEL_KO}\n${base}/mat/pass\n`,
  }),
  payment_failed: (n, base, p) => ({
    subject: "MAT 이용권 결제가 되지 않았습니다",
    text: `${n}님, MAT 이용권 자동 결제(${p.amount})가 되지 않았습니다.\n3일 동안 하루에 한 번 다시 결제합니다. 그래도 안 되면 이용권을 멈춥니다. 밀린 금액은 청구하지 않습니다.\n결제 카드를 바꾸면 바로 이어서 쓸 수 있습니다.\n${base}/mat/pass\n`,
  }),
  paused: (n, base) => ({
    subject: "MAT 이용권을 멈췄습니다",
    text: `${n}님, 3일 동안 다시 결제했지만 되지 않아 MAT 이용권을 멈췄습니다. 밀린 금액은 청구하지 않습니다.\n결제 카드를 바꾸면 바로 이어서 쓸 수 있습니다.\n${base}/mat/pass\n`,
  }),
  price_change: (n, base, p) => ({
    subject: `MAT 이용권 금액이 ${p.date}부터 바뀝니다`,
    text: `${n}님, MAT 이용권 금액이 ${p.date}부터 ${p.before}에서 ${p.after}으로 바뀝니다.\n바뀐 금액에 다시 동의하셔야 그날부터 자동 결제가 이어집니다. 동의하지 않으시면 자동 결제를 하지 않습니다.\n${base}/mat/pass\n\n${CANCEL_KO}\n`,
  }),
  canceled: (n, base, p) => ({
    subject: "MAT 정기결제를 해지했습니다",
    text: `${n}님, MAT 정기결제를 해지했습니다. 다음 결제부터 멈춥니다.\n이미 결제한 기간은 ${p.until}까지 그대로 쓸 수 있습니다.\n${base}/mat/pass\n`,
  }),
  school_ending: (n, base, p) => ({
    subject: `학교 · 기관 MAT 이용권이 ${p.date}에 끝납니다`,
    text: `${n}님, 학교 · 기관에서 받은 MAT 이용권이 ${p.date}에 끝납니다.\n끝난 뒤에도 개인 이용권으로 이어 쓸 수 있고, 적어 둔 자료는 그대로 남습니다.\n${base}/mat/pricing\n`,
  }),
};

const EN: Record<NoticeKind, (n: string, base: string, p: P) => { subject: string; text: string }> = {
  pre_renewal: (n, base, p) => ({
    subject: `Your MAT pass renews on ${p.date}`,
    text: `${n}, your MAT pass renews automatically on ${p.date}.\nAmount: ${p.amount}\n\n${CANCEL_EN}\nIf you cancel, you keep the period you already paid for.\n${base}/mat/pass\n`,
  }),
  charged: (n, base, p) => ({
    subject: "Your MAT pass was renewed",
    text: `${n}, we charged ${p.amount} for your MAT pass.\nNext charge: ${p.next}\nOrder ${p.orderNo}\n\n${CANCEL_EN}\n${base}/mat/pass\n`,
  }),
  payment_failed: (n, base, p) => ({
    subject: "Your MAT payment did not go through",
    text: `${n}, the automatic payment (${p.amount}) did not go through.\nWe will try once a day for 3 days. If it still fails, we pause your pass. We never charge for missed days.\nChange your card to continue right away.\n${base}/mat/pass\n`,
  }),
  paused: (n, base) => ({
    subject: "Your MAT pass is paused",
    text: `${n}, we tried for 3 days and the payment did not go through, so your MAT pass is paused. We never charge for missed days.\nChange your card to continue right away.\n${base}/mat/pass\n`,
  }),
  price_change: (n, base, p) => ({
    subject: `Your MAT price changes on ${p.date}`,
    text: `${n}, from ${p.date} your MAT price changes from ${p.before} to ${p.after}.\nPlease agree to the new price to keep automatic payments. If you do not agree, we will not charge you.\n${base}/mat/pass\n\n${CANCEL_EN}\n`,
  }),
  canceled: (n, base, p) => ({
    subject: "Your MAT subscription is canceled",
    text: `${n}, your MAT subscription is canceled. No further payments will be taken.\nYou can keep using it until ${p.until}.\n${base}/mat/pass\n`,
  }),
  school_ending: (n, base, p) => ({
    subject: `Your school MAT pass ends on ${p.date}`,
    text: `${n}, the MAT pass from your school or institution ends on ${p.date}.\nYou can continue with a personal pass, and your records stay.\n${base}/mat/pricing\n`,
  }),
};

export function composeNotice(kind: NoticeKind, locale: string | null, name: string | null, base: string, p: P) {
  const M = locale === "en" ? EN : KO;
  return M[kind](name ?? (locale === "en" ? "Hello" : "회원"), base, p);
}

/** 쌓인 안내를 내보낸다(ops tick). 자격증명이 없으면 그대로 둔다(held) */
export async function flushSubscriptionNotices(limit = 100): Promise<{ sent: number; held: number; skipped: number; failed: number }> {
  const out = { sent: 0, held: 0, skipped: 0, failed: 0 };
  const rows = await query<{ id: string; kind: NoticeKind; payload: P; attempts: number; email: string | null; name: string | null; locale: string | null }>(
    `SELECT n.id::text, n.kind, n.payload, n.attempts, u.email, u.display_name AS name, u.locale
       FROM subscription_notices n LEFT JOIN users u ON u.id = n.user_id
      WHERE n.status = 'queued' ORDER BY n.id LIMIT $1`, [limit]).catch(() => []);
  if (!rows.length) return out;
  const { mailTransport } = await import("@/lib/outbox");
  const { publicBaseForLocale } = await import("@/lib/urls");
  const tx = mailTransport();
  for (const r of rows) {
    if (!r.email) { await query(`UPDATE subscription_notices SET status = 'skipped' WHERE id = $1`, [r.id]); out.skipped++; continue; }
    if (!tx) { out.held++; continue; }
    const base = (await publicBaseForLocale(r.locale).catch(() => null)) ?? "";
    const msg = composeNotice(r.kind, r.locale, r.name, base, r.payload ?? {});
    try {
      await tx.sendMail({ from: process.env.MAIL_FROM, to: r.email, subject: msg.subject, text: msg.text });
      await query(`UPDATE subscription_notices SET status = 'sent', sent_at = now() WHERE id = $1`, [r.id]);
      out.sent++;
    } catch (e) {
      const dead = r.attempts + 1 >= 3;
      await query(`UPDATE subscription_notices SET attempts = attempts + 1, last_error = $2, status = $3 WHERE id = $1`,
        [r.id, String(e).slice(0, 300), dead ? "failed" : "queued"]);
      out.failed++;
    }
  }
  return out;
}

/** 시험 · 운영자 화면이 읽는다 */
export async function noticesOf(userId: string): Promise<{ kind: NoticeKind; payload: P; created_at: string }[]> {
  return query<{ kind: NoticeKind; payload: P; created_at: string }>(`SELECT kind, payload, created_at::text FROM subscription_notices WHERE user_id = $1 ORDER BY id`, [userId]).catch(() => []);
}

export async function noticeCount(userId: string, kind: NoticeKind): Promise<number> {
  return (await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM subscription_notices WHERE user_id = $1 AND kind = $2`,
    [userId, kind]).catch(() => null))?.n ?? 0;
}
