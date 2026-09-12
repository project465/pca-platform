import { query, queryOne, tx } from "@/lib/db";
import type { PoolClient } from "pg";
import { cancel, newOrderId, PayError } from "@/lib/pay";

export class BillingError extends Error {}

/** 학과 계약으로 들어온 학생은 무료다. memberships 에 행이 있으면 소속이 있다는 뜻. */
export async function isFreeUser(userId: string): Promise<boolean> {
  const row = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM memberships WHERE user_id = $1`,
    [userId],
  );
  return Number(row?.n ?? 0) > 0;
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
 */
export async function refundFor(requestId: string, reason: string): Promise<void> {
  const p = await queryOne<{ id: string; provider_key: string | null; status: string }>(
    `SELECT id, provider_key, status FROM payments WHERE request_id = $1`,
    [requestId],
  );
  if (!p) return;

  if (p.status === "paid" && p.provider_key) {
    try {
      await cancel(p.provider_key, reason);
    } catch (e) {
      // 남겨두고 운영에서 확인한다. 여기서 예외를 올리면 취소가 통째로 막힌다.
      await query(`UPDATE payments SET fail_reason = $2 WHERE id = $1`, [
        p.id,
        e instanceof PayError ? e.message : "결제 취소 실패",
      ]);
      return;
    }
  }
  if (p.status === "paid" || p.status === "ready") {
    await query(
      `UPDATE payments SET status = 'cancelled', cancel_reason = $2, cancelled_at = now()
        WHERE id = $1`,
      [p.id, reason.slice(0, 200)],
    );
  }
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
