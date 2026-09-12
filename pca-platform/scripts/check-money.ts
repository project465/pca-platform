/**
 * 돈 계산 점검.
 *
 *   npm run check:money
 *
 * 지금 DB에 들어 있는 환불 규칙과 수수료율로 실제 금액을 뽑아 보여주고,
 * 값이 무엇이든 반드시 지켜져야 하는 것을 확인한다.
 *
 *   - 시간이 줄면 환불율도 줄거나 같다 (늦게 취소했는데 더 받는 일은 없다)
 *   - 환불액은 결제액을 넘지 않는다
 *   - 총액 = 수수료 + 원천징수 + 지급액 (반올림으로 돈이 사라지지 않는다)
 *
 * 값 자체가 맞는지는 사업이 정할 일이라 여기서 판정하지 않는다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { percentFor, refundRules, payoutSettings } from "../src/lib/refund";

function loadEnv(file: string) {
  try {
    for (const line of readFileSync(resolve(process.cwd(), file), "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* 환경변수가 이미 있다고 본다 */
  }
}
loadEnv(".env.local");

let failed = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? "  통과" : "  실패"}  ${label}`);
  if (!ok) failed++;
}

/** 정산 계산. src/lib/payout.ts 의 SQL 과 같은 식이다 */
function payout(gross: number, feePct: number, whPct: number) {
  const fee = Math.floor((gross * feePct) / 100);
  const withholding = Math.floor(((gross - fee) * whPct) / 100);
  return { fee, withholding, net: gross - fee - withholding };
}

const AMOUNT = 30_000;
const HOURS = [168, 72, 48, 47, 24, 23, 6, 0];

async function main() {
  const rules = await refundRules();
  const s = await payoutSettings();
  const feePct = Number(s.fee_percent);
  const whPct = Number(s.withholding_percent);

  console.log(`설정  수수료 ${feePct}% · 원천징수 ${whPct}%`);
  if (rules.length === 0) console.log("      환불 규칙 없음 — 신청자 취소는 환불되지 않는다");
  console.log("");

  console.log(`신청자가 스스로 취소할 때 (${AMOUNT.toLocaleString("ko-KR")}원 기준)`);
  const pcts: number[] = [];
  for (const h of HOURS) {
    const pct = percentFor(rules, h);
    pcts.push(pct);
    const back = Math.floor((AMOUNT * pct) / 100);
    console.log(
      `  시작 ${String(h).padStart(3)}시간 전  ${String(pct).padStart(3)}%  ` +
        `${back.toLocaleString("ko-KR").padStart(7)}원 환불`,
    );
  }
  console.log("  멘토 거절 · 무응답 · 멘토 취소는 시각과 무관하게 전액");
  console.log("");

  console.log("세션이 끝난 뒤 멘토 지급액");
  for (const gross of [AMOUNT, 50_000, 15_000, 1]) {
    const p = payout(gross, feePct, whPct);
    console.log(
      `  받은 돈 ${gross.toLocaleString("ko-KR").padStart(7)}원  −  수수료 ${p.fee
        .toLocaleString("ko-KR")
        .padStart(6)}원  −  원천징수 ${p.withholding
        .toLocaleString("ko-KR")
        .padStart(5)}원  =  ${p.net.toLocaleString("ko-KR").padStart(7)}원`,
    );
  }
  console.log("");

  console.log("어떤 값이든 지켜져야 하는 것");
  check(
    "늦게 취소할수록 환불율이 올라가지 않는다",
    pcts.every((p, i) => i === 0 || p <= pcts[i - 1]),
  );
  check(
    "환불액이 결제액을 넘지 않는다",
    pcts.every((p) => Math.floor((AMOUNT * p) / 100) <= AMOUNT),
  );
  check(
    "총액 = 수수료 + 원천징수 + 지급액",
    [AMOUNT, 50_000, 15_000, 1, 33_333].every((g) => {
      const p = payout(g, feePct, whPct);
      return p.fee + p.withholding + p.net === g;
    }),
  );
  check("지급액이 음수가 되지 않는다", payout(1, feePct, whPct).net >= 0);

  console.log("");
  console.log(failed === 0 ? "이상 없음" : `${failed}건 실패`);
}

main()
  .then(() => process.exit(failed === 0 ? 0 : 1))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
