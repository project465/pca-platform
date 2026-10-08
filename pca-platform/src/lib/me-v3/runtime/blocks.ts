/**
 * 화면 묶음. **한 화면에 한 가지를 묻는다.**
 *
 * 예외는 영역을 훑는 자리뿐이다. 열두 영역의 관심과 경험은 **서로 견주어야**
 * 뜻이 서고, 한 영역씩 따로 띄우면 같은 질문을 열두 번 보는 줄 안다. 나머지는
 * 문항 하나가 화면 하나다: 보기 넷을 빠르게 넘기면 **오선택이 쌓인다.**
 *
 * **V1 의 흐름을 버린 까닭.** 처음에는 영역마다 관심과 경험과 학습 의향을 한
 * 화면에 묶어 열두 화면을 세웠다. 응시자가 보는 것은 `기술영역 → 관심도 /
 * 해본 적 / 배우고 싶은 정도` 의 열두 번 반복이었고, 실제 판단을 묻는 문항은
 * 서른두 화면 가운데 여덟 자리뿐이었다. 산업은 맨 뒤에 붙은 부가 묶음이었다.
 * 그래서 흐름을 이렇게 바꿨다.
 *
 *   기본 정보 → 관심 산업 고르기 → 그 산업의 장면 → 영역 두 화면으로 훑기
 *   → 공통 판단 → 학위 장면 → 실제 업무 판단 → 심화 → 근거 고르기
 *   → 관심 역할 고르기 → 역할 판단 → 산업 판단 → 경험 번역 → 완료
 *
 * 산업이 처음과 끝에 두 번 서고, 반복되는 훑기가 두 화면으로 접히고, 실제
 * 판단 문항이 선별 등급 응답의 절반을 넘는다.
 */
import type { Tier } from "../scoring/types";
import type { BankItem } from "../scoring/normalize";
import { DEEP_BLOCK, PROBE_BLOCK } from "../scoring/normalize";
import {
  BRANCH_COPY, INDUSTRY_DEEP_MAX, ROLE_SECOND_MAX, type BranchBlock,
} from "./routing";

/** 응시자가 지나는 큰 단계. 진행률의 윗칸이다 */
export const STAGES = [
  { code: "PROFILE", label: "기본 정보" },
  { code: "FIELD", label: "관심 산업" },
  { code: "EXPLORE", label: "영역 훑기" },
  { code: "JUDGE", label: "실제 판단" },
  { code: "DEEP", label: "경험 심화" },
  { code: "EVIDENCE", label: "근거 고르기" },
  { code: "PACK", label: "산업과 직무" },
  { code: "TRANSLATE", label: "경험 번역" },
  { code: "DONE", label: "완료" },
] as const;
export type StageCode = typeof STAGES[number]["code"];

export type ScreenKind =
  | "profile" | "sweep" | "single" | "pair" | "group" | "checklist" | "scene"
  | "pick-industry" | "pick-role" | "pick-org" | "transition" | "done";

export type Screen = {
  id: string;
  stage: StageCode;
  kind: ScreenKind;
  /** 작게 올리는 머리말. 무엇을 묻는 자리인지 */
  eyebrow?: string;
  /** 가운데 크기. 지금 보는 대상 */
  subject?: string;
  /** 크게. 질문 */
  question?: string;
  /** 필요할 때만 한 줄 */
  help?: string;
  /** 산업 장면처럼 읽기만 하는 자리의 본문 */
  body?: string[];
  /** 이 화면에서 받는 문항. `sweep` 은 열둘, `single` 은 하나 */
  items: string[];
  /** 체크리스트 화면이 쓰는 영역 */
  domain?: string;
  /** 산업이나 역할 팩 코드. 장면과 팩 문항이 쓴다 */
  pack?: string;
  /** 고르기 화면에서 최대 몇 개까지 */
  max?: number;
  /** 넘어가려면 답해야 하는가 */
  required: boolean;
  /**
   * 한 번 누르면 다음으로 넘어가는가.
   *
   * **한 선택으로 화면이 끝나는 자리만 참이다.** 격자와 복수 선택과 근거
   * 고르기와 직접 적는 칸은 손으로 넘긴다: 고르는 중에 화면이 넘어가면
   * 나머지를 고를 수 없다.
   */
  auto: boolean;
};

export type Plan = {
  screens: Screen[];
  /** 큰 단계마다 화면 수 */
  perStage: Record<string, number>;
};

export type PlanInput = {
  tier: Tier;
  stage: "bachelor" | "master" | "phd" | "postdoc";
  branchBlock: BranchBlock;
  /** 대학원이 타계열이면 번역 맥락 묶음을 더 받는다 */
  crossField: boolean;
  probe: string[];
  deep: string[];
  /** 고른 관심 산업. 첫째가 깊게 묻는 산업이다 */
  industryInterest: string[];
  roleInterest: string[];
  /** 격자에서 묶인 영역 둘. 비어 있으면 강제 선택을 띄우지 않는다 */
  tiedPair: string[];
  /**
   * Core 선별에서 이미 강하게 답한 (영역 · 축). `routing/strongCells` 가 센다.
   *
   * **쓰는 자리가 하나다**: 산업 판단에서 비어 있는 축을 먼저 세우는 순서.
   * 판정에는 들어가지 않는다.
   */
  strongCells?: string[];
  /** 일관성 짝을 어느 축으로 물을지. 비면 은행의 첫 짝 */
  consistAxis?: string | null;
  /**
   * 영역 훑기에서 **해 본 적이 있다고 답한** 영역.
   *
   * 선별 축의 둘째 문항은 이 영역에서만 뜬다. 한 칸에 문항을 둘 둔 까닭은
   * 체크리스트를 고르지 않은 사람도 소유까지 갈 수 있게 하려는 것인데,
   * **해 본 적이 없다고 답한 영역에서는 소유가 설 자리가 없다.** 그 영역에
   * 같은 축을 두 번 묻는 것은 `없다` 를 두 번 받는 일이다.
   *
   * 비어 있으면 거르지 않는다(옛 응시와 검사 틀).
   */
  touched?: string[];
};

/** 목록을 둘씩 묶는다. 홀수면 마지막 하나는 혼자 선다 */
function byTwo<T>(list: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += 2) out.push(list.slice(i, i + 2));
  return out;
}

/** 선별 네 축을 묻는 차례. 화면 묶기에 쓴다 */
const AX_ORDER = ["J3", "J5", "J6", "J7"] as const;

/**
 * 경험 번역 열 단계를 묶는 네 덩이.
 *
 * 단계를 줄이지 않았다. 열 단계가 그대로 있고 **한 화면에 두세 단계**를
 * 세운다: 문제와 조건 · 방법과 판단 · 결과와 검증 · 조직과 전이.
 */
const TRANS_GROUPS = [
  { key: "frame", ids: ["TR_T1", "TR_T2", "TR_T3"] as string[],
    subject: "무엇을 풀었나",
    question: "그 일의 문제와 조건을 골라주세요" },
  { key: "method", ids: ["TR_T4", "TR_T5"] as string[],
    subject: "어떻게 했나",
    question: "쓴 방법과 직접 정한 것을 골라주세요" },
  { key: "result", ids: ["TR_T6", "TR_T7", "TR_T8"] as string[],
    subject: "무엇이 남았나",
    question: "남긴 것과 확인한 방법을 골라주세요" },
  { key: "handoff", ids: ["TR_T9", "TR_T10"] as string[],
    subject: "어디에 쓰였나",
    question: "그 결과가 쓰인 자리를 골라주세요" },
] as const;

const AX_LABEL: Record<string, string> = {
  J1: "문제 정의", J2: "요구 해석", J3: "직접 판단", J4: "방법과 도구",
  J5: "산출물", J6: "비교와 검증", J7: "실패와 수정", J8: "조직 활용",
};

export type IndustryScene = {
  code: string; name: string; scene: string; demands: string[];
};

export type Deps = {
  items: BankItem[];
  domainName: (td: string) => string;
  /** 학위 장면이 붙은 문면 */
  wording: (id: string, stage: string) => string;
  /** 영역 훑기의 한 줄 */
  gridRow: (td: string) => string;
  /** 산업 장면 */
  scene: (code: string) => IndustryScene | null;
  /** 산업팩 문항의 쉬운 말 풀이 */
  gloss: (itemId: string) => string | null;
  roleName: (code: string) => string;
};

/** 등급이 겹쳐 쌓이는 차례. BASIC ⊂ STANDARD ⊂ PRO */
const TIER_RANK: Record<string, number> = { BASIC: 0, STANDARD: 1, PRO: 2 };

export function buildPlan(input: PlanInput, d: Deps): Plan {
  const { domainName, wording, gridRow } = d;
  /**
   * **등급 거름막을 한자리에 둔다.**
   *
   * 묶음마다 `tier !== "BASIC"` 을 적어 두고 있었는데, 그러면 한 묶음 안에서
   * 등급이 갈리는 문항(선별 축의 둘째 문항)을 아무도 거르지 않는다. 실제로
   * 그랬다: 둘째 문항을 STANDARD 로 올렸는데 선별 등급 응답 수가 그대로
   * 쉰넷이었다. 판정 쪽(`normalize/routedFor`)과 같은 규칙이다.
   */
  const items = d.items.filter((i) =>
    (TIER_RANK[i.tier] ?? 0) <= (TIER_RANK[input.tier] ?? 0));
  const screens: Screen[] = [];
  const add = (s: Screen) => screens.push(s);
  const byModule = (m: string) => items.filter((i) => i.module === m);

  add({
    id: "profile", stage: "PROFILE", kind: "profile", required: true, auto: false,
    eyebrow: "기본 정보",
    question: "현재 학업 단계를 골라주세요",
    help: "단계에 따라 질문 속 상황만 달라집니다. 평가 기준은 같습니다.",
    items: [],
  });

  /* ── 관심 산업. **프로필 바로 뒤다.** 산업이 검사 뒤에 붙은 부가 묶음이
        아니라 검사를 읽는 틀이라는 것을 응시자가 첫 화면에서 알아야 한다 ── */
  add({
    id: "pick-industry", stage: "FIELD", kind: "pick-industry",
    required: false, auto: false, max: 2,
    eyebrow: "관심 산업",
    question: "관심 있는 산업을 골라주세요",
    help: "최대 두 개까지 고를 수 있습니다. 아직 모르겠으면 넘어가도 됩니다.",
    items: [],
  });
  for (const code of input.industryInterest) {
    const sc = d.scene(code);
    if (!sc) continue;
    add({
      id: `scene-${code}`, stage: "FIELD", kind: "scene",
      required: false, auto: false, pack: code,
      eyebrow: "산업 장면",
      subject: sc.name,
      /* **긴 설명을 머리글로 올리지 않는다.** 장면 한 절을 제목 크기로
         세우면 다섯 줄짜리 덩이가 되고, 쉬는 자리가 읽는 자리가 된다 */
      question: `${sc.name}에서 기계공학자가 다루는 일`,
      help: sc.scene,
      body: sc.demands,
      items: [],
    });
  }

  /* ── 영역 훑기 두 화면. 열두 줄을 한 화면에서 본다 ── */
  const grid = byModule("CORE-GRID");
  const pick = (c: string) => grid.filter((i) => i.measurement_axis === c);
  add({
    id: "sweep-interest", stage: "EXPLORE", kind: "sweep", required: true, auto: false,
    eyebrow: "영역 훑기 1 / 2",
    question: "해 보고 싶은 일을 골라주세요",
    help: "열두 줄을 한 번에 봅니다. 잘 모르는 줄은 가운데를 고르면 됩니다.",
    items: pick("interest").map((i) => i.item_id),
  });
  add({
    id: "sweep-exposure", stage: "EXPLORE", kind: "sweep", required: true, auto: false,
    eyebrow: "영역 훑기 2 / 2",
    question: "해 본 적이 있는 일을 골라주세요",
    help: "수업과 실험과 캡스톤과 인턴과 연구를 모두 포함해 답해주세요.",
    items: pick("exposure").map((i) => i.item_id),
  });

  /* 묶인 영역 가르기. 묶이지 않았으면 띄우지 않는다 */
  if (input.tiedPair.length >= 2) {
    for (const i of byModule("CORE-FORCE")) {
      add({
        id: `force-${i.item_id}`, stage: "EXPLORE", kind: "single",
        required: true, auto: true,
        eyebrow: "한 가지만 더",
        question: wording(i.item_id, input.stage),
        help: "비슷하게 답하신 영역이 있어 한 가지만 더 묻습니다. 점수에는 반영되지 않습니다.",
        items: [i.item_id],
      });
    }
  }

  /* 학습 의향은 **선별된 영역에만** 묻는다 */
  const lea = pick("learning_intent")
    .filter((i) => input.probe.includes(String(i.technical_domain)));
  if (lea.length) {
    add({
      id: "sweep-learning", stage: "EXPLORE", kind: "sweep", required: false, auto: false,
      eyebrow: "배우고 싶은 정도",
      question: "지금 시간을 들여 배우고 싶은 일을 골라주세요",
      help: "자세히 보기로 한 영역만 묻습니다.",
      items: lea.map((i) => i.item_id),
    });
  }

  /* ── 공통 판단과 학위 장면 ──
        **둘씩 묶어 세운다.** 보기 넷을 쓰는 문항을 한 화면에 하나씩 띄우면
        머리말과 도움말을 열두 번 다시 읽는다. 둘이면 같은 머리말 아래에서
        이어 답한다. **응답은 줄지 않는다** */
  for (const [n, pair] of byTwo(byModule("CORE-JUDGE")).entries()) {
    add({
      id: `judge-${n + 1}`, stage: "JUDGE",
      kind: pair.length > 1 ? "pair" : "single",
      required: true, auto: pair.length === 1,
      eyebrow: "일하는 방식",
      question: pair.length > 1
        ? "해 보신 적이 있는 쪽을 골라주세요"
        : wording(pair[0].item_id, input.stage),
      items: pair.map((i) => i.item_id),
    });
  }
  /* 학위 묶음. 학위마다 다른 여섯 자리를 묻는다 */
  const bc = BRANCH_COPY[input.branchBlock];
  const branch = items.filter((x) => x.education_routing === input.branchBlock);
  for (const [n, pair] of byTwo(branch).entries()) {
    add({
      id: `branch-${n + 1}`, stage: "JUDGE",
      kind: pair.length > 1 ? "pair" : "single",
      required: false, auto: pair.length === 1,
      eyebrow: bc.eyebrow,
      question: pair.length > 1
        ? "해 보신 적이 있는 쪽을 골라주세요"
        : wording(pair[0].item_id, input.stage),
      help: n === 0 ? bc.help : undefined,
      items: pair.map((i) => i.item_id),
    });
  }
  if (input.crossField) {
    for (const i of items.filter((x) => x.education_routing === "xfield")) {
      add({
        id: `xfield-${i.item_id}`, stage: "JUDGE", kind: "single",
        required: false, auto: true,
        eyebrow: "대학원 경험",
        question: wording(i.item_id, input.stage),
        help: "이 답은 기술영역 결과에 반영되지 않습니다. 경험을 옮겨 적을 때만 씁니다.",
        items: [i.item_id],
      });
    }
  }

  /* ── 실제 업무 판단. 선별된 영역마다 네 축을 둘씩 ── */
  if (input.probe.length) {
    add({
      id: "t-judge", stage: "JUDGE", kind: "transition", required: false, auto: false,
      subject: "영역 훑기가 끝났습니다",
      question: "해 보신 영역을 실제 업무 장면으로 묻습니다",
      help: `${input.probe.map(domainName).join(" · ")}`,
      items: [],
    });
  }
  for (const td of input.probe) {
    const list = items.filter((x) => x.module === PROBE_BLOCK && x.technical_domain === td);
    /* **한 축의 두 문항을 한 화면에 세운다.** 같은 축의 서로 다른 판단
       둘이라, 나란히 읽으면 응시자가 그 축이 무엇을 묻는지 안다. 따로
       띄우면 비슷한 문장을 두 번 읽은 것으로 읽히고 화면이 배로 늘어난다.
       **응답은 줄지 않는다**: 두 문항을 그대로 받는다 */
    /* 해 본 적이 없다고 답한 영역은 축마다 하나만 묻는다 */
    const both = !input.touched || input.touched.includes(td);
    for (const ax of AX_ORDER) {
      const all = list.filter((x) => x.evidence_axis === ax);
      const cell = both ? all : all.slice(0, 1);
      if (!cell.length) continue;
      add({
        id: `probe-${td}-${ax}`, stage: "JUDGE",
        kind: cell.length > 1 ? "pair" : "single",
        required: false, auto: cell.length === 1,
        eyebrow: domainName(td),
        subject: AX_LABEL[ax] ?? "",
        question: cell.length > 1
          ? `${domainName(td)}에서 ${AX_LABEL[ax]}에 해당하는 일`
          : wording(cell[0].item_id, input.stage),
        items: cell.map((x) => x.item_id), domain: td,
      });
    }
  }

  /* ── 심화 네 축 ── */
  if (input.tier !== "BASIC" && input.deep.length) {
    add({
      id: "t-deep", stage: "DEEP", kind: "transition", required: false, auto: false,
      subject: "실제 판단을 받았습니다",
      question: "같은 영역을 남은 네 축으로 더 묻습니다",
      help: `${input.deep.map(domainName).join(" · ")}`,
      items: [],
    });
    for (const td of input.deep) {
      const list = items.filter((x) => x.module === DEEP_BLOCK && x.technical_domain === td);
      /* 심화 네 축을 둘씩 세운다. 영역 이름을 네 번 다시 읽지 않는다 */
      for (const [n, pair] of byTwo(list).entries()) {
        add({
          id: `deep-${td}-${n + 1}`, stage: "DEEP",
          kind: pair.length > 1 ? "pair" : "single",
          required: false, auto: pair.length === 1,
          eyebrow: domainName(td),
          subject: pair.map((i) => AX_LABEL[i.evidence_axis ?? ""] ?? "").join(" · "),
          question: pair.length > 1
            ? "해 보신 적이 있는 쪽을 골라주세요"
            : wording(pair[0].item_id, input.stage),
          items: pair.map((i) => i.item_id), domain: td,
        });
      }
    }
  }

  /* ── 근거 고르기. **문항을 다 받은 뒤에 묻는다**: 묻지도 않은 축의 근거를
        먼저 고르게 하면 응시자가 무엇을 고르는지 알 수 없다 ── */
  for (const td of input.probe) {
    add({
      id: `ev-${td}`, stage: "EVIDENCE", kind: "checklist", required: false, auto: false,
      eyebrow: "근거 고르기",
      subject: domainName(td),
      question: "직접 정했거나 결과물로 남긴 것을 모두 골라주세요",
      help: "해당하는 것이 없으면 비워두셔도 됩니다.",
      items: [], domain: td,
    });
  }
  /* **일관성은 한 짝만 묻는다.** 두 짝을 다 물으면 네 화면이 되는데, 이
     묶음이 내놓는 것은 응답과 근거의 어긋남 하나뿐이라 짝 하나로 선다.
     어느 짝을 물을지는 Core 에서 덜 확인된 축이 정한다 */
  if (input.tier !== "BASIC") {
    const cn = byModule("CONSIST");
    const axis = input.consistAxis ?? cn[0]?.evidence_axis ?? "J3";
    const pair = cn.filter((i) => i.evidence_axis === axis);
    if (pair.length) {
      add({
        id: `consist-${axis}`, stage: "EVIDENCE", kind: "pair",
        required: false, auto: false,
        eyebrow: "경험 확인",
        question: "두 자리에서 같은 일을 해 보셨는지 묻습니다",
        items: pair.map((i) => i.item_id),
      });
    }
  }

  /* ── 관심 역할과 선호 조직. **Core 심화 뒤다**: 앞에 두면 고른 역할이
        기술영역 판정을 끌고 간다고 읽힌다 ── */
  add({
    id: "pick-role", stage: "PACK", kind: "pick-role", required: false, auto: false, max: 2,
    eyebrow: "관심 직무",
    question: "어떤 일을 더 자세히 보고 싶나요?",
    help: "최대 두 개까지 고를 수 있습니다. 앞의 결과는 그대로 둡니다.",
    items: [],
  });
  add({
    id: "pick-org", stage: "PACK", kind: "pick-org", required: false, auto: false, max: 2,
    eyebrow: "일하고 싶은 곳",
    question: "어떤 조직에서 일하는 모습이 더 그려지나요?",
    help: "최대 두 개까지 고를 수 있습니다. 점수에는 쓰이지 않고 결과를 읽는 순서만 정합니다.",
    items: [],
  });
  if (input.tier !== "BASIC") {
    for (const [n, code] of input.roleInterest.entries()) {
      const all = items.filter((x) =>
        x.module === "ROLE" && x.item_id.startsWith(`${code}_`));
      /* 둘째 역할은 **PRO 에서만** 앞머리 셋을 묻는다. 견주기 위한
         자리이고, STANDARD 에서 둘을 똑같이 묻으면 응답이 열 늘어난다 */
      const list = n === 0 ? all
        : input.tier === "PRO" ? all.slice(0, ROLE_SECOND_MAX) : [];
      if (!list.length) continue;
      for (const i of list) {
        add({
          id: `role-${i.item_id}`, stage: "PACK", kind: "single",
          required: false, auto: true, pack: code,
          eyebrow: d.roleName(code),
          subject: AX_LABEL[i.evidence_axis ?? ""] ?? "",
          question: wording(i.item_id, input.stage),
          items: [i.item_id],
        });
      }
    }
  }

  /* ── 산업 판단. PRO 에서 고른 산업 하나를 깊게 ── */
  const deepIndustry = input.tier === "PRO" ? input.industryInterest[0] : undefined;
  if (deepIndustry) {
    const pool = items.filter((x) =>
      x.module === "INDUSTRY" && x.item_id.startsWith(`${deepIndustry}_`));
    /* **비어 있는 축을 먼저 세운다.** Core 에서 이미 강하게 답한 축을 그
       산업 말로 한 번 더 묻는 것은 같은 판단을 표현만 바꿔 되묻는 일이다.
       순서만 바꾸고 판정은 바꾸지 않는다 */
    const strong = new Set(input.strongCells ?? []);
    const list = [...pool]
      .sort((a, b) => {
        const k = (x: BankItem) => strong.has(`${x.technical_domain}.${x.evidence_axis}`) ? 1 : 0;
        return k(a) - k(b);
      })
      .slice(0, INDUSTRY_DEEP_MAX);
    const sc = d.scene(deepIndustry);
    if (list.length) {
      add({
        id: "t-industry", stage: "PACK", kind: "transition", required: false, auto: false,
        subject: `${sc?.name ?? ""} 쪽을 더 봅니다`,
        question: "그 산업에서 실제로 달라지는 판단을 묻습니다",
        help: "산업 용어를 모르셔도 됩니다. 질문마다 쉬운 말로 다시 적어 둡니다.",
        items: [],
      });
    }
    for (const i of list) {
      add({
        id: `ind-${i.item_id}`, stage: "PACK", kind: "single",
        required: false, auto: true, pack: deepIndustry,
        eyebrow: sc?.name ?? "산업 판단",
        subject: AX_LABEL[i.evidence_axis ?? ""] ?? "",
        question: wording(i.item_id, input.stage),
        help: d.gloss(i.item_id) ?? undefined,
        items: [i.item_id],
      });
    }
  }

  /* ── 경험 번역 ── */
  if (input.tier === "PRO") {
    add({
      id: "t-trans", stage: "TRANSLATE", kind: "transition", required: false, auto: false,
      subject: "경험 번역을 시작합니다",
      question: "연구나 프로젝트 하나를 떠올려주세요",
      help: "열 단계로 나누어 묻습니다. 직접 적는 칸은 건너뛰어도 됩니다.",
      items: [],
    });
    /* **열 단계를 열 화면으로 띄우지 않는다.** 한 경험을 열 번 끊어 물으면
       응시자가 매번 그 경험을 처음부터 떠올린다. 네 덩이로 묶으면 같은
       경험을 한 자리에서 이어 적는다. **단계는 그대로 열이다** */
    const trans = byModule("TRANS-10");
    for (const g of TRANS_GROUPS) {
      const list = trans.filter((i) => g.ids.includes(i.item_id));
      if (!list.length) continue;
      add({
        id: `trans-${g.key}`, stage: "TRANSLATE", kind: "group",
        required: false, auto: false,
        eyebrow: "경험 번역",
        subject: g.subject,
        question: g.question,
        items: list.map((i) => i.item_id),
      });
    }
    const target = byModule("TARGET");
    if (target.length) {
      add({
        id: "target", stage: "TRANSLATE", kind: "group",
        required: false, auto: false,
        eyebrow: "목표",
        question: "지금 보고 있는 방향을 골라주세요",
        help: "결과에서 이 선택과 확인된 근거를 나란히 놓고 봅니다.",
        items: target.map((i) => i.item_id),
      });
    }
  }

  add({
    id: "done", stage: "DONE", kind: "done", required: false, auto: false,
    subject: "응답이 모두 끝났습니다", question: "결과를 만들 준비가 됐습니다",
    items: [],
  });

  const perStage: Record<string, number> = {};
  for (const s of screens) perStage[s.stage] = (perStage[s.stage] ?? 0) + 1;
  return { screens, perStage };
}
