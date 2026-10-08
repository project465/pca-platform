/**
 * 사람 벌로 오판을 본다. **판단은 제품 엔진이 내린다.**
 *
 * 앞 회차에는 이 파일이 설계 규칙을 옮겨 적은 **검산 산식**을 들고
 * 있었다. 7단계에서 제품 엔진이 생겼으므로 그 산식을 지웠다: 판정을 두
 * 곳에서 하면 어느 날 갈리고, 갈린 날 둘 다 못 믿는다.
 *
 * 여기서 보는 것은 **결과를 읽는 규칙**이다(`53_v3_05_result_trace.md`).
 * 엔진이 도는지는 `v3:scoring` 이 본다.
 *
 *   npm run v3:persona
 */
import { readFileSync } from "node:fs";
import { registry } from "../src/lib/me-v3/core-registry";
import { load, score } from "../src/lib/me-v3/scoring/engine";
import { expand, type Fixture } from "../src/lib/me-v3/scoring/fixtures";
import type { Snapshot } from "../src/lib/me-v3/scoring/types";

const FIX = "sites/pca-platform/assessment/ME_V3/personas.json";

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

function pickCore(): string {
  if (process.env.CORE) return process.env.CORE;
  return registry().cores.filter((c) => c.status === "building")[0].code;
}

function main(): void {
  const core = pickCore();
  const loaded = load(core);
  const fx = JSON.parse(readFileSync(FIX, "utf8")) as { personas: Fixture[] };
  console.log(`  core  ${core} · 사람 ${fx.personas.length}벌 (제품 엔진으로 돌린다)\n`);

  const out = new Map<string, Snapshot>();
  for (const f of fx.personas) out.set(f.id, score(expand(f, core), loaded));
  const S = (id: string) => out.get(id) as Snapshot;
  const dom = (id: string, td: string) =>
    S(id).domains.find((d) => d.code === td);

  for (const f of fx.personas) {
    const s = S(f.id);
    const z1 = s.zones.Z1_EVIDENCE_ESTABLISHED.join(",") || "없음";
    const z2 = s.zones.Z2_EVIDENCE_INCOMPLETE.join(",") || "없음";
    const z3 = s.zones.Z3_EVIDENCE_LOW_INTEREST.join(",") || "없음";
    console.log(`  ${f.name.padEnd(24)} ${f.tier.padEnd(8)} 근거 ${z1.padEnd(14)}` +
      ` 덜 섬 ${z2.padEnd(14)} 관심 낮음 ${z3}`);
  }
  console.log("");

  /* 1. 근거가 선 영역과 덜 선 영역이 갈린다 */
  ok("판단과 산출물과 검증이 다 있으면 근거가 선다",
     dom("P12", "TD02")?.zone === "Z1_EVIDENCE_ESTABLISHED",
     `확인 ${dom("P12", "TD02")?.confirmed.length}축`);
  ok("판단이 많아도 남은 것이 없으면 근거가 서지 않는다",
     dom("P11", "TD02")?.zone === "Z2_EVIDENCE_INCOMPLETE" &&
     dom("P11", "TD02")?.reasons.includes("MISSING_OUTPUT") === true,
     `확인 ${dom("P11", "TD02")?.confirmed.length}축 · 산출물이 비어 있다`);
  ok("산출물만 있고 직접 판단이 비면 근거가 서지 않는다",
     dom("P10", "TD02")?.zone === "Z2_EVIDENCE_INCOMPLETE" &&
     dom("P10", "TD02")?.reasons.includes("MISSING_REQUIRED_AXIS") === true,
     "필수 축 J3 가 비어 있다");
  ok("관심만 높고 겪은 적이 없으면 근거 부족으로 적는다",
     dom("P02", "TD01")?.zone === "Z4_INSUFFICIENT_EVIDENCE" &&
     dom("P02", "TD01")?.next.includes("TRY_SHORT_EXPERIENCE") === true,
     "짧게 겪어 보는 것이 먼저다");

  /* 2. 많이 해 본 사람과 아무 경험이 없는 사람을 한 칸에 넣지 않는다 */
  const many = dom("P11", "TD02");
  const none = dom("P02", "TD01");
  ok("경험이 많고 남은 것이 없는 사람과 경험이 없는 사람이 다른 묶음이다",
     many?.zone !== none?.zone,
     `${many?.zone} · ${none?.zone}`);

  /* 3. 첫 쪽에 올리는 영역 */
  ok("근거가 선 영역이 먼저 올라간다",
     S("P12").focus.join(",") === S("P12").zones.Z1_EVIDENCE_ESTABLISHED.join(","),
     S("P12").focus.join(","));
  ok("근거가 선 영역이 없으면 덜 선 쪽을 올린다",
     S("P11").focus.join(",") === S("P11").zones.Z2_EVIDENCE_INCOMPLETE.join(","),
     S("P11").focus.join(","));
  ok("둘 다 없으면 관심이 높은 쪽을 올린다",
     S("P02").focus.length > 0 &&
     S("P02").focus.every((td) => dom("P02", td)?.interest.band === "HIGH"),
     S("P02").focus.join(","));

  /* 4. 관심과 근거를 네 칸으로 갈라 읽는다 */
  const quads = new Set<string>();
  for (const f of fx.personas) {
    for (const d of S(f.id).domains) if (d.quadrant) quads.add(d.quadrant);
  }
  ok("관심과 근거의 네 칸이 실제로 갈린다", quads.size === 4,
     [...quads].sort().join(" · "));

  /* 5. 학습 의향을 관심에 더하지 않는다 */
  const p02 = dom("P02", "TD01");
  ok("관심이 높고 경험이 없으면 공부보다 겪어 보기를 먼저 적는다",
     p02?.next[0] === "TRY_SHORT_EXPERIENCE",
     p02?.next.join(" · "));

  /* 6. BASIC 의 한계 */
  const basics = fx.personas.filter((f) => f.tier === "BASIC");
  ok("BASIC 에는 근거가 섰다는 판정이 없다",
     basics.every((f) => S(f.id).zones.Z1_EVIDENCE_ESTABLISHED.length === 0 &&
       !S(f.id).tier_limits.allows_evidence_established), `${basics.length}벌`);
  ok("BASIC 은 여덟 축을 센 것으로 적지 않는다",
     basics.every((f) => S(f.id).domains.every((d) => d.confirmed_all === 0 &&
       d.reasons.includes("TIER_WITHOUT_DEEP_AXES") || d.zone === "NOT_EXPLORED")));

  /* 7. PRO 라서 판정이 올라가지 않는다 */
  const p11pro = S("P11");
  const asStandard = score(expand({
    ...(fx.personas.find((f) => f.id === "P11") as Fixture), tier: "STANDARD",
  }, core), loaded);
  ok("등급을 올려도 영역 판정이 저절로 오르지 않는다",
     JSON.stringify(p11pro.zones) === JSON.stringify(asStandard.zones),
     "번역과 목표가 더해질 뿐이다");

  /* 8. 동점을 오류로 보지 않는다 */
  const tied = fx.personas.filter((f) => S(f.id).tied.length);
  ok("같은 상태로 묶인 영역을 그대로 적는다", tied.length > 0,
     tied.map((f) => `${f.id}:${S(f.id).tied.map((g) => g.join("=")).join(" ")}`)
       .slice(0, 2).join(" · "));

  /* 9. 빈 것의 뜻 */
  const miss = new Set<string>();
  for (const f of fx.personas) {
    for (const d of S(f.id).domains) {
      for (const a of Object.values(d.axes)) miss.add(a.missing);
    }
  }
  ok("빈 것을 네 가지로 가른다", miss.size >= 3, [...miss].sort().join(" · "));

  console.log(`\n사람 ${fx.personas.length}벌 · 확인 ${pass + fail}가지 — ` +
              `통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}

main();
