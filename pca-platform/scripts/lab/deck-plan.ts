/**
 * 소개 PPT 의 '검사 구성' 장에 넣을 수를 실제 계획에서 센다.
 * 손으로 적으면 문항이 바뀐 날 PPT 만 옛 수를 든다.
 *   CORE=CS_CORE_V1 npx tsx scripts/lab/deck-plan.ts
 */
import { buildPlan } from "../../src/lib/me-v3/runtime/blocks";
import { branchBlock, crossField } from "../../src/lib/me-v3/runtime/routing";
import { content, industryChoices, planDeps, roleChoices } from "../../src/lib/me-v3/runtime/session";
import { planCost } from "../../src/lib/me-v3/response-count";

const CORE = process.env.CORE || "BIZ_CORE_V1";
const D = planDeps(CORE);
const TD = content(CORE).domains.domains.map((d) => d.code);
const deep = TD.slice(0, 3);
const p = buildPlan({
  tier: "PRO", stage: "bachelor", branchBlock: branchBlock("bachelor", null),
  crossField: crossField("bachelor", null), probe: deep, deep,
  industryInterest: [industryChoices(CORE)[0]?.code ?? ""],
  roleInterest: roleChoices(CORE).map((r) => r.code).slice(0, 2),
  tiedPair: [], strongCells: [], consistAxis: null, touched: TD,
}, D);
const order: string[] = [];
for (const s of p.screens) if (!order.includes(s.stage)) order.push(s.stage);
const rows = order.map((st) => {
  const ss = p.screens.filter((s) => s.stage === st);
  const c = planCost(ss);
  return { stage: st, screens: c.screens, responses: c.responses, minutes: c.minutes,
    kinds: [...new Set(ss.map((s) => s.kind))].join(","),
    sample: ss.map((s: any) => s.title || s.head || "").filter(Boolean).slice(0, 3) };
});
const all = planCost(p.screens);
console.log(JSON.stringify({ core: CORE, total: all, domains: TD.length, rows }, null, 1));
