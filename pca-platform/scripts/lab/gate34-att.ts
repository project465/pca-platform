/** 굳은 결과에서 Gate 3·4 의 글자를 그대로 적는다 (읽기만) */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { queryOne } from "../../src/lib/db";
import { load } from "../../src/lib/me-v3/scoring/engine";
import type { ResultModel } from "../../src/lib/me-v3/result/model";
import {
  actionBriefKo, actionHeadKo, actionWhyKo, evidenceUseKo, gapKo, headlineKo,
  keptNoteKo, moreReadyKo, needSentenceKo, pickSentenceKo, saidKo,
  ZONE_TITLE_KO,
} from "../../src/lib/me-v3/result/text.ko";

const ATT = process.env.ATT ?? "";
async function main(): Promise<void> {
const row = await queryOne<{ result_model: ResultModel; core_code: string }>(
  `SELECT y.result_model, a.core_code FROM v3_snapshots y
    JOIN v3_attempts a ON a.id = y.attempt_id
    WHERE y.attempt_id = $1::bigint ORDER BY y.id DESC LIMIT 1`, [ATT]);
if (!row) throw new Error(`응시 ${ATT} 의 굳은 결과가 없습니다`);
const m = row.result_model;
const loaded = load(row.core_code);
const NAME = new Map<string, string>(
  (loaded.domains.domains as { code: string; name: string }[])
    .map((d) => [d.code, d.name]));
const nm = (c: string): string => NAME.get(c) ?? c;

console.log(`\n### ${row.core_code} · 응시 ${ATT} · ${m.tier}`);
const h = headlineKo(m, nm);
console.log(`[첫 줄] ${h.title}\n        ${h.lead}`);
const focus = m.domains.filter((d) => m.overview.focus.includes(d.code));
console.log(`[① 확인된 경험] ${focus.slice(0, 3).map((d) => nm(d.code)).join(" · ")}`);
console.log(`                ${pickSentenceKo(focus[0]?.decided.length
  ? focus[0].decided : focus[0]?.did ?? [])}`);
const left = [...new Set(focus.flatMap((d) => d.artifacts))];
console.log(`[② 남긴 근거] ${left.slice(0, 2).join(" · ")}`);
console.log(`              ${keptNoteKo(left.length > 0)}`);
const g0 = m.gaps[0];
if (g0) {
  console.log(`[③ 더 채울 부분] ${nm(g0.domain)}`);
  console.log(`                 ${needSentenceKo(g0.axis ? [g0.axis] : [])}`);
  const gk = gapKo(g0, nm(g0.domain));
  console.log(`   (빈자리 절)   ${gk.title}\n                 ${gk.why}`);
}
const a0 = m.actions[0];
if (a0) {
  console.log(`[④ 지금 할 일] ${actionHeadKo(a0)}`);
  console.log(`               ${actionBriefKo(a0, (a0.domain && nm(a0.domain)) || "")}`);
  console.log(`               ${actionWhyKo(a0)}`);
}
const readyDomains = [...new Set(m.evidence.ready.map((e) => e.domain))];
const chains = readyDomains.slice(0, 2).map((code) => {
  const d = m.domains.find((x) => x.code === code);
  return { code, did: d?.did[0] ?? null, decided: d?.decided[0] ?? null,
    left: d?.artifacts[0] ?? d?.verifications[0] ?? null };
});
console.log(`\n[Gate 4 · 들어가는 한 줄]`);
console.log("  아래 네 줄은 지원서와 면접에서 이야기할 수 있는 경험을 그 차례대로 풀어 놓은 것입니다.");
console.log(`[Gate 4 · 네 단계]`);
for (const c of chains) {
  console.log(`  \u2500\u2500 ${nm(c.code)}`);
  console.log(`     \u2460 \ub0b4\uac00 \ud55c \uc77c            ${c.did ? saidKo(c.did) : "(\ubbf8\uae30\uc7ac)"}`);
  console.log(`     \u2461 \ub0b4\uac00 \uc9c1\uc811 \uc815\ud55c \uac83      ${c.decided ? saidKo(c.decided) : "(\ubbf8\uae30\uc7ac)"}`);
  console.log(`     \u2462 \ub0a8\uc544 \uc788\ub294 \uacb0\uacfc         ${c.left ?? "(\ubbf8\uae30\uc7ac)"}`);
  console.log(`     \u2463 \uc9c0\uc6d0\uc11c\u00b7\uba74\uc811\uc5d0\uc11c \uc4f8 \ubd80\ubd84 ${c.decided && c.left
    ? evidenceUseKo(row.core_code, c.code, c.left) : "(\uc54a \uce78 \uc548\ub0b4)"}`);
}
const rest = readyDomains.slice(2).map(nm);
if (rest.length) console.log(`[Gate 4 · \uadf8 \ubc16]  ${moreReadyKo(rest)}`);
console.log(`[묶음] ${m.domains.filter((d) => d.zone !== "NOT_EXPLORED")
  .map((d) => `${nm(d.code)}=${ZONE_TITLE_KO[d.zone as keyof typeof ZONE_TITLE_KO]}`).join(" | ")}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
