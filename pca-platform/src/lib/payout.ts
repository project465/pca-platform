import { query, queryOne } from "@/lib/db";
import { payoutSettings } from "@/lib/refund";

export class PayoutError extends Error {}

/**
 * 끝난 세션의 정산 건을 만든다. 알림 발송기가 주기적으로 부른다.
 *
 * 기준 금액은 신청자가 실제로 낸 돈(환불 뺀 금액)이다. 무료 세션은 0 이라 만들지 않는다.
 * 수수료율이 설정되지 않았으면 만들지 않는다 — 0% 로 만들어두면 나중에 고칠 수 없다.
 *
 * 세션이 열리지 않았어도 신청자가 늦게 취소해 돈이 남았으면 그 돈은 멘토 것이다.
 * 멘토는 그 시간을 비워뒀기 때문이다(2026-09-12 결정).
 * 다만 두 가지를 기다린다.
 *   - 시작 시각이 지날 때까지. 취소하면 시간대가 다시 열리므로 그 전에는 아직 모른다
 *   - 그 시간대를 다른 사람이 가져가지 않았는지. 가져갔으면 멘토는 그 건으로 받는다.
 *     한 시간대를 두 번 치지 않는다
 *
 * 끝난 세션은 곧바로 잡지 않고 hold_hours 만큼 기다린다. 그 사이가 노쇼 신고 기간이고,
 * 돈이 이미 나간 뒤에는 노쇼를 인정해도 되돌릴 곳이 없기 때문이다.
 * 신고가 들어온 건은 no_show 로 빠지고, 판정이 나야 다시 여기로 온다.
 */
export async function buildPayouts(): Promise<{ made: number; skipped: string | null }> {
  const s = await payoutSettings();
  const fee = Number(s.fee_percent);
  const wh = Number(s.withholding_percent);
  if (fee <= 0) {
    return { made: 0, skipped: "수수료율이 설정되지 않아 정산 건을 만들지 않았습니다." };
  }

  const hold = Number(s.hold_hours);

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
       JOIN mentor_slots s ON s.id = r.slot_id
       JOIN mentors mm ON mm.id = r.mentor_id
      WHERE p.status = 'paid'
        AND (p.amount - p.refunded_amount) > 0
        AND (
              -- 세션을 한 건. 노쇼 신고 기간이 지나야 잡는다
              (r.status = 'completed'
               AND s.starts_at + (mm.session_minutes || ' minutes')::interval
                     + ($3 || ' hours')::interval <= now())
              -- 신청자가 늦게 취소해 남은 돈
           OR (r.status = 'cancelled'
               AND s.starts_at <= now()
               AND NOT EXISTS (SELECT 1 FROM mentoring_requests r2
                                WHERE r2.slot_id = r.slot_id
                                  AND r2.id <> r.id
                                  AND r2.status IN ('accepted', 'completed')))
              -- 신청자 노쇼가 인정된 건. 멘토는 그 시간을 비웠다
           OR (r.status = 'no_show'
               AND EXISTS (SELECT 1 FROM no_show_reports n
                            WHERE n.request_id = r.id
                              AND n.against = 'applicant'
                              AND n.resolution = 'accepted'))
            )
        AND NOT EXISTS (SELECT 1 FROM payouts o WHERE o.request_id = r.id)
     RETURNING id`,
    [fee, wh, hold],
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
  /** 무엇으로 잡힌 건인지 — completed(세션을 했다) 또는 cancelled(늦게 취소돼 남은 돈) */
  req_status: string;
  starts_at: string;
  paid_at: string | null;
};

/** 운영사 화면. 여기서만 멘토 실명이 보인다 — 돈을 보내려면 누구인지 알아야 한다. */
export async function payoutList(status?: string): Promise<PayoutRow[]> {
  return query<PayoutRow>(
    `SELECT o.id, o.mentor_id, m.handle, m.alias, u.display_name AS real_name,
            o.request_id, o.gross, o.fee, o.withholding, o.net, o.status,
            r.status AS req_status,
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
            r.status AS req_status,
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
