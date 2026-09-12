/**
 * 수수료·원천징수율과 환불 규칙을 넣는다.
 *
 *   npm run db:fees
 *
 * 이 값들은 코드가 정할 수 있는 것이 아니라 사업이 정한 것이다. 그래서 스키마에
 * 기본값으로 박지 않고 여기에 데이터로 둔다. 바꾸려면 이 파일을 고치고 다시 돌리거나,
 * 운영 중이라면 /admin/prices 에서 고치면 된다. 여러 번 돌려도 같은 상태가 된다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { query } from "../src/lib/db";

function loadEnv(file: string) {
  try {
    for (const line of readFileSync(resolve(process.cwd(), file), "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* 파일이 없으면 환경변수가 이미 있다고 본다 */
  }
}
loadEnv(".env.local");

/** 운영 수수료 10%, 사업소득 원천징수 3.3%(소득세 3% + 지방소득세 0.3%) */
const FEE_PERCENT = 10;
const WITHHOLDING_PERCENT = 3.3;

/**
 * 남은 시간이 이 값 이상이면 이 비율을 돌려준다. 신청자가 스스로 취소할 때만 쓴다.
 * 멘토가 거절하거나 답하지 않으면 언제나 전액이다.
 *
 * 48시간을 전액 기준으로 둔 이유는 멘토가 그 시간을 비워두기 때문이다. 하루 전보다
 * 늦은 취소는 그 자리를 다시 팔 수 없다.
 */
const RULES = [
  { hoursBefore: 48, percent: 100 },
  { hoursBefore: 24, percent: 50 },
  { hoursBefore: 0, percent: 0 },
];

async function main() {
  await query(
    `INSERT INTO payout_settings (id, fee_percent, withholding_percent, updated_at)
     VALUES (1, $1, $2, now())
     ON CONFLICT (id) DO UPDATE
       SET fee_percent = EXCLUDED.fee_percent,
           withholding_percent = EXCLUDED.withholding_percent,
           updated_at = now()`,
    [FEE_PERCENT, WITHHOLDING_PERCENT],
  );

  const keep = RULES.map((r) => r.hoursBefore);
  await query(`DELETE FROM refund_rules WHERE NOT (hours_before = ANY($1::int[]))`, [keep]);
  for (const r of RULES) {
    await query(
      `INSERT INTO refund_rules (hours_before, percent, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (hours_before)
       DO UPDATE SET percent = EXCLUDED.percent, updated_at = now()`,
      [r.hoursBefore, r.percent],
    );
  }

  console.log(`수수료 ${FEE_PERCENT}% · 원천징수 ${WITHHOLDING_PERCENT}%`);
  for (const r of RULES) {
    console.log(
      r.hoursBefore === 0
        ? `  시작 전 어느 때나          ${r.percent}%`
        : `  시작 ${String(r.hoursBefore).padStart(2)}시간 이상 남았을 때  ${r.percent}%`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
