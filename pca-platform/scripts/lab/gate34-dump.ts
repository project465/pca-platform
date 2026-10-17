/**
 * **Gate 3·4 에 실제로 서는 글자를 Core 마다 떠 둔다**(읽기만).
 *
 * 눈으로 고치기 전에 **무엇이 서는지**를 먼저 본다. 결과 모델을 제품과
 * 같은 자리에서 만들고(`buildResult`), 결과 쪽이 그리는 자리의 글자를
 * 그 차례 그대로 적는다.
 *
 *   CORE=BIZ_CORE_V1 npx tsx scripts/lab/gate34-dump.ts
 */
import { readFileSync } from "node:fs";
import { load, score } from "../../src/lib/me-v3/scoring/engine";
import { expand, type Fixture } from "../../src/lib/me-v3/scoring/fixtures";
import { buildResult } from "../../src/lib/me-v3/result/build";
import { core as coreEntry } from "../../src/lib/me-v3/core-registry";
import {
  actionBriefKo, actionHeadKo, actionWhyKo, axisStateKo, gapKo, headlineKo,
  needSentenceKo, pickSentenceKo, ZONE_LEAD_KO, ZONE_TITLE_KO,
} from "../../src/lib/me-v3/result/text.ko";

const CORE = process.env.CORE ?? "BIZ_CORE_V1";
const WHO = process.env.WHO ?? "P08";
const loaded = load(CORE);
const NAME = new Map<string, string>(
  (loaded.domains.domains as { code: string; name: string }[])
    .map((d) => [d.code, d.name]));
const nm = (c: string): string => NAME.get(c) ?? c;
const fxPath = coreEntry(CORE).fixtures?.personas
  ?? "sites/pca-platform/assessment/ME_V3/personas.json";
const fx = JSON.parse(readFileSync(fxPath, "utf8")) as { personas: Fixture[] };
const f = fx.personas.find((x) => x.id === WHO) ?? fx.personas[0];
const snap = score(expand(f, CORE), loaded);
const m = buildResult(snap, loaded, {});

console.log(`\n### ${CORE} · ${coreEntry(CORE).name_ko} · 사람 ${f.id} (${f.tier})`);
const h = headlineKo(m, nm);
console.log(`\n[Gate 3 · 첫 줄]`);
console.log(`  title  ${h.title}`);
console.log(`  lead   ${h.lead}`);

const focus = m.domains.filter((d) => m.overview.focus.includes(d.code));
console.log(`\n[Gate 3 · ① 확인된 경험]`);
console.log(`  영역   ${focus.slice(0, 3).map((d) => nm(d.code)).join(" · ")}`);
console.log(`  한 줄  ${pickSentenceKo(focus[0]?.decided.length
  ? focus[0].decided : focus[0]?.did ?? [])}`);
const left = [...new Set(focus.flatMap((d) => d.artifacts))];
console.log(`\n[Gate 3 · ② 남긴 근거]  준비 ${m.evidence.ready.length}가지`);
console.log(`  첫 줄  ${left.slice(0, 2).join(" · ")}`);
console.log(`  둘째   지원서에 그대로 옮길 이야기가 ${m.evidence.ready.length}가지 모였습니다`);
const g0 = m.gaps[0];
console.log(`\n[Gate 3 · ③ 더 채울 부분]`);
if (g0) {
  console.log(`  첫 줄  ${nm(g0.domain)}`);
  console.log(`  둘째   ${needSentenceKo(g0.axis ? [g0.axis] : [])}`);
  const gk = gapKo(g0, nm(g0.domain));
  console.log(`  (빈자리 절) ${gk.title} / ${gk.why}`);
}
const a0 = m.actions[0];
console.log(`\n[Gate 3 · ④ 지금 할 일]`);
if (a0) {
  console.log(`  머리   ${actionHeadKo(a0)}`);
  console.log(`  설명   ${actionBriefKo(a0, (a0.domain && nm(a0.domain)) || "")}`);
  console.log(`  까닭   ${actionWhyKo(a0)}`);
}

console.log(`\n[Gate 4 · 먼저 쓸 경험 셋]`);
for (const e of m.evidence.ready.slice(0, 3)) {
  console.log(`  - ${nm(e.domain)} ${axisStateKo(e.axis, e.state)}`);
}
const chains = [...new Set(m.evidence.ready.map((e) => e.domain))].slice(0, 2)
  .map((code) => {
    const d = m.domains.find((x) => x.code === code);
    return {
      code,
      did: d?.did[0] ?? null,
      decided: d?.decided[0] ?? null,
      left: d?.artifacts[0] ?? d?.verifications[0] ?? null,
    };
  });
console.log(`\n[Gate 4 · 네 단계]`);
for (const c of chains) {
  console.log(`  ── ${nm(c.code)}`);
  console.log(`     ① 내가 한 일          ${c.did ?? "(빈칸)"}`);
  console.log(`     ② 내가 직접 정한 것    ${c.decided ?? "(빈칸)"}`);
  console.log(`     ③ 남아 있는 결과       ${c.left ?? "(빈칸)"}`);
  console.log(`     ④ 지원서·면접에서 쓸 부분  ${c.decided && c.left
    ? "앞의 세 줄을 그대로 이으면 지원서 한 문단이 됩니다"
    : "(앞 칸 안내)"}`);
}
console.log(`\n[묶음 이름]`);
for (const d of m.domains.slice(0, 12)) {
  console.log(`  ${nm(d.code).padEnd(14)} ${ZONE_TITLE_KO[d.zone as keyof typeof ZONE_TITLE_KO]} / ${ZONE_LEAD_KO[d.zone as keyof typeof ZONE_LEAD_KO]}`);
}
