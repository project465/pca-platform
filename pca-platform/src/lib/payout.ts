import { query, queryOne } from "@/lib/db";
import { payoutSettings } from "@/lib/refund";

export class PayoutError extends Error {}

/**
 * 끝난 세션의 정산 건을 만든다. 알림 발송기가 주기적으로 부른다.
 *
 * 기준 금액은 신청자가 실제로 낸 돈(환불 뺀 금액)이다. 무료 세션은 0 이라 만들지 않는다.
 * 수수료율이 설정되지 않았으면 만들지 않는다 — 0% 로 만들어두면 나중에 고칠 수 없다.
 */
export async function buildPayouts(): Promise<{ made: number; skipped: string | null }> {
  const s = await payoutSettings();
  const fee = Number(s.fee_percent);
  const wh = Number(s.withholding_percent);
  if (fee <= 0) {
    return { made: 0, skipped: "수수료율이 설정되지 않아 정산 건을 만들지 않았습니다." };
  }

  const rows = await query<{ id: string }>(
    `INSERT INTO payouts (mentor_id, request_id, gross, fee, withholding, net)
     SELECT r.mentor_id, r.id,
            (p.amount - p.refunded_amount) AS gross,
            floor((p.amount - p.refunded_amount) * $1 / 100) AS fee,
            floor(((p.amount - p.refunded_amount)
                   - floor((p.amount - p.refunded_amount) * $1 / 100)) * $2 / 100) AS withholding,
            (p.amount - p.refunded_amount)
              - floor((p.amount - p.refunded_amount) * $1 / 100)
              - floor(((p.amount - p.refunded_amount)
                       - floor((p.amount - p.refunded_amount) * $1 / 100)) * $2 / 100) AS net
       FROM mentoring_requests r
       JOIN payments p ON p.request_id = r.id
      WHERE r.status = 'completed'
        AND p.status = 'paid'
        AND (p.amount - p.refunded_amount) > 0
        AND NOT EXISTS (SELECT 1 FROM payouts o WHERE o.request_id = r.id)
     RETURNING id`,
    [fee, wh],
  );
  return { made: rows.length, skipped: null };
}

export type PayoutRow = {
  id: string;
  mentor_id: string;
  handle: string;
  alias: string;
  real_name: string;
  request_id: string;
  gross: number;
  fee: number;
  withholding: number;
  net: number;
  status: string;
  starts_at: string;
  paid_at: string | null;
};

/** 운영사 화면. 여기서만 멘토 실명이 보인다 — 돈을 보내려면 누구인지 알아야 한다. */
export async function payoutList(status?: string): Promise<PayoutRow[]> {
  return query<PayoutRow>(
    `SELECT o.id, o.mentor_id, m.handle, m.alias, u.display_name AS real_name,
            o.request_id, o.gross, o.fee, o.withholding, o.net, o.status,
            to_char(s.starts_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') AS starts_at,
            to_char(o.paid_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS paid_at
       FROM payouts o
       JOIN mentors m ON m.id = o.mentor_id
       JOIN users u   ON u.id = m.user_id
       JOIN mentoring_requests r ON r.id = o.request_id
       JOIN mentor_slots s ON s.id = r.slot_id
      WHERE ($1::text IS NULL OR o.status = $1)
      ORDER BY o.status = 'pending' DESC, s.starts_at DESC
      LIMIT 300`,
    [status ?? null],
  );
}

/** 멘토가 보는 자기 정산. 실명은 필요 없다. */
export async function payoutsOfMentor(mentorId: string): Promise<PayoutRow[]> {
  return query<PayoutRow>(
    `SELECT o.id, o.mentor_id, m.handle, m.alias, '' AS real_name,
            o.request_id, o.gross, o.fee, o.withholding, o.net, o.status,
            to_char(s.starts_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') AS starts_at,
            to_char(o.paid_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS paid_at
       FROM payouts o
       JOIN mentors m ON m.id = o.mentor_id
       JOIN mentoring_requests r ON r.id = o.request_id
       JOIN mentor_slots s ON s.id = r.slot_id
      WHERE o.mentor_id = $1
      ORDER BY s.starts_at DESC
      LIMIT 100`,
    [mentorId],
  );
}

export async function markPayoutPaid(payoutId: string, memo: string | null): Promise<void> {
  const rows = await query<{ id: string }>(
    `UPDATE payouts SET status = 'paid', paid_at = now(), memo = $2
      WHERE id = $1 AND status = 'pending'
      RETURNING id`,
    [payoutId, memo],
  );
  if (rows.length === 0) throw new PayoutError("이미 지급 처리된 건입니다.");
}

export async function payoutSummary(): Promise<{ pending: number; pending_net: number }> {
  const row = await queryOne<{ pending: number; pending_net: number }>(
    `SELECT count(*)::int AS pending, COALESCE(sum(net), 0)::int AS pending_net
       FROM payouts WHERE status = 'pending'`,
  );
  return row ?? { pending: 0, pending_net: 0 };
}
