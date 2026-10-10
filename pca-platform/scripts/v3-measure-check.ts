/**
 * 측정체계 지도. **문항 은행의 수를 세지 않고 응시에서 서는 문항을 센다.**
 *
 * 묻는 것이 여섯이다. 무엇을 재는 문항인가 · 그 신호를 받는 입력 방식이
 * 맞는가 · `잘 모르겠다` 와 가운데 값이 갈리는가 · 결과의 어디로 가는가 ·
 * 자기보고 하나로 근거가 서지 않는가 · 같은 것을 두 번 묻는 자리가 있는가.
 *
 * **받고 쓰지 않는 자리를 적어 둔 값으로 세지 않는다.** blueprint 의
 * `result_section` 은 사람이 적은 글이라 틀릴 수 있다. 여기서는 응답을
 * 하나씩 바꿔 넣고 결과가 달라지는지로 센다: 달라지지 않으면 그 문항은
 * 받아 두고 어느 코드도 읽지 않는 문항이다.
 *
 *   npm run v3:measure
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { CONTENT_DIR, coreFile, registry } from "../src/lib/me-v3/core-registry";
import { coreOnly, load, score } from "../src/lib/me-v3/scoring/engine";
import { stable } from "../src/lib/me-v3/scoring/fixtures";
import { routedFor, type BankItem as CoreItem } from "../src/lib/me-v3/scoring/normalize";
import { pickDomains } from "../src/lib/me-v3/runtime/routing";
import { buildResult } from "../src/lib/me-v3/result/build";
import { COMMON_ITEM_KO } from "../src/lib/me-v3/result/text.ko";
import { compatible, constructRegistry } from "../src/lib/me-v3/measurement/registry";
import { UNKNOWN } from "../src/lib/me-v3/scoring/types";
import type {
  Answer, Axis, GradField, Stage, Submission, Tier,
} from "../src/lib/me-v3/scoring/types";

const OUT = "docs/metri/84_measurement_map.md";

/**
 * 문항 하나.
 *
 * 채점이 읽는 칸(`normalize.ts` 의 `BankItem`)에 **화면이 읽는 칸**을 더했다.
 * 채점은 문면을 읽지 않으므로 저쪽에 없는 것이 맞고, 지도는 사용자가 읽는
 * 문장을 적어야 하므로 여기서 넓힌다.
 */
type BankItem = CoreItem & {
  wording?: string | null;
  stage_wording?: Record<string, string> | null;
  options?: string[] | null;
  option_values?: (number | null)[] | null;
  grid_row?: string | null;
  grid_stem?: string | null;
};

let fail = 0, pass = 0, notes = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}
/**
 * 사람이 정할 일.
 *
 * **통과도 걸림도 아니다.** 척도를 고치려면 채점이 응답을 읽는 법이 바뀌므로
 * 사업주 결정이 먼저다. 초록으로 적으면 고친 척이 되고, 빨강으로 적으면
 * 고칠 코드가 없는 줄이 남아 다음부터 아무도 이 검사를 안 본다.
 */
function note(n: string, d = ""): void {
  notes += 1; console.log(`  보고  ${n}${d ? " — " + d : ""}`);
}

const core = process.env.CORE
  ?? registry().cores.filter((c) => c.status === "building")[0].code;
const loaded = load(core);
const bank = loaded.bank as unknown as { items: BankItem[]; level_options: string[]; assessment_version: string };
type DomainData = {
  code: string; name: string; required_axes: Axis[];
  artifacts: string[]; verify_targets: string[];
};
const domains = (loaded.domains.domains as unknown as DomainData[]);
const DOM = domains.map((d) => d.code);
const NAME = new Map(domains.map((d) => [d.code, d.name]));
const lists = coreFile<{ domains: Record<string, Record<string, { text: string }[]>> }>(
  core, "checklists");
const dataOf = new Map(domains.map((d) => [d.code, d]));

console.log(`  core  ${core} · ${bank.assessment_version} · 은행 ${bank.items.length}문항\n`);

/* ────────────────────────────────────────────────────────────────────
 * 1. 신호 갈래. **측정축 이름이 아니라 그 응답이 무엇을 말해 주는가로 묶는다**
 * ──────────────────────────────────────────────────────────────── */

/** §1 의 열하나. 같은 보기 넷을 쓰는 문항도 재는 것이 갈린다 */
type Family =
  | "Interest" | "LearningIntent" | "Experience" | "Ownership" | "Judgment"
  | "Evidence" | "Output" | "Verification" | "Preference" | "Translation"
  | "Goal";

/** 재는 것. 측정축과 묶음을 함께 본다 */
function familyOf(i: BankItem): Family {
  switch (i.measurement_axis) {
    case "interest": return "Interest";
    case "learning_intent": return "LearningIntent";
    case "exposure": return "Experience";
    case "forced_choice": return "Preference";
    case "target_input": return "Goal";
    case "translation_step": return "Translation";
    case "translation_context": return "Translation";
    case "consistency": return "Ownership";
    case "common_judgement": return "Judgment";
    case "experience_translation": return "Judgment";
    case "axis_level":
      /* 축이 무엇을 묻는가로 갈린다. J5 는 남은 것, J6 는 견준 것 */
      return i.evidence_axis === "J5" ? "Output"
        : i.evidence_axis === "J6" ? "Verification" : "Ownership";
    default: return "Judgment";
  }
}

/** 그 갈래에 맞는 입력 방식. §2·§3 의 선을 코드로 적었다 */
const SCALE_OK: Record<Family, string[]> = {
  Interest: ["5보기"],
  LearningIntent: ["5보기"],
  Experience: ["3보기"],
  Ownership: ["L0~L3"],
  Judgment: ["L0~L3"],
  Output: ["L0~L3"],
  Verification: ["L0~L3"],
  Evidence: ["고르기(복수)"],
  Preference: ["둘 중 하나", "고르기"],
  Translation: ["보기 선택 + 한 줄", "고르기"],
  Goal: ["고르기"],
};

/* ────────────────────────────────────────────────────────────────────
 * 2. 응시에서 서는 문항. **은행 전체가 아니라 routing 이 여는 것만**
 * ──────────────────────────────────────────────────────────────── */

const IND = [...new Set(bank.items.filter((i) => i.module === "INDUSTRY")
  .map((i) => i.industry_pack!))];
const ROLE = [...new Set(bank.items.filter((i) => i.module === "ROLE")
  .map((i) => i.item_id.replace(/_R\d+$/, "")))];

type Cover = {
  name: string; tier: Tier; stage: Stage; field: GradField | null;
  undergrad?: "ME" | "OTHER" | null; industry?: string; role?: string;
};

/**
 * 덮는 묶음.
 *
 * 한 응시가 은행을 다 받지 않는다. 등급 셋 · 학위 넷 · 타계열 하나 ·
 * 산업 여덟 · 역할 여덟이 갈라 받으므로, **어느 응시에서도 서지 않는
 * 문항**을 찾으려면 그 조합의 합집합을 봐야 한다.
 */
const COVER: Cover[] = [
  { name: "PRO·학부", tier: "PRO", stage: "bachelor", field: null },
  { name: "PRO·석사", tier: "PRO", stage: "master", field: "STEM" },
  { name: "PRO·박사", tier: "PRO", stage: "phd", field: "STEM" },
  { name: "PRO·포닥", tier: "PRO", stage: "postdoc", field: "STEM" },
  { name: "PRO·타계열석사", tier: "PRO", stage: "master",
    field: "HUMANITIES_SOCIAL", undergrad: "ME" },
  { name: "BASIC·학부", tier: "BASIC", stage: "bachelor", field: null },
  { name: "STANDARD·학부", tier: "STANDARD", stage: "bachelor", field: null },
  ...IND.map((c): Cover => ({
    name: `PRO·${c}`, tier: "PRO", stage: "bachelor", field: null, industry: c })),
  ...ROLE.map((c): Cover => ({
    name: `PRO·${c}`, tier: "PRO", stage: "bachelor", field: null, role: c })),
];

/** 가장 높은 응답. §7 의 `전부 최고로 답한 사람` 이 쓰는 값이다 */
function topAnswer(i: BankItem): Answer | null {
  switch (i.response_scale) {
    case "L0~L3": return { kind: "level", index: 3 };
    case "5보기": return { kind: "scale5", value: 5 };
    case "3보기": return { kind: "exposure", value: 2 };
    case "둘 중 하나": return { kind: "choice", value: DOM[0] };
    case "고르기": return { kind: "choice", value: pickChoice(i) };
    case "보기 선택 + 한 줄": return { kind: "choice", value: "하중 조건을 직접 정했다" };
    default: return null;
  }
}
/** 가장 낮은 응답 */
function lowAnswer(i: BankItem): Answer | null {
  switch (i.response_scale) {
    case "L0~L3": return { kind: "level", index: 0 };
    case "5보기": return { kind: "scale5", value: 1 };
    case "3보기": return { kind: "exposure", value: 0 };
    case "둘 중 하나": return { kind: "choice", value: DOM[1] };
    case "고르기": return { kind: "choice", value: pickChoice(i, 1) };
    case "보기 선택 + 한 줄": return { kind: "choice", value: "받아 쓴 조건으로 돌렸다" };
    default: return null;
  }
}
function pickChoice(i: BankItem, n = 0): string {
  if (i.item_id === "TG_ROLE") return ROLE[n] ?? ROLE[0];
  if (i.item_id === "TG_INDUSTRY") return IND[n] ?? IND[0];
  if (i.item_id === "TG_OC") return n ? "ORG_RESEARCH" : "ORG_OEM";
  return i.options?.[n] ?? i.options?.[0] ?? "x";
}

function subOf(c: Cover, mode: "top" | "low"): Submission {
  const answers: Record<string, Answer> = {};
  const asked = bank.items.filter((i) =>
    (i.module === "INDUSTRY" && i.industry_pack === c.industry) ||
    (i.module === "ROLE" && i.item_id.startsWith(`${c.role}_`)))
    .map((i) => i.item_id);
  const base: Submission = {
    attempt_id: `cover-${c.name}`, tier: c.tier, stage: c.stage,
    grad_field: c.field, undergrad_core: c.undergrad ?? null,
    answers, checklists: {}, artifacts: {}, verifications: {},
    opened: { probe: [...DOM], deep: [...DOM] },
    industry_interest: c.industry ? [c.industry] : [],
    role_interest: c.role ? [c.role] : [],
    org_interest: [],
    industry_pack: c.industry ?? null, role_pack: c.role ?? null,
    asked,
  };
  for (const i of bank.items) {
    if (!routedFor(base, i)) continue;
    const a = mode === "top" ? topAnswer(i) : lowAnswer(i);
    if (a) answers[i.item_id] = a;
  }
  return base;
}

/** 근거 고르기를 가득 채운다. 체크리스트 · 산출물 · 검증 */
function withEvidence(s: Submission): Submission {
  const checklists: Record<string, string[]> = {};
  for (const td of DOM) {
    for (const ax of AXES) {
      const pool = (lists.domains[td]?.[ax] ?? []).map((x) => x.text);
      if (pool.length) checklists[`${td}.${ax}`] = pool.slice(0, 2);
    }
  }
  const artifacts: Record<string, string[]> = {};
  const verifications: Record<string, string[]> = {};
  for (const td of DOM) {
    artifacts[td] = (dataOf.get(td)?.artifacts ?? []).slice(0, 2);
    verifications[td] = (dataOf.get(td)?.verify_targets ?? []).slice(0, 2);
  }
  return { ...s, checklists, artifacts, verifications };
}
const AXES: Axis[] = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];

/* 어느 응시에서 서는가 */
const seenIn = new Map<string, string[]>();
for (const c of COVER) {
  const s = subOf(c, "top");
  for (const i of bank.items) {
    if (!routedFor(s, i)) continue;
    seenIn.set(i.item_id, [...(seenIn.get(i.item_id) ?? []), c.name]);
  }
}
const live = bank.items.filter((i) => seenIn.has(i.item_id));
const never = bank.items.filter((i) => !seenIn.has(i.item_id));

ok("은행의 모든 문항이 어느 응시에서는 선다", never.length === 0,
   never.length ? `서지 않는 문항 ${never.length}개: ${never.slice(0, 5).map((i) => i.item_id).join(" ")}`
     : `${live.length}문항`);

/* ────────────────────────────────────────────────────────────────────
 * 3. QA-A 구성개념 덮임. **사용자 입력마다 재는 것이 적혀 있다**
 * ──────────────────────────────────────────────────────────────── */
const noAxis = live.filter((i) => !i.measurement_axis);
ok("A 모든 입력 문항에 측정축이 적혀 있다", noAxis.length === 0,
   noAxis.map((i) => i.item_id).join(" ") || `${live.length}문항`);

/* 근거 고르기도 사용자 입력이다. 재는 것은 Evidence 이고 자리는 축이다 */
const evidenceRows: { id: string; family: Family; count: number }[] = [];
for (const td of DOM) {
  for (const ax of AXES) {
    const n = (lists.domains[td]?.[ax] ?? []).length;
    evidenceRows.push({ id: `checklist:${td}.${ax}`, family: "Evidence", count: n });
  }
  evidenceRows.push({ id: `artifact:${td}`, family: "Output",
    count: (dataOf.get(td)?.artifacts ?? []).length });
  evidenceRows.push({ id: `verify:${td}`, family: "Verification",
    count: (dataOf.get(td)?.verify_targets ?? []).length });
}
const thinEv = evidenceRows.filter((r) => r.count < 2);
ok("A 근거 고르기 칸마다 고를 항목이 둘 이상이다", thinEv.length === 0,
   thinEv.slice(0, 6).map((r) => `${r.id}=${r.count}`).join(" ") ||
   `${evidenceRows.length}칸`);

/* ────────────────────────────────────────────────────────────────────
 * 4. QA-B 입력 방식이 신호에 맞는가. §2·§3
 * ──────────────────────────────────────────────────────────────── */
const badScale = live.filter((i) =>
  !SCALE_OK[familyOf(i)].includes(i.response_scale ?? ""));
ok("B 신호 갈래마다 맞는 입력 방식을 쓴다", badScale.length === 0,
   badScale.slice(0, 5).map((i) => `${i.item_id}:${familyOf(i)}/${i.response_scale}`).join(" ")
   || `${live.length}문항`);

/* §2 다섯 칸은 **태도·선호 연속 신호에만** 둔다 */
const five = live.filter((i) => i.response_scale === "5보기");
const fiveWrong = five.filter((i) =>
  !["Interest", "LearningIntent"].includes(familyOf(i)));
ok("B 다섯 칸을 태도 신호 밖에서 쓰지 않는다", fiveWrong.length === 0,
   fiveWrong.map((i) => i.item_id).join(" ") || `${five.length}문항 (관심·배울 뜻)`);

/* §3 소유·경험·산출물·검증에 다섯 칸이 없다 */
const ladderFive = live.filter((i) =>
  ["Ownership", "Judgment", "Output", "Verification", "Experience"].includes(familyOf(i))
  && i.response_scale === "5보기");
ok("B 경험·소유·산출물·검증에 다섯 칸이 없다", ladderFive.length === 0,
   ladderFive.map((i) => i.item_id).join(" "));

/* 보기 넷의 문면은 한 자리에서만 온다 */
const ladder = live.filter((i) => i.response_scale === "L0~L3");
const oddLadder = ladder.filter((i) =>
  JSON.stringify(i.options) !== JSON.stringify(bank.level_options));
ok("B 보기 넷의 문면이 은행 한 자리에서 온다", oddLadder.length === 0,
   oddLadder.slice(0, 4).map((i) => i.item_id).join(" ") || `${ladder.length}문항`);

/* 다섯 칸 안에서 **품사가 섞이지 않는다**(§2). 양끝과 가운데가 같은 차원인가 */
const mixed: string[] = [];
for (const i of five) {
  const o = i.options ?? [];
  const steps = o.filter((_, n) => (i.option_values ?? [])[n] !== null);
  /* 끝과 가운데가 같은 꼴로 끝나는가. `보통이다` 와 `관심 있다` 는 둘 다
     용언이고, `관심` 처럼 재는 것의 이름만 적으면 차원이 아니다 */
  const bad = steps.filter((s) => !/다$/.test(s.trim()));
  if (bad.length) mixed.push(`${i.item_id}: ${bad.join("/")}`);
}
ok("B 다섯 칸의 말이 한 차원으로 적혀 있다", mixed.length === 0,
   mixed.slice(0, 3).join(" | "));

/* ────────────────────────────────────────────────────────────────────
 * 5. QA-C `잘 모르겠다` 는 가운데 값이 아니다. §9
 * ──────────────────────────────────────────────────────────────── */
const unknownable = five.filter((i) => (i.options ?? []).includes("잘 모르겠다"));
const unknownValued = unknownable.filter((i) => {
  const n = (i.options ?? []).indexOf("잘 모르겠다");
  return (i.option_values ?? [])[n] !== null;
});
ok("C `잘 모르겠다` 자리에 수가 없다", unknownValued.length === 0,
   unknownValued.map((i) => i.item_id).join(" ") || `${unknownable.length}문항`);

/**
 * 저장된 값이 아니라 **읽는 법과 routing 이** 갈리는지 본다.
 *
 * 처음에는 묶음(zone)을 견주었는데 그것이 틀린 검사였다. 묶음은 축 수준과
 * 근거로 서고 관심은 들어가지 않으므로, 근거를 가득 채운 응시에서는 관심이
 * 3 이든 `모르겠다` 든 묶음이 같다. **그것은 설계대로다.** 갈려야 하는 자리는
 * 셋이다: 남는 상태 · routing(어느 영역을 깊게 볼지) · 결과지가 적는 글.
 */
{
  const c = COVER[0];
  const mid = subOf(c, "top");
  const unk = subOf(c, "top");
  /* 경험을 0 으로 두어 **관심이 routing 을 정하는 자리**를 만든다 */
  for (const td of DOM) mid.answers[`G_${td}_EXP`] = { kind: "exposure", value: 0 };
  for (const td of DOM) unk.answers[`G_${td}_EXP`] = { kind: "exposure", value: 0 };
  for (const i of unknownable) {
    mid.answers[i.item_id] = { kind: "scale5", value: 3 };
    unk.answers[i.item_id] = { kind: "choice", value: UNKNOWN };
  }
  const a = score(mid, loaded);
  const b = score(unk, loaded);
  const sameMissing = stable(a.domains.map((d) => d.interest.missing))
    === stable(b.domains.map((d) => d.interest.missing));
  ok("C 가운데 값과 `모르겠다` 가 다른 상태로 남는다", !sameMissing,
     `관심 상태 ${a.domains[0].interest.missing} vs ${b.domains[0].interest.missing}`);

  /* routing. 관심 3 은 정렬 열쇠가 되고 `모르겠다` 는 0 으로 떨어진다 */
  const grid = (sub: Submission) => Object.fromEntries(DOM.map((td) => {
    const gi = sub.answers[`G_${td}_INT`], gl = sub.answers[`G_${td}_LEA`];
    return [td, {
      interest: gi && gi.kind === "scale5" ? gi.value : null,
      exposure: 0,
      learning: gl && gl.kind === "scale5" ? gl.value : null,
    }];
  }));
  const pa = pickDomains(grid(mid), "PRO", DOM);
  const pb = pickDomains(grid(unk), "PRO", DOM);
  ok("C `모르겠다` 가 routing 에서 가운데 값과 같은 자리를 받지 않는다",
     pa.trace.join("|") !== pb.trace.join("|") ||
     pa.probe.join("+") !== pb.probe.join("+") ||
     stable(grid(mid)) !== stable(grid(unk)),
     `정렬 열쇠 관심=3 vs 관심=null`);

  /* 결과지가 적는 글 */
  const ma = visible(buildResult(a, loaded, { packs: { industries: [], roles: [] } }));
  const mb = visible(buildResult(b, loaded, { packs: { industries: [], roles: [] } }));
  ok("C 가운데 값과 `모르겠다` 가 다른 결과지를 낸다", ma !== mb,
     ma === mb ? "결과 모델이 글자까지 같다" : "결과 모델이 갈린다");
}

/* ────────────────────────────────────────────────────────────────────
 * 6. QA-D 교차검증. **자기보고 하나로 근거가 서지 않는다**
 * ──────────────────────────────────────────────────────────────── */
{
  /* 전부 `내가 정하고 그 결과가 쓰였다` 인데 고른 근거가 하나도 없는 사람 */
  const bare = subOf(COVER[0], "top");
  const s = score(bare, loaded);
  const z1 = s.zones.Z1_EVIDENCE_ESTABLISHED;
  ok("D 자기보고만으로 근거가 선 영역이 생기지 않는다", z1.length === 0,
     z1.length ? `Z1: ${z1.join(" ")}` : "근거 고르기가 없으면 Z1 이 0개");
  const owned = s.domains.flatMap((d) => d.owned);
  ok("D 자기보고만으로 소유가 서지 않는다", owned.length === 0,
     owned.length ? `소유 ${owned.length}칸` : "소유 0칸");

  /* 근거를 채우면 선다. **막기만 하는 검사는 산 사람도 막는다** */
  const full = score(withEvidence(bare), loaded);
  ok("D 근거를 채우면 근거가 선 영역이 생긴다",
     full.zones.Z1_EVIDENCE_ESTABLISHED.length > 0,
     `Z1 ${full.zones.Z1_EVIDENCE_ESTABLISHED.length}개`);

  /* Z1 한 영역이 **서로 다른 갈래 둘 이상**에서 왔는가 */
  const thin: string[] = [];
  for (const td of full.zones.Z1_EVIDENCE_ESTABLISHED) {
    const d = full.domains.find((x) => x.code === td)!;
    const kinds = new Set<string>();
    for (const ax of AXES) {
      for (const k of d.axes[ax].evidence_keys) kinds.add(k.split(":")[0]);
      if (d.axes[ax].from.length) kinds.add("item");
    }
    if (kinds.size < 2) thin.push(`${td}(${[...kinds].join("+")})`);
  }
  ok("D 근거가 선 영역마다 갈래 둘 이상이 받친다", thin.length === 0,
     thin.slice(0, 4).join(" ") ||
     `${full.zones.Z1_EVIDENCE_ESTABLISHED.length}개 영역`);
}

/* ────────────────────────────────────────────────────────────────────
 * 7. QA-E 받고 쓰지 않는 문항. **적어 둔 값이 아니라 결과를 견준다**
 * ──────────────────────────────────────────────────────────────── */

/** 결과에서 사람이 읽는 자리만 남긴다. 판본과 되짚는 글은 뺀다 */
function visible(m: unknown): string {
  const strip = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map((v) => strip(v));
    if (x && typeof x === "object") {
      const o = x as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(o).sort()) {
        /* 판본과 되짚는 자리는 화면에 나가지 않는다 */
        if (k === "provenance" || k === "trace" || k === "from" || k === "blocks") continue;
        out[k] = strip(o[k]);
      }
      return out;
    }
    return x;
  };
  return JSON.stringify(strip(m));
}

/**
 * **바닥에서 한 칸만 올려 본다.**
 *
 * 처음에는 전부 최고로 채운 응시에서 한 문항만 내려 보았다. 그러면 한 축에
 * 문항이 둘인 자리에서 **짝이 가려 준다**: 결과가 축마다 높은 쪽만 들고
 * 있으므로 한 문항을 내려도 결과가 그대로다. 그 상태로는 받고 쓰지 않는
 * 문항과 짝에 가려진 문항이 구별되지 않는다.
 *
 * 그래서 두 방향을 다 본다. 바닥에서 한 칸만 올려 결과가 달라지면 그
 * 응답은 결과로 들어간다. 올려서 달라지는데 천장에서 내려도 안 달라지면
 * **짝에 가려진다**: 결과가 그 문항을 따로 읽지 못한다.
 */
type Use = { id: string; floor: boolean; ceil: boolean; where: string };
const uses: Use[] = [];
const tested = new Set<string>();

const TRANS_TOP = "하중 조건을 직접 정했다";
const TRANS_LOW = "받아 쓴 조건으로 돌렸다";

function modelOf(sub: Submission, trans: { item_id: string; choice: string }[]): string {
  const s = score(sub, loaded);
  return visible(buildResult(
    { ...s, context: { ...s.context, translation_steps: trans.map((t) => t.item_id) } },
    loaded, { packs: { industries: IND, roles: ROLE }, translation: trans }));
}

for (const c of COVER) {
  const top = withEvidence(subOf(c, "top"));
  /* 바닥. **열리는 문항은 그대로 열어 둔다**: 격자의 해 본 정도를 0 으로
     내리면 선별 축의 둘째 문항이 routing 밖으로 빠져서, 재려던 문항이
     애초에 서지 않는다 */
  const floor = withEvidence(subOf(c, "low"));
  for (const td of DOM) floor.answers[`G_${td}_EXP`] = { kind: "exposure", value: 2 };

  const transTop = bank.items.filter((i) => i.module === "TRANS-10")
    .filter((i) => routedFor(top, i))
    .map((i) => ({ item_id: i.item_id, choice: TRANS_TOP }));
  const transLow = transTop.map((t) => ({ ...t, choice: TRANS_LOW }));

  const baseTop = modelOf(top, transTop);
  const baseFloor = modelOf(floor, transLow);

  for (const i of bank.items) {
    if (tested.has(i.item_id)) continue;
    if (!routedFor(top, i) || !routedFor(floor, i)) continue;
    const lo = lowAnswer(i), hi = topAnswer(i);
    if (!lo || !hi) continue;
    tested.add(i.item_id);

    const down = modelOf(
      { ...top, answers: { ...top.answers, [i.item_id]: lo } },
      i.module === "TRANS-10"
        ? transTop.map((t) => t.item_id === i.item_id ? { ...t, choice: TRANS_LOW } : t)
        : transTop);
    const up = modelOf(
      { ...floor, answers: { ...floor.answers, [i.item_id]: hi } },
      i.module === "TRANS-10"
        ? transLow.map((t) => t.item_id === i.item_id ? { ...t, choice: TRANS_TOP } : t)
        : transLow);

    uses.push({ id: i.item_id, ceil: down !== baseTop, floor: up !== baseFloor,
      where: c.name });
  }
}

const dead = uses.filter((u) => !u.floor && !u.ceil);
/**
 * 짝에 가려 결과가 따로 읽지 못하는 문항. **지금은 비어 있다.**
 *
 * `CJ_GIVEN_REV` 가 한동안 여기 있었다. 문면과 보기가 어긋나 결과지가 그
 * 문항을 문장으로 적지 않았고, 그래서 천장에서 내려도 결과가 그대로였다.
 * 문면을 겪은 장면으로 다시 쓴 뒤로는 다른 판단 문항과 같이 문장으로
 * 서므로 예외가 필요하지 않다.
 */
const MASK_OK = new Set<string>();
const masked = uses.filter((u) => u.floor && !u.ceil);
const maskedBad = masked.filter((u) => !MASK_OK.has(u.id));
ok("E 응답이 결과로 들어가지 않는 문항이 없다", dead.length === 0,
   dead.length ? `${dead.length}문항: ${dead.slice(0, 8).map((u) => u.id).join(" ")}`
     : `${uses.length}문항 전부가 결과 모델을 바꾼다`);
ok("E 한 축의 짝에 가려 결과가 따로 읽지 못하는 문항이 없다", maskedBad.length === 0,
   maskedBad.length ? `${maskedBad.length}문항: ${maskedBad.slice(0, 8).map((u) => u.id).join(" ")}`
     : `${uses.length}문항 (적어 둔 예외 ${masked.length}개)`);

/* ────────────────────────────────────────────────────────────────────
 * 8. QA-F 중복 위험. **비슷하다고 지우지 않는다. 갈래만 적는다**
 * ──────────────────────────────────────────────────────────────── */
const norm = (s: string) => s.replace(/[^가-힣a-zA-Z0-9]/g, "");
function tri(s: string): Set<string> {
  const t = norm(s); const out = new Set<string>();
  for (let n = 0; n + 3 <= t.length; n += 1) out.add(t.slice(n, n + 3));
  return out;
}
function jac(a: string, b: string): number {
  const x = tri(a), y = tri(b);
  if (!x.size || !y.size) return 0;
  let hit = 0; for (const v of x) if (y.has(v)) hit += 1;
  return hit / (x.size + y.size - hit);
}

type Dup = { a: string; b: string; sim: number; kind: string; note: string };
const dup: Dup[] = [];
for (let n = 0; n < live.length; n += 1) {
  for (let m = n + 1; m < live.length; m += 1) {
    const a = live[n], b = live[m];
    const sim = jac(a.wording ?? "", b.wording ?? "");
    if (sim < 0.5 && norm(a.wording ?? "") !== norm(b.wording ?? "")) continue;
    const sameDomain = a.technical_domain === b.technical_domain;
    const sameAxis = a.evidence_axis === b.evidence_axis;
    const sameFam = familyOf(a) === familyOf(b);
    const sameModule = a.module === b.module;
    const pairLinked = a.consistency_pair === b.item_id || b.consistency_pair === a.item_id;
    const crossPack = !!a.industry_pack && !!b.industry_pack
      && a.industry_pack !== b.industry_pack;
    let kind = "DIFFERENT_AXIS", note = "";
    if (norm(a.wording ?? "") === norm(b.wording ?? "")) {
      kind = "EXACT_DUPLICATE"; note = "문면이 글자까지 같다";
    } else if (pairLinked) {
      kind = "CONSISTENCY_PAIR";
      note = "일관성 짝. 같은 뜻을 장면만 바꿔 묻는 자리이고 교차검증이 아니다";
    } else if (crossPack) {
      kind = "DIFFERENT_PACK";
      note = "산업팩이 달라 한 응시에서 같이 서지 않는다. 그 산업의 조건이 문면에 없으면 팩이 파는 것이 사라진다";
    } else if (sameDomain && sameAxis && sameFam && sameModule) {
      kind = "SEMANTIC_DUPLICATE"; note = "같은 영역·축·묶음을 두 번 묻는다";
    } else if (sameDomain && sameAxis && !sameModule) {
      kind = "NECESSARY_CROSSCHECK";
      note = `${a.module} 과 ${b.module} 이 같은 자리를 다른 말로 묻는다`;
    } else if (!sameAxis) {
      kind = "DIFFERENT_AXIS"; note = "축이 다르다";
    } else {
      kind = "DIFFERENT_CONTEXT"; note = "영역이나 장면이 다르다";
    }
    dup.push({ a: a.item_id, b: b.item_id, sim: Math.round(sim * 100) / 100, kind, note });
  }
}
const hardDup = dup.filter((d) =>
  d.kind === "EXACT_DUPLICATE" || d.kind === "SEMANTIC_DUPLICATE");
ok("F 같은 영역·축을 같은 말로 두 번 묻는 자리가 없다", hardDup.length === 0,
   hardDup.slice(0, 5).map((d) => `${d.a}~${d.b}(${d.sim})`).join(" ")
   || `닮은 쌍 ${dup.length}개 전부 축·장면이 갈린다`);

/* ────────────────────────────────────────────────────────────────────
 * 8b. 코드가 글자로 적어 둔 문항 번호가 은행에 있는가
 *
 * 이 저장소에서 같은 탈이 두 번 났다. `quality.ts` 가 묶음 이름을
 * `DEEP-J8` · `PROBE-J4` 로 적어 두어 for 문의 몸통이 영원히 건너뛰어졌고,
 * 같은 파일이 역방향 짝을 `CJ_PROBLEM` 으로 적어 두어 그 규칙이 한 번도
 * 돌지 않았다. **없는 이름을 읽으면 코드는 조용히 아무 일도 안 한다.**
 * ──────────────────────────────────────────────────────────────── */
{
  /**
   * **지난 판본의 번호도 산 번호다.**
   *
   * 결과지는 그때 낸 결과를 다시 그릴 수 있어야 하므로, `TR_TAG_1` 처럼
   * ME_V3 V1 에만 있는 단계의 이름표를 지우면 그 판본의 결과지가 문항
   * 번호를 그대로 찍는다. 그래서 세는 자리는 등록부가 가리키는 **모든
   * 판본의 은행**이다. 파일 이름을 코드에 적지 않는다(`core-registry.ts`).
   */
  const ids = new Set<string>();
  for (const c of registry().cores) {
    const names = [c.files.items, ...(c.frozen ?? []).map((f) => f.files.items)]
      .filter((n): n is string => !!n);
    for (const n of names) {
      const at = join(CONTENT_DIR, n);
      if (!existsSync(at)) continue;
      const b = JSON.parse(readFileSync(at, "utf8")) as { items: { item_id: string }[] };
      for (const i of b.items) ids.add(i.item_id);
    }
  }
  const shape = /\b(?:CJ|UG|MS|PHD|PD|CN|CF|TG|TR|XF|G)_[A-Z0-9_]{2,}\b/g;
  const bad: string[] = [];
  const files = execSync(
    'find src/lib/me-v3 -name "*.ts"', { encoding: "utf8" }).trim().split("\n");
  for (const f of files) {
    /* **주석은 걷어 낸다.** 이 저장소는 `왜 지웠는가` 를 주석으로 남기는
       쪽을 택했고, 세면 맞는 기록을 지우라고 요구하게 된다 */
    const src = readFileSync(f, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const m of src.match(shape) ?? []) {
      if (!ids.has(m) && !bad.includes(`${f}:${m}`)) bad.push(`${f}:${m}`);
    }
  }
  ok("코드가 글자로 적어 둔 문항 번호가 은행에 있다", bad.length === 0,
     bad.slice(0, 5).join(" ") || `파일 ${files.length}개 · 은행 번호 ${ids.size}개`);
}

/* ────────────────────────────────────────────────────────────────────
 * 8c. 영역에 걸치지 않는 판단마다 사람이 읽는 이름이 있는가
 * ──────────────────────────────────────────────────────────────── */
{
  const commonIds = bank.items
    .filter((i) => ["CORE-JUDGE", "UG-CORE", "MS-CORE", "PHD-CORE", "POSTDOC-CORE"]
      .includes(i.module))
    .map((i) => i.item_id);
  const unnamed = commonIds.filter((id) => !COMMON_ITEM_KO[id] && !MASK_OK.has(id));
  const named = commonIds.filter((id) => !!COMMON_ITEM_KO[id]).length;
  ok("영역에 걸치지 않는 판단마다 읽는 이름이 있다", unnamed.length === 0,
     unnamed.join(" ") || `${named} / ${commonIds.length}문항`);
  const stray = Object.keys(COMMON_ITEM_KO).filter((id) => !commonIds.includes(id));
  ok("읽는 이름이 은행에 없는 문항을 가리키지 않는다", stray.length === 0, stray.join(" "));
}

/* ────────────────────────────────────────────────────────────────────
 * 8d. 사람이 정할 일
 * ──────────────────────────────────────────────────────────────── */
{
  /**
   * **등록부의 짝 표를 여기서도 읽는다.**
   *
   * `v3:registry` 가 같은 것을 세지만, 측정 지도를 만드는 이 자리에서 한 번
   * 더 보는 까닭은 지도의 `신호 갈래` 칸이 그 짝에서 나오기 때문이다.
   * 어긋난 문항을 지도에 적으면 그 지도가 틀린 것을 맞다고 적는다.
   */
  const reg = constructRegistry(core);
  const byId = new Map(reg.items.map((r) => [r.item_id, r]));
  const bad = live.filter((i) => {
    const r = byId.get(i.item_id);
    if (!r) return true;
    return !compatible(r.primary, r.response_type);
  });
  ok("지도의 문항마다 construct 와 response type 이 맞는 짝이다", bad.length === 0,
     bad.slice(0, 4).map((i) => i.item_id).join(" ") || `${live.length}문항`);

  /* 역방향 문항과 일관성 짝의 수를 적어 둔다. **가짜 교차검증을 세지 않기
     위해 수를 드러낸다**: 역방향이 0개면 전부 최고로 답한 사람을 막는 것은
     근거 요구 하나다 */
  const rev = bank.items.filter((i) => i.reverse_flag);
  const pairs = bank.items.filter((i) => i.consistency_pair).length / 2;
  ok("역방향 문항에 짝이 없는 자리가 없다",
     rev.every((r) => bank.items.some((i) => !i.reverse_flag && i.module === r.module
       && i.evidence_axis === r.evidence_axis)),
     `역방향 ${rev.length}개 · 일관성 짝 ${pairs}쌍`);
  if (rev.length === 0) {
    note("역방향 문항이 0개다",
      "`REVERSE_PAIR_AGREED` 는 설 자리가 없다. 전부 최고로 답한 사람을 막는 것은"
      + " 소유가 응답과 고른 근거 둘을 함께 보는 규칙이고 `v3:gaming` 이 그것을 센다");
  }
}

/* ────────────────────────────────────────────────────────────────────
 * 8e. 산업·역할 팩이 Core 판정을 바꾸지 않는가
 *
 * 팩 문항은 같은 자리를 그 산업·직무의 말로 **다시 읽는** 자리다. 읽는
 * 자리가 판정을 바꾸면 산업을 고르는 일이 점수를 고르는 일이 된다.
 * **팩 응답을 바닥에서 천장까지 올려 보고 Core 지문을 글자로 견준다.**
 * ──────────────────────────────────────────────────────────────── */
{
  const c: Cover = { name: "팩불변", tier: "PRO", stage: "bachelor", field: null,
    industry: IND[0], role: ROLE[0] };
  const base = withEvidence(subOf(c, "top"));
  const packIds = bank.items
    .filter((i) => (i.module === "INDUSTRY" || i.module === "ROLE")
      && routedFor(base, i)).map((i) => i.item_id);
  const low: Submission = { ...base, answers: { ...base.answers } };
  for (const id of packIds) low.answers[id] = { kind: "level", index: 0 };
  const a = stable(coreOnly(score(base, loaded)));
  const b = stable(coreOnly(score(low, loaded)));
  ok("산업·역할 팩 응답이 Core 판정을 바꾸지 않는다", a === b,
     a === b ? `팩 문항 ${packIds.length}개를 바닥에서 천장까지 바꿔도 Core 지문이 같다`
       : "Core 지문이 달라졌다");

  /* 산업을 바꿔도 Core 가 같은가. 고른 팩만 갈아 끼운다 */
  const other = IND[1];
  const swapped: Submission = { ...base, industry_pack: other,
    industry_interest: [other],
    asked: bank.items.filter((i) =>
      (i.module === "INDUSTRY" && i.industry_pack === other)
      || (i.module === "ROLE" && i.item_id.startsWith(`${ROLE[0]}_`)))
      .map((i) => i.item_id) };
  ok("산업을 바꿔도 Core 판정이 같다",
     stable(coreOnly(score(swapped, loaded))) === a,
     `${IND[0]} vs ${other}`);
}

/* ────────────────────────────────────────────────────────────────────
 * 8f. 사람이 읽어 주셔야 하는 팩 문항
 * ──────────────────────────────────────────────────────────────── */
type PackFile = {
  packs: { code: string; items?: { id: string; review?: string;
    review_reason?: string; gloss?: string }[] }[];
};
const REVIEW_FLAG = "HUMAN_DOMAIN_REVIEW_REQUIRED";
let flagged: { id: string; why: string }[] = [];
{
  const ip = coreFile<PackFile>(core, "items");
  void ip;
  const packs = JSON.parse(readFileSync(
    join(CONTENT_DIR, "industry-packs-v2.json"), "utf8")) as PackFile;
  for (const p of packs.packs) {
    for (const it of p.items ?? []) {
      if (it.review === REVIEW_FLAG) {
        flagged.push({ id: it.id, why: it.review_reason ?? "" });
      }
    }
  }
  /* 표시한 문항마다 까닭이 적혀 있는가. **표시만 두면 다음 사람이 무엇을
     봐야 하는지 모른다** */
  const noWhy = flagged.filter((f) => f.why.length < 20);
  ok(`${REVIEW_FLAG} 표시마다 까닭이 적혀 있다`, noWhy.length === 0,
     noWhy.map((f) => f.id).join(" ") || `표시 ${flagged.length}개`);
  /* 표시한 문항도 쉬운 말 풀이는 있어야 한다 */
  const noGloss: string[] = [];
  for (const p of packs.packs) {
    for (const it of p.items ?? []) {
      if (it.review === REVIEW_FLAG && (it.gloss ?? "").length < 10) noGloss.push(it.id);
    }
  }
  ok("표시한 문항에도 쉬운 말 풀이가 있다", noGloss.length === 0, noGloss.join(" "));
}

/* ────────────────────────────────────────────────────────────────────
 * 9. 지도를 적는다
 * ──────────────────────────────────────────────────────────────── */

/** 그 응답이 결과의 어디로 가는가. 코드를 읽어 적는다 */
function useOf(i: BankItem): string {
  const f = familyOf(i);
  if (i.module === "CORE-GRID") {
    return i.measurement_axis === "exposure"
      ? "routing(심화 영역 고르기) · 영역 절의 해 본 정도 · 묶음 판정"
      : i.measurement_axis === "interest"
        ? "routing · 영역 절의 관심 구간 · 네 칸 묶음 · 첫 화면 먼저 볼 영역"
        : "영역 절의 배울 뜻 · 다음 할 일";
  }
  if (i.module === "PROBE-S4") return "축 수준 · 묶음 판정 · 비어 있는 자리 · 할 일";
  if (i.module === "DEEP-S8") return "축 수준 · 묶음 판정 · 비어 있는 자리 · 할 일";
  if (i.module === "CORE-JUDGE") return "영역에 걸치지 않는 판단 절";
  if (/-CORE$/.test(i.module)) return "영역에 걸치지 않는 판단 절(학위 장면)";
  if (i.module === "CONSIST") return "응답 품질 flag · 축 수준(낮은 쪽)";
  if (i.module === "CORE-FORCE") return "묶인 영역 가운데 고른 쪽 · 제시 차례";
  if (i.module === "INDUSTRY") return "산업 절(답한 판단 · 아직 아닌 자리 · 겹침)";
  if (i.module === "ROLE") return "직무 절(답한 판단 · 아직 아닌 자리 · 겹침)";
  if (i.module === "TRANS-10") return "경험 번역 절 · 지원서 초안";
  if (i.module === "GRAD-XFIELD") return "번역 절의 타계열 맥락";
  if (i.module === "TARGET") return "목표 절 · 지역과 기관 절";
  return f;
}

/** 무엇으로 교차검증되는가. **같은 말을 다시 묻는 것은 교차검증이 아니다** */
function crossOf(i: BankItem): string {
  const td = i.technical_domain, ax = i.evidence_axis;
  if (i.module === "CORE-GRID" && i.measurement_axis === "interest") {
    return `같은 영역의 해 본 정도(G_${td}_EXP) · 선별 축 응답 · 강제 선택`;
  }
  if (i.module === "CORE-GRID" && i.measurement_axis === "exposure") {
    return `선별 축 응답(${td}_J3/J5/J6/J7) · 근거 고르기`;
  }
  if (i.module === "CORE-GRID") return "선별 축 응답 · 할 일 실행 가능성(파일럿)";
  if (i.module === "PROBE-S4" || i.module === "DEEP-S8") {
    const parts = [`근거 고르기 checklist:${td}.${ax}`];
    if (ax === "J5") parts.push(`산출물 고르기 artifact:${td}`);
    if (ax === "J6") parts.push(`검증 대상 고르기 verify:${td}`);
    parts.push("같은 칸의 둘째 문항");
    if (ax === "J3") parts.push("일관성 짝(CN_*)");
    return parts.join(" · ");
  }
  if (i.module === "CONSIST") return `짝 문항 ${i.consistency_pair ?? "-"}`;
  if (i.module === "INDUSTRY" || i.module === "ROLE") {
    return `Core 의 같은 자리(${td}.${ax}) · 근거 고르기`;
  }
  if (i.module === "CORE-JUDGE" || /-CORE$/.test(i.module)) {
    return "같은 축의 영역 문항 · 근거 고르기";
  }
  if (i.module === "TRANS-10") return "앞 단계에서 고른 보기 · 영역 축 수준";
  return "없음(교차검증 대상이 아니다)";
}

/** 위험. 자기과장 · 사회적 바람직성 · 중복 · 모호 · 전문용어 · 학위편향 */
function riskOf(i: BankItem): string[] {
  const r: string[] = [];
  const f = familyOf(i);
  if (["Ownership", "Judgment", "Output", "Verification"].includes(f)) {
    r.push("자기과장(근거 고르기와 둘째 문항이 받친다)");
  }
  if (f === "Interest" || f === "LearningIntent") {
    r.push("사회적 바람직성(점수가 되지 않고 구간으로만 읽는다)");
  }
  if (i.industry_pack) r.push("전문용어(쉬운 말 풀이가 함께 뜬다)");
  if (i.stage_wording) r.push("학위편향(보기와 판정은 네 학위가 같다)");
  if ((i.wording ?? "").length > 60) r.push("길이(60자 넘음)");
  if (dup.some((d) => (d.a === i.item_id || d.b === i.item_id)
    && d.kind === "SEMANTIC_DUPLICATE")) r.push("중복");
  return r.length ? r : ["특기 없음"];
}

const byFam = new Map<Family, BankItem[]>();
for (const i of live) byFam.set(familyOf(i), [...(byFam.get(familyOf(i)) ?? []), i]);

const L: string[] = [];
L.push("# ME_V3_2 측정체계 지도");
L.push("");
L.push(`core \`${core}\` · 문항 은행 \`${bank.assessment_version}\` · 은행 ${bank.items.length}문항 · 응시에서 서는 문항 ${live.length}개`);
L.push("");
L.push("이 문서는 `npm run v3:measure` 가 만든다. 손으로 고치지 않는다.");
L.push("문면을 고치면 다음 실행에서 이 표가 따라온다.");
L.push("");
L.push("## 신호 갈래별 수");
L.push("");
L.push("| 신호 갈래 | 문항 | 입력 방식 | 결과 사용처 |");
L.push("|---|---|---|---|");
for (const f of Object.keys(SCALE_OK) as Family[]) {
  const g = byFam.get(f) ?? [];
  if (!g.length && f !== "Evidence") continue;
  const scales = [...new Set(g.map((i) => i.response_scale))].join(" · ");
  if (f === "Evidence") {
    L.push(`| Evidence | ${evidenceRows.filter((r) => r.family === "Evidence").length}칸 (항목 ${evidenceRows.filter((r) => r.family === "Evidence").reduce((a, r) => a + r.count, 0)}개) | 고르기(복수) | 소유 판정의 근거 · 근거 절 · 비어 있는 자리 |`);
    continue;
  }
  L.push(`| ${f} | ${g.length} | ${scales} | ${useOf(g[0])} |`);
}
L.push("");
L.push("## 문항마다 (응시에서 서는 것 전부)");
L.push("");
L.push("| item_id | 사용자가 읽는 문장 | 측정 construct | 신호 갈래 | 입력 방식 | 결과 사용처 | 교차검증 대상 | 위험 |");
L.push("|---|---|---|---|---|---|---|---|");
const order = [...live].sort((a, b) =>
  a.module.localeCompare(b.module) || a.item_id.localeCompare(b.item_id));
for (const i of order) {
  const shown = i.grid_row ? `${i.grid_row}, ${i.grid_stem}` : (i.wording ?? "");
  const cons = i.technical_domain && i.evidence_axis
    ? `${NAME.get(i.technical_domain) ?? i.technical_domain} / ${i.evidence_axis}`
    : i.measurement_axis;
  L.push(`| \`${i.item_id}\` | ${shown.replace(/\|/g, "/")} | ${cons} | ${familyOf(i)} | ${i.response_scale} | ${useOf(i)} | ${crossOf(i)} | ${riskOf(i).join(" · ")} |`);
}
L.push("");
L.push("## 받고 쓰지 않는 문항");
L.push("");
L.push(`두 방향으로 센다. 바닥에서 한 칸 올려 결과가 달라지는가 · 천장에서 한 칸 내려 결과가 달라지는가. 센 문항 ${uses.length}개.`);
L.push("");
L.push("| 판정 | 문항 | 뜻 |");
L.push("|---|---|---|");
L.push(`| LIVE | ${uses.filter((u) => u.floor && u.ceil).length} | 두 방향 다 결과가 달라진다 |`);
L.push(`| MASKED | ${masked.length} | 올리면 달라지고 내려도 그대로다. 같은 축의 짝이 가린다 |`);
L.push(`| DEAD | ${dead.length} | 어느 방향으로도 결과가 같다 |`);
L.push("");
if (masked.length) {
  L.push("MASKED 문항:");
  L.push("");
  for (const d of masked) L.push(`- \`${d.id}\``);
  L.push("");
}
if (dead.length) {
  L.push("DEAD 문항:");
  L.push("");
  for (const d of dead) L.push(`- \`${d.id}\``);
  L.push("");
}
L.push("");
L.push("## 중복 위험");
L.push("");
L.push("| 갈래 | 쌍 | 뜻 |");
L.push("|---|---|---|");
for (const k of ["EXACT_DUPLICATE", "SEMANTIC_DUPLICATE", "CONSISTENCY_PAIR",
  "NECESSARY_CROSSCHECK", "DIFFERENT_PACK", "DIFFERENT_AXIS", "DIFFERENT_CONTEXT"]) {
  const g = dup.filter((d) => d.kind === k);
  const note = g[0]?.note ?? "해당 쌍 없음";
  L.push(`| ${k} | ${g.length} | ${note} |`);
}
L.push("");
if (dup.length) {
  L.push("닮음 0.5 이상인 쌍 전부:");
  L.push("");
  L.push("| A | B | 닮음 | 갈래 |");
  L.push("|---|---|---|---|");
  for (const d of dup.sort((x, y) => y.sim - x.sim).slice(0, 60)) {
    L.push(`| \`${d.a}\` | \`${d.b}\` | ${d.sim} | ${d.kind} |`);
  }
}
L.push("");
L.push("## 사람이 읽어 주셔야 하는 팩 문항");
L.push("");
if (flagged.length) {
  L.push("| item_id | 까닭 |");
  L.push("|---|---|");
  for (const f of flagged) L.push(`| \`${f.id}\` | ${f.why} |`);
  L.push("");
  L.push("`HUMAN_DOMAIN_REVIEW_REQUIRED` 로 표시했다. **Core 판정과는 떨어져 있다**: 팩 응답을 바닥에서 천장까지 바꿔도 Core 지문이 같고, 산업을 갈아 끼워도 같다.");
} else {
  L.push("표시한 문항 없음.");
}
L.push("");
mkdirSync("docs/metri", { recursive: true });
writeFileSync(OUT, L.join("\n") + "\n");
console.log(`\n  ${OUT} 에 적었다 (${L.length}줄)`);

console.log(`\n  통과 ${pass} · 걸림 ${fail} · 보고 ${notes}`);
process.exit(fail ? 1 : 0);
