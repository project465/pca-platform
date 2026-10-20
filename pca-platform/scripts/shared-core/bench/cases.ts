/**
 * Core 품질 벤치마크 v1 — 합성 사례 (R37 §4-2).
 *
 * **회귀와 논리 오류를 잡는 자리다. 학술적 타당성이나 실제 직무 추천의
 * 정확성을 말하지 않는다.** 사례는 사람을 지어낸 것이고, 기대는 엔진의
 * 규칙에서 나오는 성질(이렇게 답하면 이런 상태가 서야 한다 · 이것은 서면
 * 안 된다)이다. 정답 점수를 적지 않는다: 이 엔진은 점수를 내지 않는다.
 *
 * 체크리스트 · 산출물 · 검증 항목은 **그 Core 의 실제 파일에서 앞에서부터**
 * 고른다(`fixtures.ts` 의 `expand` 와 같은 규칙). 없는 항목을 근거로 세면
 * 벤치마크가 제품보다 느슨해진다.
 *
 * 사례마다 일곱 칸: 입력 · 기대 특성 · 추천 근거 필수 조건 · 금지 과장 ·
 * Gap 조건 · (실제 출력은 러너가 채운다) · 판정과 근거.
 */
import { readFileSync } from "node:fs";
import { coreFile, core as coreEntry } from "../../../src/lib/me-v3/core-registry";
import type { Fixture } from "../../../src/lib/me-v3/scoring/fixtures";

export const BENCH_CORES = ["ME_CORE_V3", "BIZ_CORE_V1", "EE_CORE_V1", "CS_CORE_V1"] as const;
export const AXES = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"] as const;
/** 선별(BASIC) 네 축. 화면이 영역마다 묻는 축이다 */
export const SCREEN = ["J3", "J5", "J6", "J7"] as const;

type Dom = { code: string; required_axes: string[]; artifacts: string[]; verify_targets: string[] };
type Lists = { domains: Record<string, Record<string, { text: string }[]>> };

export type CaseKind =
  | "C01_STRONG" | "C02_SAME_MAJOR_NO_EXP" | "C03_SAME_EXP_LOW_INTEREST"
  | "C04_CLAIM_WITHOUT_EVIDENCE" | "C05_ACTIVITY_OTHER_INDUSTRY" | "C06_REPEAT_REORDERED"
  | "C07_PARTIAL_MISSING" | "C08_TOOL_MISMATCH" | "C09_SAME_MAJOR_OTHER_GOAL"
  | "C10_BASIC_TIER" | "C11_STAGE_POSTDOC";

export type CaseSpec = {
  id: string; core: string; kind: CaseKind;
  /** 무엇을 바꾼 사람인가. 사람이 읽는 한 줄 */
  input: string;
  expect: string[];
  must_ground: string[];
  forbidden: string[];
  gap_condition: string;
  /** 무엇과 견주는가. 같은 Core 의 기준 사례 */
  pair?: { with: string; relation: "CORE_SAME" | "CORE_DIFFERS" | "FULL_SAME" };
  fixture: Fixture;
};

export type CoreSetup = {
  core: string; d1: string; d2: string; d1Required: string[];
  industries: string[]; roles: string[];
};

function pool(lists: Lists, td: string, ax: string): number {
  return (lists.domains[td]?.[ax] ?? []).length;
}

export function setupOf(core: string): CoreSetup {
  const dom = coreFile<{ domains: Dom[] }>(core, "domains").domains;
  const fx = JSON.parse(readJson(coreFixturePath(core))) as {
    cases: { industries: (string | null)[]; roles: (string | null)[] };
  };
  return {
    core,
    d1: dom[0].code,
    d2: dom[1].code,
    d1Required: dom[0].required_axes,
    industries: fx.cases.industries.filter((x): x is string => Boolean(x)),
    roles: fx.cases.roles.filter((x): x is string => Boolean(x)),
  };
}

function readJson(f: string): string { return readFileSync(f, "utf8"); }
function coreFixturePath(core: string): string {
  const p = coreEntry(core).fixtures?.personas;
  if (!p) throw new Error(`${core} 의 personas fixture 가 등록부에 없습니다`);
  return p;
}

const all = (v: number) => Object.fromEntries(AXES.map((a) => [a, v]));
const screen = (v: number) => Object.fromEntries(SCREEN.map((a) => [a, v]));

/** 체크리스트를 축마다 `n` 개까지. 그 축의 목록이 짧으면 있는 만큼 */
function picks(core: string, td: string, axes: readonly string[], n: number): Record<string, number> {
  const lists = coreFile<Lists>(core, "checklists");
  const out: Record<string, number> = {};
  for (const ax of axes) {
    const k = Math.min(n, pool(lists, td, ax));
    if (k > 0) out[ax] = k;
  }
  return out;
}

export function casesFor(core: string): CaseSpec[] {
  const S = setupOf(core);
  const { d1, d2 } = S;
  const tag = core.split("_")[0];
  const id = (k: string) => `${tag}-${k}`;

  const strong: Fixture = {
    id: id("C01"), name: "근거가 선 사람", tier: "PRO", stage: "bachelor", field: null,
    probe: [d1, d2], deep: [d1],
    grid: { [d1]: [5, 2, 5], [d2]: [4, 1, 4] },
    axes: { [d1]: all(2), [d2]: screen(2) },
    checklist: { [d1]: picks(core, d1, AXES, 2), [d2]: picks(core, d2, SCREEN, 1) },
    artifacts: { [d1]: 2, [d2]: 1 },
    verify: { [d1]: 2, [d2]: 1 },
    industry: S.industries[0] ?? null, role: S.roles[0] ?? null,
  };
  const clone = (over: Partial<Fixture>, k: string): Fixture =>
    ({ ...JSON.parse(JSON.stringify(strong)), ...over, id: id(k) });

  /* C06: 같은 응답을 열쇠 차례만 거꾸로 */
  const reversed = clone({}, "C06");
  reversed.grid = Object.fromEntries(Object.entries(strong.grid!).reverse());
  reversed.axes = Object.fromEntries(Object.entries(strong.axes!).reverse()
    .map(([td, v]) => [td, Object.fromEntries(Object.entries(v).reverse())]));

  /* C07: d1 의 심화 넷(J1 J2 J4 J8)을 비운다. 체크리스트는 그대로 둔다 */
  const partial = clone({}, "C07");
  partial.axes = { ...strong.axes!, [d1]: { ...screen(2) } };

  /* C08: J4(방법·도구)를 `없다` 로 답하고 J4 체크리스트는 두 개 고른다 */
  const mismatch = clone({}, "C08");
  mismatch.axes = { ...strong.axes!, [d1]: { ...all(2), J4: 0 } };

  return [
    {
      id: id("C01"), core, kind: "C01_STRONG",
      input: `${d1} 여덟 축을 전부 직접 수행(2) · 체크리스트 축마다 둘 · 산출물 둘 · 검증 둘 · 관심 5`,
      expect: [`${d1} 이 Z1(근거가 선 영역)`, `${d1} confirmed_all = 8`, "응답 품질 OK"],
      must_ground: ["did · decided · artifacts · verifications 의 모든 항목이 제출한 고르기 안에 있다"],
      forbidden: ["고르지 않은 항목이 근거로 선다", "근거 둘 미만인 축이 OWNED"],
      gap_condition: `${d1} 은 확인된 축이 여덟이라 확인 빈자리는 서지 않는다(소유를 더 세우라는 빈자리는 설 수 있다 · 검사)`,
      fixture: strong,
    },
    {
      id: id("C02"), core, kind: "C02_SAME_MAJOR_NO_EXP",
      input: "C01 과 같은 전공 · 같은 관심 · 여덟 축을 전부 `없다`(0) · 고르기 없음",
      expect: [`${d1} 이 Z1 이 아니다`, `${d1} confirmed_all = 0`],
      must_ground: ["근거 목록이 비어 있다"],
      forbidden: ["확인된 축이 선다", "Z1"],
      gap_condition: "필수 축 · 산출물 공백이 까닭으로 선다",
      pair: { with: id("C01"), relation: "CORE_DIFFERS" },
      fixture: clone({ axes: { [d1]: all(0), [d2]: screen(0) }, checklist: {}, artifacts: {}, verify: {} }, "C02"),
    },
    {
      id: id("C03"), core, kind: "C03_SAME_EXP_LOW_INTEREST",
      input: "C01 과 같은 경험 · 관심과 학습 의향만 1 (엔진에 '지식 수준' 측정이 없어 가장 가까운 신호로 바꿨다)",
      expect: ["축 상태가 C01 과 같다", `${d1} 이 Z3(근거는 있고 관심이 낮다)`],
      must_ground: ["근거 목록이 C01 과 같다"],
      forbidden: ["관심이 낮다는 까닭으로 확인된 축이 내려간다"],
      gap_condition: "관심 · 근거를 합치지 않는다: 축 빈자리는 C01 과 같다",
      pair: { with: id("C01"), relation: "CORE_DIFFERS" },
      fixture: clone({ grid: { [d1]: [1, 2, 1], [d2]: [1, 1, 1] } }, "C03"),
    },
    {
      id: id("C04"), core, kind: "C04_CLAIM_WITHOUT_EVIDENCE",
      input: "여덟 축 전부 `내가 정했고 쓰였다`(3) · 체크리스트 · 산출물 · 검증 0",
      expect: ["OWNED 축이 없다(근거 둘 미만)", `${d1} 이 Z1 이 아니다(산출물 근거 없음)`],
      must_ground: ["decided 가 비어 있다"],
      forbidden: ["근거 없이 '직접 정했다' 가 선다", "Z1"],
      gap_condition: "산출물 근거 공백(MISSING_OUTPUT_EVIDENCE 계열)이 까닭으로 선다",
      pair: { with: id("C01"), relation: "CORE_DIFFERS" },
      fixture: clone({ axes: { [d1]: all(3), [d2]: screen(3) }, checklist: {}, artifacts: {}, verify: {} }, "C04"),
    },
    {
      id: id("C05"), core, kind: "C05_ACTIVITY_OTHER_INDUSTRY",
      input: "C01 과 같은 응답 · 산업팩 · 역할팩만 다른 것",
      expect: ["Core 판정(coreOnly) 이 C01 과 같다", "산업 맥락은 다르다"],
      must_ground: ["산업 · 역할이 축 수준을 바꾸지 않는다"],
      forbidden: ["산업을 바꿨더니 묶음이 바뀐다"],
      gap_condition: "C01 과 같다",
      pair: { with: id("C01"), relation: "CORE_SAME" },
      fixture: clone({ industry: S.industries[1] ?? S.industries[0] ?? null,
        role: S.roles[1] ?? S.roles[0] ?? null }, "C05"),
    },
    {
      id: id("C06"), core, kind: "C06_REPEAT_REORDERED",
      input: "C01 과 같은 응답을 열쇠 차례만 거꾸로 적어 다시 제출",
      expect: ["스냅샷 전체(attempt_id 제외)가 C01 과 글자까지 같다"],
      must_ground: ["입력 차례가 결과를 바꾸지 않는다"],
      forbidden: ["같은 입력에서 다른 결과"],
      gap_condition: "C01 과 같다",
      pair: { with: id("C01"), relation: "FULL_SAME" },
      fixture: reversed,
    },
    {
      id: id("C07"), core, kind: "C07_PARTIAL_MISSING",
      input: `${d1} 의 심화 축 넷(J1 J2 J4 J8)에 답하지 않음 · 체크리스트는 고른 그대로`,
      expect: ["던지지 않는다", "답하지 않은 축은 확인되지 않는다", "그 축의 고르기는 did 에 들어가지 않는다"],
      must_ground: ["확인되지 않은 축의 고르기는 '후보' 로만 남는다"],
      forbidden: ["답하지 않은 축이 확인된다", "고르기만으로 축이 선다"],
      gap_condition: "스냅샷: 답하지 않은 축이 SKIPPED 로 갈린다(검사) · 결과지 빈자리에 서는가는 관찰값(gaps_d1)",
      pair: { with: id("C01"), relation: "CORE_DIFFERS" },
      fixture: partial,
    },
    {
      id: id("C08"), core, kind: "C08_TOOL_MISMATCH",
      input: `${d1} J4(방법·도구)를 \`없다\` 로 답하고 J4 체크리스트는 고름`,
      expect: ["J4 가 확인되지 않는다", "J4 고르기가 did 에 없다"],
      must_ground: ["응답과 고르기가 어긋나면 응답을 따른다"],
      forbidden: ["고른 도구만으로 J4 가 선다"],
      gap_condition: "스냅샷 empty 에 J4 가 선다(검사) · 결과지 빈자리에 서는가는 관찰값(gaps_d1)",
      pair: { with: id("C01"), relation: "CORE_DIFFERS" },
      fixture: mismatch,
    },
    {
      id: id("C09"), core, kind: "C09_SAME_MAJOR_OTHER_GOAL",
      input: "C01 과 같은 응답 · 관심 역할(role_interest)만 다름",
      expect: ["Core 판정이 C01 과 같다", "결과 모델의 역할 맥락이 다르다"],
      must_ground: ["목표는 판정에 들어가지 않는다"],
      forbidden: ["목표 직무를 바꿨더니 축 상태가 바뀐다"],
      gap_condition: "C01 과 같다",
      pair: { with: id("C01"), relation: "CORE_SAME" },
      fixture: clone({ roles: S.roles.slice(-1), role: S.roles[S.roles.length - 1] ?? null }, "C09"),
    },
    {
      id: id("C10"), core, kind: "C10_BASIC_TIER",
      input: "C01 과 같은 사람 · BASIC (선별 네 축만 묻는다)",
      expect: ["Z1 이 어디에도 없다(BASIC 은 근거가 섰다고 적지 않는다)", "심화 축이 확인되지 않는다"],
      must_ground: ["선별 축만 근거로 선다"],
      forbidden: ["BASIC 에서 Z1"],
      gap_condition: "심화 축을 빈자리로 세지 않는다(묻지 않았다)",
      fixture: clone({ tier: "BASIC", deep: [] }, "C10"),
    },
    {
      id: id("C11"), core, kind: "C11_STAGE_POSTDOC",
      input: "C01 과 같은 응답 · 학업 단계만 postdoc",
      expect: ["Core 판정이 C01 과 같다(학위가 판정을 바꾸지 않는다)"],
      must_ground: ["학위는 장면만 바꾼다"],
      forbidden: ["포닥이라서 높게 나온다"],
      gap_condition: "C01 과 같다",
      pair: { with: id("C01"), relation: "CORE_SAME" },
      fixture: clone({ stage: "postdoc", field: "STEM" as Fixture["field"] }, "C11"),
    },
  ];
}
