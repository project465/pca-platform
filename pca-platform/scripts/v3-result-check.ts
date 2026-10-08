/**
 * 결과 모델이 새로운 판단을 만들지 않는가.
 *
 * 묻는 것 넷이다. 스냅샷의 묶음을 그대로 옮기는가 · 같은 스냅샷이 늘 같은
 * 모델을 내놓는가 · 내부 코드가 한국어 문장에 새지 않는가 · 비어 있는
 * 자리마다 할 일이 붙는가.
 *
 *   npm run v3:result
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { registry } from "../src/lib/me-v3/core-registry";
import { load, score } from "../src/lib/me-v3/scoring/engine";
import { expand, type Fixture } from "../src/lib/me-v3/scoring/fixtures";
import { buildResult } from "../src/lib/me-v3/result/build";
import {
  actionKo, gapKo, headlineKo, QUALITY_KO, TIER_NOTE_KO, ZONE_TITLE_KO,
} from "../src/lib/me-v3/result/text.ko";
import { RESULT_MODEL_VERSION } from "../src/lib/me-v3/result/version";
import type { Snapshot } from "../src/lib/me-v3/scoring/types";

const FIX = "sites/pca-platform/assessment/ME_V3/personas.json";
const RESULT_DIR = "src/lib/me-v3/result";

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}
const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

const core = process.env.CORE
  ?? registry().cores.filter((c) => c.status === "building")[0].code;
const loaded = load(core);
const fx = JSON.parse(readFileSync(FIX, "utf8")) as { personas: Fixture[] };
const NAME = new Map<string, string>(
  (loaded.domains.domains as { code: string; name: string }[]).map((d) => [d.code, d.name]));

console.log(`  core  ${core} · ${RESULT_MODEL_VERSION}\n`);

const snaps = new Map<string, Snapshot>();
const models = new Map<string, ReturnType<typeof buildResult>>();
for (const f of fx.personas) {
  const s = score(expand(f, core), loaded);
  snaps.set(f.id, s);
  models.set(f.id, buildResult(s, loaded, {
    packs: { industries: [], roles: [] },
  }));
}

/* 1. 판단을 다시 하지 않는다 */
const drift: string[] = [];
for (const [id, m] of models) {
  const s = snaps.get(id)!;
  if (m.overview.focus.join(",") !== s.focus.join(",")) drift.push(`${id} focus`);
  if (m.overview.unclear.join(",") !== s.zones.Z4_INSUFFICIENT_EVIDENCE.join(",")) {
    drift.push(`${id} unclear`);
  }
  for (const d of m.domains) {
    const sd = s.domains.find((x) => x.code === d.code)!;
    if (d.zone !== sd.zone) drift.push(`${id} ${d.code} zone`);
    if (d.confirmed.join(",") !== sd.confirmed.join(",")) drift.push(`${id} ${d.code} confirmed`);
    if (d.owned.join(",") !== sd.owned.join(",")) drift.push(`${id} ${d.code} owned`);
    if (d.reasons.join(",") !== sd.reasons.join(",")) drift.push(`${id} ${d.code} reasons`);
  }
}
ok("묶음과 축과 까닭이 스냅샷과 글자까지 같다", drift.length === 0,
   drift.length ? drift.slice(0, 4).join(" · ") : `사람 ${models.size}벌`);

/* 2. 같은 스냅샷이면 같은 모델 */
const twice = [...snaps].every(([, s]) =>
  sha(JSON.stringify(buildResult(s, loaded))) === sha(JSON.stringify(buildResult(s, loaded))));
ok("같은 스냅샷이 늘 같은 모델을 내놓는다", twice);

/* 3. 결과 모델 코드에 한국어가 없다. **주석은 걷어 내고 본다**: 왜 그렇게
      짰는지 적어 둔 글까지 세면 기록을 지우라고 요구하게 된다 */
const KO = /[가-힣]/;
function body(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}
const inCode: string[] = [];
for (const f of ["build.ts", "model.ts", "version.ts"]) {
  const src = body(readFileSync(`${RESULT_DIR}/${f}`, "utf8"));
  if (KO.test(src)) inCode.push(f);
}
ok("모델 코드에 사람이 읽는 한국어가 없다", inCode.length === 0, inCode.join(" "));

/* 4. 모델이 한국어 표를 읽지 않는다 */
const readsKo = ["build.ts", "model.ts"].filter((f) =>
  /from\s+["'][^"']*text\.ko/.test(body(readFileSync(`${RESULT_DIR}/${f}`, "utf8"))));
ok("모델이 번역표를 읽지 않는다", readsKo.length === 0, readsKo.join(" "));

/* 5. 내부 코드가 사람이 읽는 문장에 새지 않는다 */
const CODE = /\bTD\d\d\b|\bJ[1-8]\b|\bZ[1-4]\b|NOT_EXPLORED|_V1\b|[A-Z]{3,}_[A-Z0-9_]{2,}/;
const leaked: string[] = [];
for (const [id, m] of models) {
  const lines: string[] = [headlineKo(m).title, headlineKo(m).lead,
    ...Object.values(ZONE_TITLE_KO), ...Object.values(TIER_NOTE_KO),
    ...Object.values(QUALITY_KO)];
  for (const g of m.gaps) {
    const k = gapKo(g, NAME.get(g.domain) ?? g.domain);
    lines.push(k.title, k.why, k.detail);
  }
  for (const a of m.actions) lines.push(actionKo(a, (a.domain && NAME.get(a.domain)) ?? ""));
  for (const l of lines) if (CODE.test(l)) leaked.push(`${id}: ${l}`);
}
ok("사람이 읽는 문장에 내부 코드가 없다", leaked.length === 0, leaked.slice(0, 3).join(" | "));

/* 6. 과한 칭찬과 재지 않은 단정을 쓰지 않는다 */
const BRAG = /뛰어난|뛰어납|탁월|최적|완벽|혁신적|형 인재|우수한|훌륭/;
const brag: string[] = [];
for (const [id, m] of models) {
  for (const a of m.actions) {
    const t = actionKo(a, (a.domain && NAME.get(a.domain)) ?? "");
    if (BRAG.test(t)) brag.push(`${id}: ${t}`);
  }
  for (const g of m.gaps) {
    const k = gapKo(g, NAME.get(g.domain) ?? g.domain);
    if (BRAG.test(`${k.title}${k.why}${k.detail}`)) brag.push(`${id}: ${k.title}`);
  }
}
ok("과한 칭찬과 재지 않은 단정이 없다", brag.length === 0, brag.slice(0, 3).join(" | "));

/* 7. 막연한 할 일을 쓰지 않는다 */
const VAGUE = /역량을 (강화|키우)|경험을 쌓|전문성을 높|노력하세요|준비하세요$/;
const vague: string[] = [];
for (const [id, m] of models) {
  for (const a of m.actions) {
    const t = actionKo(a, (a.domain && NAME.get(a.domain)) ?? "");
    if (VAGUE.test(t)) vague.push(`${id}: ${t}`);
  }
}
ok("막연한 할 일이 없다", vague.length === 0, vague.slice(0, 3).join(" | "));

/* 8. 비어 있는 자리마다 할 일이 붙는다 */
const orphan: string[] = [];
for (const [id, m] of models) {
  for (const g of m.gaps) {
    if (!g.action_id || !m.actions.some((a) => a.id === g.action_id)) {
      orphan.push(`${id} ${g.id}`);
    }
  }
}
ok("비어 있는 자리마다 할 일이 하나씩 붙는다", orphan.length === 0, orphan.slice(0, 3).join(" "));

/* 9. BASIC 은 근거가 섰다고 말하지 않는다 */
const basicZ1 = [...models].filter(([, m]) =>
  m.tier === "BASIC" && (m.limits.allows_evidence_established
    || m.domains.some((d) => d.zone === "Z1_EVIDENCE_ESTABLISHED")));
ok("BASIC 결과에 근거가 섰다는 판정이 없다", basicZ1.length === 0,
   basicZ1.map(([id]) => id).join(" "));

/* 10. 아무 근거가 없는 사람도 다음 할 일을 받는다 */
const empty = [...models].filter(([, m]) =>
  m.overview.counts.confirmed_axes === 0 && m.actions.length === 0);
ok("근거가 없는 사람도 할 일을 받는다", empty.length === 0, empty.map(([id]) => id).join(" "));

/* 11. 근거가 선 사람도 다음 할 일을 받는다 */
const noNext = [...models].filter(([, m]) => m.actions.length === 0);
ok("사람 열두 벌이 모두 다음 할 일을 받는다", noNext.length === 0,
   noNext.map(([id]) => id).join(" "));

/* 12. 고른 항목은 그 사람이 고른 글자다 */
const ghost: string[] = [];
for (const [id, m] of models) {
  for (const d of m.domains) {
    for (const a of d.axes) {
      if (a.picks.some((p) => p === "second_item" || p.includes(":"))) {
        ghost.push(`${id} ${d.code}.${a.axis}`);
      }
    }
  }
}
ok("고른 항목에 안쪽 표시가 섞이지 않는다", ghost.length === 0, ghost.slice(0, 3).join(" "));

/* 13. 등급이 올라가도 Core 가 올라가지 않는다 */
const tiers = ["BASIC", "STANDARD", "PRO"] as const;
const tierDrift: string[] = [];
for (const f of fx.personas) {
  if (f.tier !== "STANDARD") continue;
  const base = buildResult(score(expand(f, core), loaded), loaded);
  for (const t of tiers) {
    if (t === f.tier) continue;
    const m = buildResult(score(expand({ ...f, tier: t }, core), loaded), loaded);
    if (t === "PRO" && m.overview.focus.join(",") !== base.overview.focus.join(",")) {
      tierDrift.push(`${f.id} ${t}`);
    }
  }
}
ok("STANDARD 와 PRO 가 같은 응답에서 같은 먼저 볼 영역을 낸다", tierDrift.length === 0,
   tierDrift.slice(0, 3).join(" "));

/* 14. 팩을 바꿔도 Core 가 바뀌지 않는다 */
const packDrift: string[] = [];
for (const f of fx.personas.filter((x) => x.tier === "PRO").slice(0, 3)) {
  const sub = expand(f, core);
  const a = buildResult(score({ ...sub, industry_pack: "INDUSTRY_SEMICON_V1" }, loaded), loaded);
  const b = buildResult(score({ ...sub, industry_pack: "INDUSTRY_DEFENSE_V1" }, loaded), loaded);
  const core3 = (m: typeof a) => JSON.stringify(
    m.domains.map((d) => [d.code, d.zone, d.confirmed, d.owned]));
  if (core3(a) !== core3(b)) packDrift.push(f.id);
  if (a.overview.focus.join(",") !== b.overview.focus.join(",")) packDrift.push(`${f.id} focus`);
}
ok("산업팩을 바꿔도 Core 판정이 그대로다", packDrift.length === 0, packDrift.join(" "));

/* 15. 판본이 스냅샷의 것을 그대로 들고 다닌다 */
const verDrift = [...models].filter(([id, m]) =>
  JSON.stringify(m.provenance.module_versions) !== JSON.stringify(snaps.get(id)!.module_versions));
ok("판본을 스냅샷에서 그대로 옮긴다", verDrift.length === 0, verDrift.map(([id]) => id).join(" "));

/* 16. 사람마다 한 줄 */
console.log("");
for (const f of fx.personas) {
  const m = models.get(f.id)!;
  const h = headlineKo(m);
  console.log(`  ${f.id} ${f.name.padEnd(22)} ${m.tier.padEnd(9)}`
    + `${h.title.slice(0, 22).padEnd(24)}`
    + `먼저 ${(m.overview.focus.map((c) => NAME.get(c) ?? c).join("·") || "없음").padEnd(22)}`
    + `빈자리 ${String(m.gaps.length).padStart(2)} · 할 일 ${String(m.actions.length).padStart(2)}`);
}

console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
process.exitCode = fail ? 1 : 0;
