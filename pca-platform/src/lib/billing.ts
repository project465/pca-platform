import { query, queryOne, tx } from "@/lib/db";
import type { PoolClient } from "pg";
import { cancel, newOrderId, PayError } from "@/lib/pay";
import { releaseCredit } from "@/lib/pack";
import { percentFor, refundRules } from "@/lib/refund";

export class BillingError extends Error {}

/** 학과 계약으로 들어온 학생은 무료다. memberships 에 행이 있으면 소속이 있다는 뜻. */
export async function isFreeUser(userId: string): Promise<boolean> {
  return (await sponsorOrgOf(userId)) !== null;
}

/**
 * 이 사람의 세션 값을 대신 낼 기관. 소속이 없으면 null 이고, 그때는 본인이 낸다.
 *
 * 소속이 여럿이면 가장 먼저 맺은 곳으로 단다. 한 사람이 학과와 연구소에 동시에
 * 걸려 있는 경우가 있는데, 둘 중 무엇이 맞는지는 시스템이 알 수 없다. 임의로
 * 고르되 어디로 달았는지를 결제 행에 남겨, 청구서를 보고 바로잡을 수 있게 한다.
 */
export async function sponsorOrgOf(userId: string): Promise<string | null> {
  const row = await queryOne<{ org_id: string }>(
    `SELECT org_id FROM memberships WHERE user_id = $1 ORDER BY created_at, id LIMIT 1`,
    [userId],
  );
  return row?.org_id ?? null;
}

export async function priceOf(minutes: number): Promise<number | null> {
  const row = await queryOne<{ amount: number }>(
    `SELECT amount FROM mentoring_prices WHERE session_minutes = $1`,
    [minutes],
  );
  return row?.amount ?? null;
}

export async function priceTable(): Promise<{ session_minutes: number; amount: number }[]> {
  return query(`SELECT session_minutes, amount FROM mentoring_prices ORDER BY session_minutes`);
}

export type PendingPayment = {
  payment_id: string;
  order_id: string;
  amount: number;
  status: string;
};

/** 신청과 같은 트랜잭션에서 결제 건을 만든다. 무료 이용자면 만들지 않는다. */
export async function createPayment(
  c: PoolClient,
  input: { requestId: string; userId: string; amount: number },
): Promise<string> {
  const orderId = newOrderId();
  await c.query(
    `INSERT INTO payments (request_id, user_id, amount, order_id, provider)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      input.requestId,
      input.userId,
      input.amount,
      orderId,
      process.env.PAYMENTS_DRY_RUN === "1" ? "dryrun" : "toss",
    ],
  );
  return orderId;
}

/**
 * 기관이 부담하는 건. 결제대행사를 거치지 않으므로 만드는 순간 이미 'paid' 다.
 *
 * 금액을 0 으로 적지 않는다. 0 으로 적으면 정산 쿼리가 그 행을 걸러내고, 결국
 * 결제 행을 안 만들던 때와 똑같아진다. 학생이 낼 돈이 0 인 것과 세션 값이 0 인
 * 것은 다른 이야기다.
 */
export async function createOrgPayment(
  c: PoolClient,
  input: { requestId: string; userId: string; orgId: string; packId: string; amount: number },
): Promise<string> {
  const orderId = "ORG-" + newOrderId();
  await c.query(
    `INSERT INTO payments
       (request_id, user_id, amount, order_id, provider, payer_org_id, pack_id, status, paid_at)
     VALUES ($1, $2, $3, $4, 'org', $5, $6, 'paid', now())`,
    [input.requestId, input.userId, input.amount, orderId, input.orgId, input.packId],
  );
  return orderId;
}

export async function paymentOf(requestId: string): Promise<PendingPayment | null> {
  return queryOne<PendingPayment>(
    `SELECT id AS payment_id, order_id, amount, status
       FROM payments WHERE request_id = $1`,
    [requestId],
  );
}

export async function markPaid(input: {
  orderId: string;
  userId: string;
  providerKey: string;
  method: string | null;
  receiptUrl: string | null;
}): Promise<{ requestId: string }> {
  const rows = await query<{ request_id: string }>(
    `UPDATE payments
        SET status = 'paid', provider_key = $3, method = $4, receipt_url = $5, paid_at = now()
      WHERE order_id = $1 AND user_id = $2 AND status = 'ready'
      RETURNING request_id`,
    [input.orderId, input.userId, input.providerKey, input.method, input.receiptUrl],
  );
  if (rows.length === 0) throw new BillingError("이미 처리된 결제이거나 찾을 수 없습니다.");
  return { requestId: rows[0].request_id };
}

export async function markFailed(orderId: string, reason: string): Promise<void> {
  await query(
    `UPDATE payments SET status = 'failed', fail_reason = $2
      WHERE order_id = $1 AND status = 'ready'`,
    [orderId, reason.slice(0, 300)],
  );
}

/**
 * 결제를 물린다. 신청이 거절·만료·취소될 때 부른다.
 * PG 호출이 실패해도 예약 취소 자체는 이미 성립했으므로 여기서 막지 않는다.
 *
 * 신청자가 스스로 취소할 때만 환불 규칙(refund_rules)을 적용해 일부만 돌려준다.
 * 멘토 거절·무응답·멘토 취소는 신청자 잘못이 아니므로 언제나 전액이다.
 */
export async function refundFor(
  requestId: string,
  reason: string,
  opts: { byApplicant?: boolean } = {},
): Promise<void> {
  const p = await queryOne<{
    id: string;
    provider_key: string | null;
    status: string;
    amount: number;
    starts_at: string;
  }>(
    `SELECT p.id, p.provider_key, p.status, p.amount, s.starts_at::text
       FROM payments p
       JOIN mentoring_requests r ON r.id = p.request_id
       JOIN mentor_slots s ON s.id = r.slot_id
      WHERE p.request_id = $1`,
    [requestId],
  );
  if (!p) return;

  let refund = p.amount;
  if (opts.byApplicant && p.status === "paid") {
    const hoursLeft = (new Date(p.starts_at).getTime() - Date.now()) / 3_600_000;
    const pct = percentFor(await refundRules(), hoursLeft);
    refund = Math.floor((p.amount * pct) / 100);
  }

  if (p.status === "paid" && p.provider_key && refund > 0) {
    // 부르기 전에 얼마를 돌려주기로 했는지 적어둔다. 실패한 뒤에 다시 계산하면
    // 그사이 시각이 지나 환불율이 달라진다 — 늦게 재시도할수록 적게 돌려주게 된다
    await query(`UPDATE payments SET refund_due = $2 WHERE id = $1`, [p.id, refund]);
    try {
      await cancel(p.provider_key, reason, refund < p.amount ? refund : undefined);
    } catch (e) {
      // 남겨두고 운영에서 확인한다. 여기서 예외를 올리면 취소가 통째로 막힌다.
      await query(`UPDATE payments SET fail_reason = $2, cancel_reason = $3 WHERE id = $1`, [
        p.id,
        e instanceof PayError ? e.message : "결제 취소 실패",
        reason.slice(0, 200),
      ]);
      return;
    }
  }

  if (p.status === "paid" || p.status === "ready") {
    // 일부만 돌려준 건은 '취소'가 아니다. 남은 돈은 정산 대상으로 살아 있다.
    const fully = refund >= p.amount || p.status === "ready";

    // 기관 이용권은 전액일 때만 돌아온다. 장 단위라 반 장을 돌려줄 방법이 없다
    if (fully) await releaseCredit(requestId);
    await query(
      `UPDATE payments
          SET status = CASE WHEN $3 THEN 'cancelled' ELSE status END,
              refunded_amount = $4,
              cancel_reason = $2,
              cancelled_at = CASE WHEN $3 THEN now() ELSE cancelled_at END,
              -- 지난번에 실패했더라도 이번에 성공했으면 기록을 지운다.
              -- 남겨두면 운영 화면의 '환불 실패' 목록에서 영영 사라지지 않는다
              fail_reason = NULL
        WHERE id = $1`,
      [p.id, reason.slice(0, 200), fully, p.status === "ready" ? 0 : refund],
    );
  }
}

export type FailedRefund = {
  payment_id: string;
  request_id: string;
  order_id: string;
  amount: number;
  refunded_amount: number;
  /** 돌려주기로 정한 금액 */
  refund_due: number | null;
  fail_reason: string;
  cancel_reason: string | null;
  applicant_name: string;
  applicant_email: string | null;
  handle: string;
  alias: string;
  starts_at: string;
};

/**
 * 환불이 실패한 건. 흔하지 않지만 조용히 묻히면 안 된다 —
 * 신청자는 '취소됐습니다'를 보고 돈은 돌아오지 않는 상태다.
 */
export async function failedRefunds(): Promise<FailedRefund[]> {
  return query<FailedRefund>(
    `SELECT p.id AS payment_id, p.request_id, p.order_id, p.amount, p.refunded_amount,
            p.refund_due, p.fail_reason, p.cancel_reason,
            u.display_name AS applicant_name, u.email AS applicant_email,
            m.handle, m.alias,
            to_char(s.starts_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') AS starts_at
       FROM payments p
       JOIN mentoring_requests r ON r.id = p.request_id
       JOIN users u   ON u.id = p.user_id
       JOIN mentors m ON m.id = r.mentor_id
       JOIN mentor_slots s ON s.id = r.slot_id
      WHERE p.fail_reason IS NOT NULL
      ORDER BY p.created_at DESC
      LIMIT 100`,
  );
}

/**
 * 실패한 환불을 다시 시도한다. 돌려줄 금액은 처음 판정한 그대로다 —
 * 시간이 지났다고 환불율을 다시 계산하면 늦게 재시도할수록 적게 돌려주게 된다.
 */
export async function retryRefund(paymentId: string): Promise<void> {
  const p = await queryOne<{
    id: string;
    request_id: string;
    provider_key: string | null;
    status: string;
    amount: number;
    refund_due: number | null;
    cancel_reason: string | null;
  }>(
    `SELECT id, request_id, provider_key, status, amount, refund_due, cancel_reason
       FROM payments WHERE id = $1 AND fail_reason IS NOT NULL`,
    [paymentId],
  );
  if (!p) throw new PayError("다시 시도할 환불 건이 아닙니다.");
  if (!p.provider_key) throw new PayError("결제 키가 없어 취소할 수 없습니다.");

  // 처음 취소할 때 정한 금액 그대로 보낸다. 지금 다시 계산하면 그사이 시각이 지나
  // 환불율이 달라진다 — 늦게 재시도할수록 적게 돌려주게 된다
  const refund = p.refund_due ?? p.amount;
  const reason = p.cancel_reason ?? "환불 재시도";

  try {
    await cancel(p.provider_key, reason, refund < p.amount ? refund : undefined);
  } catch (e) {
    await query(`UPDATE payments SET fail_reason = $2 WHERE id = $1`, [
      p.id,
      e instanceof PayError ? e.message : "결제 취소 실패",
    ]);
    throw e instanceof PayError ? e : new PayError("결제 취소에 실패했습니다.");
  }

  await query(
    `UPDATE payments
        SET status = CASE WHEN $2 >= amount THEN 'cancelled' ELSE status END,
            refunded_amount = $2,
            cancelled_at = CASE WHEN $2 >= amount THEN now() ELSE cancelled_at END,
            fail_reason = NULL
      WHERE id = $1`,
    [p.id, refund],
  );
}

/** 결제가 끝나지 않은 신청. 멘토에게 보이지 않아야 한다. */
export async function unpaidRequestIds(requestIds: string[]): Promise<Set<string>> {
  if (requestIds.length === 0) return new Set();
  const rows = await query<{ request_id: string }>(
    `SELECT request_id FROM payments
      WHERE request_id = ANY($1::bigint[]) AND status <> 'paid'`,
    [requestIds],
  );
  return new Set(rows.map((r) => r.request_id));
}

export async function saveprices(
  rows: { minutes: number; amount: number }[],
  actorId: string,
): Promise<void> {
  await tx(async (c) => {
    for (const r of rows) {
      await c.query(
        `INSERT INTO mentoring_prices (session_minutes, amount, updated_by, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (session_minutes)
         DO UPDATE SET amount = EXCLUDED.amount, updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [r.minutes, r.amount, actorId],
      );
    }
  });
}
