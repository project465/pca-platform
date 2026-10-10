/**
 * 결과지에 서는 한국어를 센다.
 *
 * 결과지 문장은 **사람이 쓴 것과 기계가 이어 붙인 것이 섞여 있다.** 틀이
 * 한국어고 가운데 들어가는 말은 응시자가 고른 항목이거나 영역 이름이라,
 * 한 번 눈으로 고쳐도 다음 영역에서 `기구·제품 설계은` 이 그대로 돌아온다.
 * 그래서 눈이 아니라 검사가 센다.
 *
 * 세는 것 일곱이다.
 *
 *   1. **조사.** 받침을 안 보고 붙인 자리(`설계은` · `조립도이나`).
 *   2. **틀 자체.** 소스에서 `${...}` 뒤에 조사를 그대로 이어 붙인 자리.
 *      지금 사람 열두 벌에서 안 걸려도 열세 번째에서 걸린다.
 *   3. **내부 코드.** 문항 번호 · 영역 코드 · 축 코드 · raw enum.
 *   4. **같은 말 반복.** `~에서 ~에서` 와 한 사람 안의 같은 할 일.
 *   5. **같은 틀 과다.** 열두 영역이 거의 같은 문장을 받는가.
 *   6. **너무 긴 할 일.** 백 자가 넘으면 그 줄은 안 읽힌다.
 *   7. **재지 않은 단정과 광고 말투.**
 *
 * **자동검사는 후보만 잡는다.** 마지막 판단은 문맥 기준이다.
 *
 *   npm run v3:result:copy
 */
import { readFileSync } from "node:fs";
import { registry } from "../src/lib/me-v3/core-registry";
import { load, score } from "../src/lib/me-v3/scoring/engine";
import { expand, type Fixture } from "../src/lib/me-v3/scoring/fixtures";
import { buildResult } from "../src/lib/me-v3/result/build";
import { josaOf, orList, withJosa } from "../src/lib/me-v3/result/josa";
import {
  actionKo, axisStateKo, AXIS_KO, AXIS_WHAT_KO, BASIC_GROUP_KO, draftKo,
  FIRST_MOVE_KO, gapKo, headlineKo, HORIZON_KO, QUALITY_KO, TIER_NOTE_KO,
  TRANS_STEP_KO, ZONE_LEAD_KO, ZONE_TITLE_KO,
} from "../src/lib/me-v3/result/text.ko";

const FIX = "sites/pca-platform/assessment/ME_V3/personas.json";
const SRC = [
  "src/lib/me-v3/result/text.ko.ts",
  "src/app/v3/[attemptId]/result/page.tsx",
];

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

/* ── 글자 모으기 ───────────────────────────────────────────────────── */
const core = process.env.CORE
  ?? registry().cores.filter((c) => c.status === "building")[0].code;
const loaded = load(core);
const fx = JSON.parse(readFileSync(FIX, "utf8")) as { personas: Fixture[] };
const NAME = new Map<string, string>(
  (loaded.domains.domains as { code: string; name: string }[]).map((d) => [d.code, d.name]));
const transIds = loaded.bank.items
  .filter((i) => i.module === "TRANS-10").map((i) => i.item_id);

type Line = { who: string; where: string; text: string };
const lines: Line[] = [];
const actions: { who: string; text: string; note: string }[] = [];

for (const [k, v] of Object.entries(ZONE_TITLE_KO)) lines.push({ who: "-", where: `묶음 ${k}`, text: v });
for (const [k, v] of Object.entries(ZONE_LEAD_KO)) lines.push({ who: "-", where: `묶음 ${k}`, text: v });
for (const [k, v] of Object.entries(TIER_NOTE_KO)) lines.push({ who: "-", where: `등급 ${k}`, text: v });
for (const [k, v] of Object.entries(QUALITY_KO)) lines.push({ who: "-", where: `응답 ${k}`, text: v });
for (const [k, v] of Object.entries(AXIS_KO)) lines.push({ who: "-", where: `축 ${k}`, text: v });
for (const [k, v] of Object.entries(AXIS_WHAT_KO)) lines.push({ who: "-", where: `축 ${k}`, text: v });
for (const [k, v] of Object.entries(TRANS_STEP_KO)) lines.push({ who: "-", where: `번역 ${k}`, text: v });
for (const [k, v] of Object.entries(FIRST_MOVE_KO)) lines.push({ who: "-", where: `첫칸 ${k}`, text: v });
for (const [k, v] of Object.entries(HORIZON_KO)) lines.push({ who: "-", where: `시점 ${k}`, text: v });
for (const [k, g] of Object.entries(BASIC_GROUP_KO)) {
  lines.push({ who: "-", where: `묶음 ${k}`, text: g.title });
  lines.push({ who: "-", where: `묶음 ${k}`, text: g.lead });
}

for (const f of fx.personas) {
  const snap = score(expand(f, core), loaded);
  /* PRO 는 번역 열 단계가 선 상태로도 한 번 본다 */
  const s = f.tier === "PRO"
    ? { ...snap, context: { ...snap.context, translation_steps: transIds } }
    : snap;
  const m = buildResult(s, loaded, f.tier === "PRO"
    ? { translation: transIds.map((id) => ({ item_id: id, choice: "하중 조건을 직접 정했다" })) }
    : {});
  const h = headlineKo(m);
  lines.push({ who: f.id, where: "첫 줄", text: h.title });
  lines.push({ who: f.id, where: "첫 줄", text: h.lead });
  for (const g of m.gaps) {
    const k = gapKo(g, NAME.get(g.domain) ?? g.domain);
    lines.push({ who: f.id, where: `빈자리 ${g.id}`, text: k.title });
    lines.push({ who: f.id, where: `빈자리 ${g.id}`, text: k.why });
  }
  for (const a of m.actions) {
    const t = actionKo(a, (a.domain && NAME.get(a.domain)) ?? "", m.stage);
    lines.push({ who: f.id, where: `할 일 ${a.code}`, text: t.do });
    if (t.note) lines.push({ who: f.id, where: `할 일 ${a.code}`, text: t.note });
    actions.push({ who: f.id, text: t.do, note: t.note ?? "" });
  }
  for (const d of m.domains) {
    for (const ax of d.axes) {
      lines.push({ who: f.id, where: `축 ${d.code}.${ax.axis}`, text: axisStateKo(ax.axis, ax.state) });
    }
  }
  for (const x of draftKo(m.translation?.steps ?? [])) {
    lines.push({ who: f.id, where: "지원서 초안", text: x });
  }
}

/* ── 1. 조사 ───────────────────────────────────────────────────────── */
function tail(ch: string): "none" | "rieul" | "other" {
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "other";
  const jong = (code - 0xac00) % 28;
  if (jong === 0) return "none";
  return jong === 8 ? "rieul" : "other";
}

/**
 * **한쪽 방향만 센다.**
 *
 * `는` 과 `가` 와 `이` 와 `과` 는 조사가 아닌 자리가 더 많다(먹**는** ·
 * 평**가** · 효**과**). 그 넷을 같이 세면 멀쩡한 문장이 줄줄이 걸리고,
 * 검사를 아무도 안 본다. 그래서 **조사일 수밖에 없는 모양**만 센다:
 * 받침 없는 말에 붙은 `은` · `을` · `이나`, 받침 있는 말에 붙은 `를`.
 */
const JOSA_BAD: { re: RegExp; want: "none" | "other"; fix: string }[] = [
  { re: /([가-힣])은(?=[\s,.·)’]|$)/g, want: "none", fix: "는" },
  { re: /([가-힣])을(?=[\s,.·)’]|$)/g, want: "none", fix: "를" },
  { re: /([가-힣])이나(?=[\s,.·)’]|$)/g, want: "none", fix: "나" },
  { re: /([가-힣])를(?=[\s,.·)’]|$)/g, want: "other", fix: "을" },
];
const josaHits: string[] = [];
for (const l of lines) {
  for (const { re, want, fix } of JOSA_BAD) {
    for (const m of l.text.matchAll(re)) {
      const t = tail(m[1]);
      const wrong = want === "none" ? t === "none" : t !== "none";
      if (wrong) josaHits.push(`${l.who} ${l.where}: ${m[0]} → ${m[1]}${fix}`);
    }
  }
}
ok("받침을 보고 조사를 붙였다", josaHits.length === 0,
   josaHits.length ? `${josaHits.length}곳 · ${josaHits.slice(0, 3).join(" | ")}`
     : `문장 ${lines.length}줄`);

/* ── 2. 틀 자체 ────────────────────────────────────────────────────── */
/* `${x}은` 처럼 조사를 그대로 이어 붙인 자리. `withJosa` 를 쓰라는 뜻이다 */
const GLUE = /\$\{[^}]{1,80}\}(은|는|이|가|을|를|과|와|이나|으로|이라)(?![가-힣])/g;
function body(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}
const glue: string[] = [];
for (const f of SRC) {
  for (const m of body(readFileSync(f, "utf8")).matchAll(GLUE)) {
    glue.push(`${f}: ${m[0]}`);
  }
}
ok("소스에서 조사를 그대로 이어 붙인 자리가 없다", glue.length === 0,
   glue.slice(0, 3).join(" | "));

/* ── 3. 내부 코드 ──────────────────────────────────────────────────── */
const CODE = new RegExp([
  "\\bTD\\d\\d\\b", "\\bJ[1-8]\\b", "\\bZ[1-4]\\b", "\\bOC[1-7]\\b",
  "NOT_EXPLORED", "\\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\\b",
  "\\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\\b",
  "\\b(?:undefined|null|NaN|TODO|TBD)\\b",
].join("|"));
const code = lines.filter((l) => CODE.test(l.text));
ok("사람이 읽는 문장에 내부 코드가 없다", code.length === 0,
   code.slice(0, 3).map((l) => `${l.who} ${l.text}`).join(" | "));

/* ── 4. 같은 말 반복 ───────────────────────────────────────────────── */
/* `~에 ` 까지 세면 멀쩡한 문장이 줄줄이 걸린다. `~에서 ~에서` 만 센다 */
const echo = lines.filter((l) => /에서[^.]{0,30}에서/.test(l.text));
ok("한 문장에서 같은 자리토씨를 되풀이하지 않는다", echo.length === 0,
   echo.slice(0, 3).map((l) => `${l.who}: ${l.text}`).join(" | "));

const dupPer: string[] = [];
for (const who of new Set(actions.map((a) => a.who))) {
  const mine = actions.filter((a) => a.who === who).map((a) => a.text);
  const seen = new Map<string, number>();
  for (const t of mine) seen.set(t, (seen.get(t) ?? 0) + 1);
  for (const [t, n] of seen) if (n > 1) dupPer.push(`${who} ×${n}: ${t}`);
}
ok("한 사람에게 똑같은 할 일을 두 번 적지 않는다", dupPer.length === 0,
   dupPer.slice(0, 3).join(" | "));

/* ── 5. 같은 틀 과다 ───────────────────────────────────────────────── */
/* 영역 이름만 바꿔 끼운 문장은 **꼴만 남기면 같아진다.** 그 꼴이 전체의
   절반을 넘으면 열두 영역이 사실상 한 문장을 받고 있다는 뜻이다 */
const shape = (t: string) => {
  let x = t;
  for (const n of NAME.values()) x = x.split(n).join("§");
  return x;
};
const shapes = new Map<string, number>();
for (const a of actions) shapes.set(shape(a.text), (shapes.get(shape(a.text)) ?? 0) + 1);
const top = [...shapes].sort((a, b) => b[1] - a[1])[0];
const share = top ? top[1] / actions.length : 0;
ok("한 가지 틀이 할 일의 절반을 넘지 않는다", share <= 0.5,
   `가장 많은 틀 ${top?.[1]}/${actions.length} (${Math.round(share * 100)}%) · 틀 ${shapes.size}가지`);

/* ── 6. 너무 긴 할 일 ──────────────────────────────────────────────── */
const long = actions.filter((a) => a.text.length > 100);
ok("할 일 한 줄이 백 자를 넘지 않는다", long.length === 0,
   long.slice(0, 2).map((a) => `${a.who} ${a.text.length}자`).join(" | "));

/* ── 7. 재지 않은 단정과 광고 말투 ─────────────────────────────────── */
const BAN = [
  "역량 강화", "역량을 강화", "전문성 강화", "전문성을 강화", "경험을 쌓",
  "최적", "맞춤형", "적합도", "성공 가능성", "상위 ", "AI 기반", "귀하",
  "응답자님", "보다 정확한 결과", "를 통해", "기반으로 분석", "하게 됩니다",
];
const banned: string[] = [];
for (const l of lines) {
  for (const b of BAN) if (l.text.includes(b)) banned.push(`${l.who} ${l.where}: ${b}`);
}
ok("광고 말투와 재지 않은 단정이 없다", banned.length === 0,
   banned.slice(0, 4).join(" | "));

/* ── 7-1. 결과 문장이 쓰지 않기로 한 말(규격 §16) ──────────────────
   앞의 `BAN` 은 광고 말투를 세고, 이쪽은 **재지 않은 결론**을 센다.
   `검증됐다` 와 `적합하다` 와 `강점이다` 는 규준도 인지 면접도 없는
   지금 이 검사가 할 수 없는 말이고, `지원서에 바로 쓸 수 있다` 는
   **쓰는 사람이 할 일을 우리가 끝낸 것으로 적는 말**이다.

   **부정문은 지나간다.** 이 저장소의 `writing:check` 과 같은 규칙이다:
   막는 것은 결론이고 그 결론을 막는 문장이 아니다. 실제로 결과지는
   `합격 가능성이나 순위를 내지 않습니다` 를 적고 있고, 그 줄을 세면
   지켜 주려던 문장을 지우라고 요구하게 된다. */
const CLAIM: [string, string][] = [
  ["검증됐", "현재 응답에서 확인된"],
  ["검증되었", "현재 응답에서 확인된"],
  ["적합하다", "설명할 수 있는"],
  ["적합합니다", "설명할 수 있는"],
  ["강점이다", "확인된 경험"],
  ["강점입니다", "확인된 경험"],
  ["높은 가능성", "확인된 경험"],
  ["바로 쓸 수 있", "설명할 수 있"],
  ["확정됐", "확인된"],
  ["확정되었", "확인된"],
];
const NEG = /(않|없|못|아닙|아니)/;
const claimed: string[] = [];
for (const l of lines) {
  for (const [bad, better] of CLAIM) {
    const at = l.text.indexOf(bad);
    if (at < 0) continue;
    /* 그 말이 들어간 문장만 본다. 문장 안에 부정이 있으면 결론이 아니다 */
    const from = Math.max(0, l.text.lastIndexOf(".", at) + 1);
    const to = l.text.indexOf(".", at);
    const sent = l.text.slice(from, to < 0 ? undefined : to);
    if (NEG.test(sent)) continue;
    claimed.push(`${l.who} ${l.where}: ${bad} → ${better}`);
  }
}
ok("결과 문장이 재지 않은 것을 단정하지 않는다", claimed.length === 0,
   claimed.length ? claimed.slice(0, 4).join(" | ")
     : `막는 말 ${CLAIM.length}가지 · 문장 ${lines.length}줄`);

/* ── 8. 조사 고르기 되돌이 검사 ────────────────────────────────────── */
/* **고친 자리가 다시 돌아오지 않게** 지난번에 나갔던 말을 박아 둔다 */
const CASES: [string, string][] = [
  ["기구·제품 설계", "는"], ["구조·내구 해석", "은"], ["시험·계측", "은"],
  ["공정", "은"], ["설계", "는"], ["해석", "은"], ["시험", "은"],
];
const bad1 = CASES.filter(([w, j]) => josaOf(w, "은는") !== j)
  .map(([w, j]) => `${w}+${j}`);
const OR: [string[], string][] = [
  [["보고서", "해석 모델"], "보고서나 해석 모델"],
  [["조립도", "부품도"], "조립도나 부품도"],
  [["측정 보고서", "모달 해석 보고서"], "측정 보고서나 모달 해석 보고서"],
  [["시험 계획서", "시험 성적서"], "시험 계획서나 시험 성적서"],
  [["모델", "스크립트"], "모델이나 스크립트"],
];
const bad2 = OR.filter(([xs, want]) => orList(xs) !== want).map(([xs]) => xs.join("/"));
const bad3 = withJosa("기준값", "과와") === "기준값과" ? [] : ["기준값과"];
ok("지난번에 틀렸던 말이 다시 틀리지 않는다",
   !bad1.length && !bad2.length && !bad3.length,
   [...bad1, ...bad2, ...bad3].join(" ") || `보기 ${CASES.length + OR.length + 1}개`);

console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
console.log("  자동검사는 후보만 잡습니다. 마지막 판단은 문맥 기준입니다.");
process.exitCode = fail ? 1 : 0;
