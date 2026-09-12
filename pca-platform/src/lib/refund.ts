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

/**
 * 규칙을 사람이 읽는 문장으로 바꾼다. 돈을 받기 전에 보여줘야 하는 내용이라
 * 신청 화면과 취소 버튼이 같은 문장을 쓴다 — 두 곳이 다르게 말하면 안 된다.
 *
 * 규칙은 hours_before 내림차순이고, 각 행은 '남은 시간이 이 값 이상'을 뜻한다.
 */
export function refundPolicyLines(rules: RefundRule[]): string[] {
  if (rules.length === 0) return ["취소 환불 규정이 정해지지 않았습니다."];
  return rules.map((r) => {
    const when = r.hours_before === 0 ? "그보다 늦게 취소" : `시작 ${r.hours_before}시간 전까지 취소`;
    return `${when} — ${r.percent === 0 ? "환불 없음" : `${r.percent}% 환불`}`;
  });
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

export type PayoutSettings = {
  fee_percent: string;
  withholding_percent: string;
  /** 세션이 끝나고 정산을 잡기까지 기다리는 시간. 그 사이가 노쇼 신고 기간이다 */
  hold_hours: number;
};

export async function payoutSettings(): Promise<PayoutSettings> {
  const row = await queryOne<PayoutSettings>(
    `SELECT fee_percent::text, withholding_percent::text, hold_hours FROM payout_settings WHERE id = 1`,
  );
  return row ?? { fee_percent: "0", withholding_percent: "0", hold_hours: 48 };
}

export async function savePayoutSettings(
  fee: number,
  withholding: number,
  holdHours: number,
  actorId: string,
): Promise<void> {
  await query(
    `INSERT INTO payout_settings
       (id, fee_percent, withholding_percent, hold_hours, updated_by, updated_at)
     VALUES (1, $1, $2, $3, $4, now())
     ON CONFLICT (id) DO UPDATE
       SET fee_percent = EXCLUDED.fee_percent,
           withholding_percent = EXCLUDED.withholding_percent,
           hold_hours = EXCLUDED.hold_hours,
           updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [fee, withholding, holdHours, actorId],
  );
}
