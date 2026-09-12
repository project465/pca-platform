import { query, queryOne } from "@/lib/db";

export type RefundRule = { hours_before: number; percent: number };

export async function refundRules(): Promise<RefundRule[]> {
  return query<RefundRule>(
    `SELECT hours_before, percent FROM refund_rules ORDER BY hours_before DESC`,
  );
}

/**
 * 세션 시작까지 남은 시간으로 환불율을 고른다.
 * 규칙이 하나도 없으면 환불하지 않는다 — 정하지 않은 것을 마음대로 돌려주지 않는다.
 */
export function percentFor(rules: RefundRule[], hoursLeft: number): number {
  for (const r of rules) {
    if (hoursLeft >= r.hours_before) return r.percent;
  }
  return 0;
}

export async function saveRefundRules(
  rows: { hoursBefore: number; percent: number }[],
  actorId: string,
): Promise<void> {
  const keep = rows.map((r) => r.hoursBefore);
  await query(
    `DELETE FROM refund_rules WHERE NOT (hours_before = ANY($1::int[]))`,
    [keep.length > 0 ? keep : [-1]],
  );
  for (const r of rows) {
    await query(
      `INSERT INTO refund_rules (hours_before, percent, updated_by, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (hours_before)
       DO UPDATE SET percent = EXCLUDED.percent, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [r.hoursBefore, r.percent, actorId],
    );
  }
}

export type PayoutSettings = { fee_percent: string; withholding_percent: string };

export async function payoutSettings(): Promise<PayoutSettings> {
  const row = await queryOne<PayoutSettings>(
    `SELECT fee_percent::text, withholding_percent::text FROM payout_settings WHERE id = 1`,
  );
  return row ?? { fee_percent: "0", withholding_percent: "0" };
}

export async function savePayoutSettings(
  fee: number,
  withholding: number,
  actorId: string,
): Promise<void> {
  await query(
    `INSERT INTO payout_settings (id, fee_percent, withholding_percent, updated_by, updated_at)
     VALUES (1, $1, $2, $3, now())
     ON CONFLICT (id) DO UPDATE
       SET fee_percent = EXCLUDED.fee_percent,
           withholding_percent = EXCLUDED.withholding_percent,
           updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [fee, withholding, actorId],
  );
}
