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
  actionKo, axisStateKo, AXIS_KO, AXIS_WHAT_KO, BASIC_GROUP_KO, draftKo,
  FIRST_MOVE_KO, gapKo, headlineKo, HORIZON_KO, QUALITY_KO, TIER_NOTE_KO,
  TRANS_STEP_KO, ZONE_LEAD_KO, ZONE_TITLE_KO,
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

/* 5. 내부 코드가 사람이 읽는 문장에 새지 않는다.
 *
 * **전에 쓴 그림이 `TR_TAG_1` 을 놓쳤다.** `[A-Z]{3,}_[A-Z0-9_]{2,}` 는
 * 밑줄 앞에 큰 글자 셋을 요구해서 `TR_` 을 못 봤고, 캡처 쪽 그림은
 * `\b[A-Z]{2,3}_[A-Z0-9]{2,}\b` 라 `TAG_1` 의 꼬리 한 글자에서 걸렸다.
 * 그래서 두 그림을 **모양 하나**로 합친다: 큰 글자나 숫자 묶음이 밑줄로
 * 이어지면 무엇이든 내부 코드로 본다. 세는 자리도 늘린다 — 번역 단계
 * 이름과 축 표와 묶음 설명까지, **화면에 서는 글자 전부**다.
 */
const CODE = new RegExp([
  "\\bTD\\d\\d\\b", "\\bJ[1-8]\\b", "\\bZ[1-4]\\b", "\\bOC[1-7]\\b",
  "NOT_EXPLORED", "\\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\\b",
  "\\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\\b",
  "\\b(?:undefined|null|NaN|TODO|TBD)\\b",
].join("|"));

/** 화면과 종이에 서는 글자 전부. **여기 빠진 자리가 다음에 새는 자리다** */
function rendered(m: ReturnType<typeof buildResult>): string[] {
  const out: string[] = [headlineKo(m).title, headlineKo(m).lead,
    ...Object.values(ZONE_TITLE_KO), ...Object.values(ZONE_LEAD_KO),
    ...Object.values(TIER_NOTE_KO), ...Object.values(QUALITY_KO),
    ...Object.values(AXIS_KO), ...Object.values(AXIS_WHAT_KO),
    ...Object.values(TRANS_STEP_KO), ...Object.values(FIRST_MOVE_KO),
    ...Object.values(HORIZON_KO),
    ...Object.values(BASIC_GROUP_KO).flatMap((g) => [g.title, g.lead])];
  for (const g of m.gaps) {
    const k = gapKo(g, NAME.get(g.domain) ?? g.domain);
    out.push(k.title, k.why, k.detail);
  }
  for (const a of m.actions) {
    const t = actionKo(a, (a.domain && NAME.get(a.domain)) ?? "", m.stage);
    out.push(t.do, t.note ?? "");
  }
  for (const d of m.domains) {
    out.push(NAME.get(d.code) ?? d.code, ...d.did, ...d.decided,
      ...d.artifacts, ...d.verifications);
    for (const ax of d.axes) out.push(axisStateKo(ax.axis, ax.state), ...ax.picks);
  }
  for (const e of [...m.evidence.ready, ...m.evidence.partial]) {
    out.push(axisStateKo(e.axis, e.state), ...e.picks);
  }
  /* **번역 단계는 이름이 없으면 화면이 세우지 않는다.** 그 규칙이 지켜지는
     지도 여기서 센다: 이름이 없는 단계가 하나라도 있으면 걸린다 */
  for (const st of m.translation?.steps ?? []) {
    out.push(TRANS_STEP_KO[st.item_id] ?? st.item_id, st.choice ?? "");
  }
  out.push(...draftKo(m.translation?.steps ?? []));
  return out.filter(Boolean);
}

const leaked: string[] = [];
for (const [id, m] of models) {
  for (const l of rendered(m)) if (CODE.test(l)) leaked.push(`${id}: ${l}`);
}
ok("사람이 읽는 문장에 내부 코드가 없다", leaked.length === 0, leaked.slice(0, 3).join(" | "));

/* 5b. 번역 단계마다 **사람이 읽는 이름이 있다.**
 *
 * 여기가 `TR_TAG_1` 을 놓친 자리다. 사람 열두 벌의 고정 응답에는 번역
 * 열 단계의 답이 없어서, 검사가 도는 동안 번역 줄은 **한 번도 서지
 * 않았다.** 그래서 사람 응답을 기다리지 않고 **문항 은행에서 바로** 센다:
 * `TRANS-10` 에 든 문항 전부가 이름을 가져야 한다. 문항이 늘면 이 검사가
 * 먼저 걸린다.
 */
const transIds = loaded.bank.items
  .filter((i) => i.module === "TRANS-10").map((i) => i.item_id);
const unnamed = transIds.filter((id) => !TRANS_STEP_KO[id]);
ok("번역 문항마다 사람이 읽는 이름이 있다", unnamed.length === 0,
   unnamed.length ? unnamed.slice(0, 4).join(" ") : `문항 ${transIds.length}개`);

/* 5c. 번역 줄이 **실제로 서는 상태**로도 코드가 새지 않는다 */
const proFx = fx.personas.find((f) => f.tier === "PRO")!;
const proSnap = score(expand(proFx, core), loaded);
const withTrans = buildResult(
  { ...proSnap, context: { ...proSnap.context, translation_steps: transIds } },
  loaded,
  { translation: transIds.map((id) => ({ item_id: id, choice: "하중 조건을 직접 정했다" })) },
);
const transLeak = rendered(withTrans).filter((l) => CODE.test(l));
ok("번역 열 단계가 선 결과지에도 내부 코드가 없다", transLeak.length === 0,
   transLeak.length ? transLeak.slice(0, 3).join(" | ")
     : `단계 ${withTrans.translation?.steps.length ?? 0}줄`);

/* 6. 과한 칭찬과 재지 않은 단정을 쓰지 않는다 */
const BRAG = /뛰어난|뛰어납|탁월|최적|완벽|혁신적|형 인재|우수한|훌륭/;
const brag: string[] = [];
for (const [id, m] of models) {
  for (const a of m.actions) {
    const t = actionKo(a, (a.domain && NAME.get(a.domain)) ?? "", m.stage);
    const all = `${t.do} ${t.note ?? ""}`;
    if (BRAG.test(all)) brag.push(`${id}: ${t.do}`);
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
    const t = actionKo(a, (a.domain && NAME.get(a.domain)) ?? "", m.stage);
    if (VAGUE.test(`${t.do} ${t.note ?? ""}`)) vague.push(`${id}: ${t.do}`);
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
