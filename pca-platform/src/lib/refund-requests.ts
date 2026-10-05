/**
 * 환불 요청.
 *
 * 판정은 `refund.ts` 한 곳에서 한다(설계 원칙 10). 여기가 더하는 것은
 * **요청이 들어온 사건**이다. 그것이 없으면
 *
 *   - 요청한 사람은 접수됐는지 알 수 없어 메일을 다시 보내고
 *   - 운영자는 어제 무엇을 거절했는지 알 수 없고
 *   - 거절한 까닭을 한 달 뒤에 설명할 수 없다
 *
 * **규칙을 글로만 적어 두지 않는다.** 약관에 "응시 전 환불" 이라고 써
 * 두고 화면에 버튼이 없으면, 그 규칙은 메일을 쓸 줄 아는 사람에게만
 * 있는 규칙이다.
 */
import { query, queryOne, tx } from "./db";
import { refundable, recordRefund, type Verdict } from "./refund";
import { enqueue } from "./outbox";

export const REASONS = [
  "changed_mind",
  "not_as_expected",
  "cannot_use",
  "duplicate",
  "other",
] as const;
export type ReasonCode = (typeof REASONS)[number];

export function isReason(v: string): v is ReasonCode {
  return (REASONS as readonly string[]).includes(v);
}

export const REASON_LABEL: Record<ReasonCode, { ko: string; en: string }> = {
  changed_mind: { ko: "마음이 바뀌었습니다", en: "Changed my mind" },
  not_as_expected: { ko: "기대한 내용과 다릅니다", en: "Not what I expected" },
  cannot_use: { ko: "쓸 수 없는 상태입니다", en: "Cannot use it" },
  duplicate: { ko: "두 번 결제됐습니다", en: "Charged twice" },
  other: { ko: "그 밖의 사유", en: "Other" },
};

/**
 * 요청 시점의 사실.
 *
 * **지금을 박아 둔다.** 요청 다음 날 응시를 시작했다고 해서 어제의
 * '응시 전' 이 사라지면 안 된다.
 */
type Snapshot = { attempt: string; report: string };

async function snapshot(orderId: string): Promise<Snapshot> {
  const r = await queryOne<{ attempt: string | null; report: string | null }>(
    `SELECT
       (SELECT CASE WHEN a.submitted_at IS NOT NULL THEN 'submitted'
                    WHEN a.started_at   IS NOT NULL THEN 'progress'
                    ELSE 'none' END
          FROM attempts a
          LEFT JOIN seats s ON s.id = a.seat_id
         WHERE a.id = o.upgrades_attempt_id OR s.order_id = o.id
         ORDER BY a.started_at DESC NULLS LAST LIMIT 1) AS attempt,
       (SELECT CASE WHEN g.first_viewed_at IS NOT NULL THEN 'viewed'
                    ELSE 'generated' END
          FROM report_grants g
         WHERE g.attempt_id = o.upgrades_attempt_id LIMIT 1) AS report
     FROM orders o WHERE o.id = $1`,
    [orderId],
  ).catch(() => null);
  return { attempt: r?.attempt ?? "none", report: r?.report ?? "none" };
}

export type RequestResult =
  | { ok: true; id: string; verdict: Verdict }
  | { ok: false; reason: "not_found" | "not_mine" | "already_open" };

/**
 * 요청을 접수한다. **거절될 요청도 접수한다.**
 *
 * 규칙으로 돌려줄 수 없는 경우에 버튼을 숨기면, 그 사람은 메일로 같은
 * 것을 묻고 그 메일에는 번호가 없다. 접수하고 **그 자리에서 판정을
 * 보여 주는 쪽**이 낫다: 왜 안 되는지가 화면에 남는다.
 */
export async function requestRefund(opts: {
  orderNo: string;
  userId: string;
  reason: ReasonCode;
}): Promise<RequestResult> {
  const o = await queryOne<{ id: string; user_id: string; locale: string | null }>(
    `SELECT o.id::text, o.user_id::text, u.locale
       FROM orders o JOIN users u ON u.id = o.user_id
      WHERE o.order_no = $1`,
    [opts.orderNo],
  ).catch(() => null);
  if (!o) return { ok: false, reason: "not_found" };
  /* **본인 주문인지 서버가 본다.** 주문 번호를 들고 왔다는 것은 본인이라는
     뜻이 아니다 */
  if (o.user_id !== opts.userId) return { ok: false, reason: "not_mine" };

  const open = await queryOne<{ id: string }>(
    `SELECT id::text FROM refund_requests
      WHERE order_id = $1 AND status IN ('requested','approved') LIMIT 1`,
    [o.id],
  ).catch(() => null);
  if (open) return { ok: false, reason: "already_open" };

  const verdict = await refundable(o.id);
  const snap = await snapshot(o.id);

  const row = await queryOne<{ id: string }>(
    `INSERT INTO refund_requests
       (order_id, user_id, reason_code, attempt_state, report_state,
        verdict_ok, verdict_code, verdict_amount)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id::text`,
    [
      o.id, opts.userId, opts.reason, snap.attempt, snap.report,
      verdict.ok, verdict.ok ? verdict.reason : verdict.deny,
      verdict.ok ? verdict.amount : 0,
    ],
  );

  /* 접수됐다는 것을 알린다. **메일이 실패해도 접수는 남는다** */
  await enqueue({
    kind: "refund_requested",
    userId: opts.userId,
    payload: { orderNo: opts.orderNo },
    dedupeKey: `refund_requested:${row!.id}`,
    locale: o.locale,
  });

  return { ok: true, id: row!.id, verdict };
}

export type RefundRequestRow = {
  id: string;
  orderNo: string;
  productCode: string;
  amount: number;
  currency: string;
  requestedAt: string;
  reason: ReasonCode;
  attemptState: string | null;
  reportState: string | null;
  verdictOk: boolean;
  verdictCode: string;
  verdictAmount: number;
  status: string;
  decidedAt: string | null;
};

export async function openRequests(limit = 50): Promise<RefundRequestRow[]> {
  return listRequests({ onlyOpen: true, limit });
}

export async function listRequests(
  opts: { onlyOpen?: boolean; userId?: string; limit?: number } = {},
): Promise<RefundRequestRow[]> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (opts.onlyOpen) where.push(`r.status = 'requested'`);
  if (opts.userId) { args.push(opts.userId); where.push(`r.user_id = $${args.length}`); }
  args.push(opts.limit ?? 50);

  const rows = await query<{
    id: string; order_no: string; product_code: string; amount: number;
    currency: string; requested_at: string; reason_code: string;
    attempt_state: string | null; report_state: string | null;
    verdict_ok: boolean; verdict_code: string; verdict_amount: number;
    status: string; decided_at: string | null;
  }>(
    `SELECT r.id::text, o.order_no, o.product_code, o.amount, o.currency,
            r.requested_at::text, r.reason_code, r.attempt_state, r.report_state,
            r.verdict_ok, r.verdict_code, r.verdict_amount, r.status,
            r.decided_at::text
       FROM refund_requests r JOIN orders o ON o.id = r.order_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY r.requested_at DESC
      LIMIT $${args.length}`,
    args,
  ).catch(() => []);

  return rows.map((r) => ({
    id: r.id, orderNo: r.order_no, productCode: r.product_code,
    amount: r.amount, currency: r.currency.trim(),
    requestedAt: r.requested_at.slice(0, 16), reason: r.reason_code as ReasonCode,
    attemptState: r.attempt_state, reportState: r.report_state,
    verdictOk: r.verdict_ok, verdictCode: r.verdict_code,
    verdictAmount: r.verdict_amount, status: r.status,
    decidedAt: r.decided_at?.slice(0, 16) ?? null,
  }));
}

/**
 * 운영자가 결정한다.
 *
 * **승인이 곧 송금이 아니다.** 돈을 돌려보내는 것은 대행사 쪽 일이고
 * 가맹점 심사 전까지 열려 있지 않다. 그래서 `approved`(돌려주기로
 * 정했다)와 `refunded`(실제로 나갔다)를 나눠 둔다. 하나로 두면 심사 전에
 * 누른 '승인' 이 "이미 받으셨습니다" 로 읽힌다.
 */
export async function decide(opts: {
  requestId: string;
  by: string;
  action: "approve" | "deny";
}): Promise<{ ok: boolean; reason?: string }> {
  const r = await queryOne<{ order_id: string; status: string }>(
    `SELECT order_id::text, status FROM refund_requests WHERE id = $1`,
    [opts.requestId],
  ).catch(() => null);
  if (!r) return { ok: false, reason: "없는 요청입니다." };
  if (r.status !== "requested") return { ok: false, reason: "이미 처리된 요청입니다." };

  if (opts.action === "deny") {
    await query(
      `UPDATE refund_requests SET status = 'denied', decided_at = now(), decided_by = $2
        WHERE id = $1`,
      [opts.requestId, opts.by],
    );
    return { ok: true };
  }

  /* 승인. **판정을 지금 다시 본다**: 요청 뒤에 응시를 시작했을 수 있다 */
  const v = await recordRefund(r.order_id);
  if (!v.ok) {
    return { ok: false, reason: `지금은 돌려줄 수 없습니다 (${v.deny}).` };
  }
  const refundRow = await queryOne<{ id: string }>(
    `SELECT id::text FROM refunds WHERE order_id = $1 ORDER BY id DESC LIMIT 1`,
    [r.order_id],
  ).catch(() => null);

  await query(
    `UPDATE refund_requests
        SET status = 'approved', decided_at = now(), decided_by = $2, refund_id = $3
      WHERE id = $1`,
    [opts.requestId, opts.by, refundRow?.id ?? null],
  );
  return { ok: true };
}

/** 요청한 사람이 스스로 거둔다 */
export async function withdraw(requestId: string, userId: string): Promise<boolean> {
  const r = await tx(async (c) => {
    const res = await c.query(
      `UPDATE refund_requests SET status = 'withdrawn'
        WHERE id = $1 AND user_id = $2 AND status = 'requested'`,
      [requestId, userId],
    );
    return res.rowCount ?? 0;
  }).catch(() => 0);
  return r > 0;
}
