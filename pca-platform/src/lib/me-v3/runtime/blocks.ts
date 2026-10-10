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
  /**
   * 다음 묶음으로 넘어왔다는 것을 **질문 위 한 줄**로 적는 자리(규격 §12).
   *
   * 전에는 묶음이 바뀔 때마다 전환 화면을 한 장 세웠다. 그 가운데 셋은
   * 담은 것이 `이제 ~를 묻습니다` 한 줄과 영역 이름 목록뿐이었고, 영역
   * 이름은 **바로 다음 화면의 머리말에 다시 적혀 있었다.** 읽을 것이 없는
   * 화면에 `계속` 을 누르게 하면 그 누름이 세 번 늘고, 응시자는 그것을
   * 검사가 길어진 것으로 센다.
   *
   * 그래서 그 셋을 걷고 **첫 질문 위에 맥락 한 줄**로 얹는다. 묶음 안의
   * 둘째 화면부터는 이 줄이 없다: 매 화면에 세우면 그것이 질문 다음으로
   * 큰 덩이가 된다.
   *
   * **걷지 않은 전환 화면이 둘 있다.** 대학원 경험을 왜 묻는지(`t-xfield`)와
   * 하나의 경험을 네 화면에 나누어 묻는다는 것(`t-trans`)은 한 줄로
   * 줄이면 뜻이 사라진다. 앞엣것이 없으면 응시자가 그 질문을 자기를
   * 걸러내는 것으로 읽고, 뒷엣것이 없으면 네 화면에서 서로 다른 경험을
   * 떠올려 적는다.
   */
  strip?: string;
  /** 산업 장면처럼 읽기만 하는 자리의 본문 */
  body?: string[];
  /**
   * 전환 화면이 `이 다음에 무엇을 보는가` 를 적는 자리.
   *
   * 영역 이름 셋을 가운뎃점으로 이어 한 줄로 두었더니 그 줄이 설명문처럼
   * 읽혔다. 칩으로 깔면 **목록이라는 것이 모양으로 읽히고** 줄 수가
   * 늘지 않는다. 읽기만 하는 자리라 고를 수 없다.
   */
  chips?: string[];
  /**
   * 본문을 묶어서 내놓는 자리.
   *
   * 산업이 둘이면 여덟 줄이 한 목록으로 섰고, 줄마다 `반도체 — ` 가
   * 붙어서 같은 말이 넷씩 되풀이됐다. 묶음으로 내놓으면 산업 이름을
   * 머리에 한 번 적고 줄은 그 아래로 깔린다.
   */
  sections?: { name: string; lines: string[] }[];
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

/* 여덟 축의 **재는 이름**은 결과를 되짚는 자리(축 이름 · 운영 표)에만
   남는다. 응시 화면에는 아래 `AX_ASK` 가 선다(규격 §12·§34) */

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

/**
 * 한 화면에 문항이 둘일 때의 머리글.
 *
 * **`해 보신 적이 있는 쪽을 골라주세요` 로 두지 않는다.** `쪽` 은 둘 중
 * 하나를 고르라는 말로 읽히는데 실제로는 **둘에 각각 답하는 화면**이다.
 * 그리고 각 상자에는 그 문항의 문면이 질문으로 선다(`page.tsx` 가
 * 문항이 둘 이상인 화면에 줄을 준다). 머리글은 그 둘을 묶는 틀이다.
 *
 * **한 벌로 두지 않는다.** `아래 두 가지에 각각 답해주세요` 가 실제 판단
 * 스무 화면에 그대로 섰고, 그러면 가장 큰 글씨가 쪽마다 같은 말을 한다.
 * 묶는 틀을 **그 화면이 묻는 자리의 말**로 적고, 답하는 법은 작은 줄에
 * 한 번만 둔다.
 */
/**
 * 여덟 축이 사람의 말로 묻는 것.
 *
 * 축 이름(`직접 판단`)은 무엇을 재는지를 말하고, 이 줄은 **무엇을
 * 떠올려야 하는지**를 말한다. 큰 글씨 자리에는 뒤엣것이 선다.
 */
const AX_ASK: Record<string, string> = {
  J1: "무엇을 풀 문제로 잡으셨는지",
  J2: "요구를 어떻게 읽으셨는지",
  J3: "무엇을 직접 정하셨는지",
  J4: "어떤 방법과 도구로 하셨는지",
  J5: "무엇이 남았는지",
  J6: "무엇과 맞춰 보셨는지",
  J7: "틀어졌을 때 어떻게 고치셨는지",
  J8: "그 결과가 어디에 쓰였는지",
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
  /**
   * 고른 산업의 장면. **한 화면에 모은다.**
   *
   * 전에는 산업마다 화면을 하나씩 세웠다. 읽는 것은 각각 네 줄인데
   * 화면이 둘이 되어, 넘기는 사람에게는 같은 모양이 두 번 나온다. 둘을
   * 나란히 두면 **견주면서** 읽히고 그것이 이 자리가 있는 까닭이다
   * (고른 산업을 Core 문항 앞에서 이해시키는 전환 자리).
   *
   * **점수를 만들지 않는다**: `items` 가 비어 있고 읽기만 한다. 그래서
   * 화면을 합쳐도 받는 응답이 한 줄도 줄지 않는다.
   */
  const scenes = input.industryInterest
    .map((code) => ({ code, sc: d.scene(code) }))
    .filter((x): x is { code: string; sc: NonNullable<ReturnType<Deps["scene"]>> } => !!x.sc);
  if (scenes.length) {
    add({
      id: "scene", stage: "FIELD", kind: "scene",
      required: false, auto: false,
      pack: scenes[0].code,
      eyebrow: "관심 산업",
      question: scenes.length > 1
        ? "고른 두 산업에서 기계공학자가 다루는 일"
        : `${scenes[0].sc.name}에서 기계공학자가 다루는 일`,
      help: "이 틀을 가지고 다음 질문을 읽으시면 됩니다.",
      /* **산업마다 카드 하나이고 줄은 셋까지다**(규격 §6).
         앞 판본은 산업 설명 한 문단(`scene`)을 큰 글씨 아래에 깔고 그
         아래에 요구 네 줄을 세워서, 고르기만 하면 되는 자리가 읽을거리
         두 덩이가 됐다. 설명 문단을 걷고 줄을 셋으로 끊으면 두 산업이
         **나란히 견주어진다**: 이 자리가 있는 까닭이 그것이다.
         줄마다 산업 이름을 다시 적지 않는다: 같은 말이 셋씩 되풀이된다 */
      sections: scenes.map((x) => ({ name: x.sc.name, lines: x.sc.demands.slice(0, 3) })),
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
    /**
     * **두 화면이 같은 보기를 다시 내므로 무엇이 다른지 적는다.**
     *
     * 앞 화면은 `먼저 해 본다면`, 뒤 화면은 `더 알아보고 싶은`이다. 둘은
     * 서로 다른 것을 묻지만 보기가 같아서, 같은 머리말과 같은 도움말을
     * 달아 두면 응시자는 `방금 골랐는데 왜 또 묻지` 로 읽는다.
     *
     * **`점수에는 반영되지 않습니다` 를 쓰지 않는다.** CareerMatri 는
     * 총점을 내는 서비스가 아닌데 점수를 입에 올리면 점수가 있다고
     * 느끼게 된다. 그 자리에 **무엇에 쓰는 답인지**를 적는다.
     */
    const FORCE_COPY: Record<string, { eyebrow: string; help: string }> = {
      CF_PAIR_1: {
        eyebrow: "먼저 해 볼 쪽",
        help: "비슷하게 답하신 두 영역입니다. 먼저 직접 해 본다면 어느 쪽인지 골라주세요.",
      },
      CF_PAIR_2: {
        eyebrow: "더 알아보고 싶은 쪽",
        help: "앞 질문과 별개입니다. 해 보는 것과 상관없이 지금 더 알아보고 싶은 쪽을 골라주세요.",
      },
    };
    for (const i of byModule("CORE-FORCE")) {
      const c = FORCE_COPY[i.item_id];
      add({
        id: `force-${i.item_id}`, stage: "EXPLORE", kind: "single",
        required: true, auto: true,
        eyebrow: c?.eyebrow ?? "한 가지만 더",
        question: wording(i.item_id, input.stage),
        help: c?.help ?? "비슷하게 답하신 두 영역을 한 번만 더 가릅니다.",
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
        ? "일을 맡으면 어떻게 하시는 편인지"
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
      /* 학위마다 묻는 자리가 다르므로 묶는 틀도 다르다 */
      question: pair.length > 1
        ? bc.ask
        : wording(pair[0].item_id, input.stage),
      help: n === 0 ? bc.help : undefined,
      items: pair.map((i) => i.item_id),
    });
  }
  if (input.crossField) {
    const xf = items.filter((x) => x.education_routing === "xfield");
    /* **넷을 왜 묻는지 먼저 적는다.** 앞 판본은 설명 없이 네 문항을
       띄웠다. 기계공학 질문을 받다가 갑자기 대학원 분야를 묻는 화면이
       나오면, 응시자는 그것이 자기를 걸러내는 질문인 줄 안다. 실제로는
       반대다: 이 Core 를 받을 수 있게 하려고 묻는 자리다 */
    if (xf.length) {
      add({
        id: "t-xfield", stage: "JUDGE", kind: "transition",
        required: false, auto: false,
        eyebrow: "대학원 경험",
        question: "대학원 경험을 따로 확인합니다",
        help: "이 전공을 받으실 수 있게 하려고 묻는 자리입니다.",
        chips: ["다룬 분야", "옮겨 쓸 수 있는 방법", "기계공학 작업 시점",
                "학부에서 깊게 간 작업"],
        items: [],
      });
    }
    for (const i of xf) {
      add({
        id: `xfield-${i.item_id}`, stage: "JUDGE", kind: "single",
        required: false, auto: true,
        eyebrow: "대학원 경험",
        question: wording(i.item_id, input.stage),
        help: "적어 주신 내용은 경험을 직무 언어로 옮길 때 씁니다.",
        items: [i.item_id],
      });
    }
  }

  /* ── 실제 업무 판단. 선별된 영역마다 네 축을 둘씩 ──
     **전환 화면을 세우지 않는다**(규격 §12). `이제 실제 경험을
     확인합니다` 와 영역 이름 목록뿐이었고, 그 이름은 바로 다음 화면의
     머리말에 다시 적혀 있었다. 첫 질문 위에 한 줄로 얹는다 */
  let judgeStrip: string | null = input.probe.length
    ? `영역 훑기를 마쳤습니다. 여기서부터 ${input.probe.map(domainName).join(" · ")}`
      + `에서 실제로 해 보신 일을 묻습니다`
    : null;
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
        /* **영역은 머리말에 한 번만 적는다.** 한동안 머리말에 영역을 적고
           그 아래에 축 이름(`산출물`)을 적고 큰 글씨에 영역을 또 적었다.
           같은 말이 한 화면에 두 번 서고, 그 사이에 **우리가 무엇을 재는지
           가리키는 이름**이 끼었다. 응시자가 읽어야 하는 것은 자기 경험을
           떠올릴 틀이지 우리 분류가 아니다(규격 §12·§34) */
        eyebrow: domainName(td),
        question: cell.length > 1
          ? (AX_ASK[ax] ?? "어떻게 하셨는지")
          : wording(cell[0].item_id, input.stage),
        /* 묶음의 첫 질문에만 얹는다. 매 화면에 세우면 그 줄이 질문
           다음으로 큰 덩이가 된다 */
        ...(judgeStrip ? { strip: judgeStrip } : {}),
        items: cell.map((x) => x.item_id), domain: td,
      });
      judgeStrip = null;
    }
  }

  /* ── 심화 네 축 ── 같은 까닭으로 전환 화면을 걷었다 */
  if (input.tier !== "BASIC" && input.deep.length) {
    let deepStrip: string | null =
      `같은 영역을 조금 더 묻습니다. 남은 자리를 채우는 질문입니다`;
    for (const td of input.deep) {
      const list = items.filter((x) => x.module === DEEP_BLOCK && x.technical_domain === td);
      /* 심화 네 축을 둘씩 세운다. 영역 이름을 네 번 다시 읽지 않는다 */
      for (const [n, pair] of byTwo(list).entries()) {
        add({
          id: `deep-${td}-${n + 1}`, stage: "DEEP",
          kind: pair.length > 1 ? "pair" : "single",
          required: false, auto: pair.length === 1,
          eyebrow: domainName(td),
          question: pair.length > 1
            ? pair.map((i) => AX_ASK[i.evidence_axis ?? ""] ?? "").filter(Boolean).join(" · ")
            : wording(pair[0].item_id, input.stage),
          ...(deepStrip ? { strip: deepStrip } : {}),
          items: pair.map((i) => i.item_id), domain: td,
        });
        deepStrip = null;
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
    /* **전환 화면을 걷었다**(규격 §12). 담은 것이 `이 산업에서 달라지는
       판단을 묻습니다` 한 줄과 `용어를 모르셔도 됩니다` 한 줄이었고,
       뒷엣것은 **질문마다 쉬운 말이 이미 붙어 있어서** 거기서 바로
       확인된다. 첫 질문 위에 한 줄로 얹는다 */
    let indStrip: string | null = list.length
      ? `${sc?.name ?? "고르신 산업"} 쪽에서 달라지는 판단을 묻습니다.`
        + ` 용어를 모르셔도 질문마다 쉬운 말을 같이 적어 둡니다`
      : null;
    for (const i of list) {
      add({
        id: `ind-${i.item_id}`, stage: "PACK", kind: "single",
        required: false, auto: true, pack: deepIndustry,
        eyebrow: sc?.name ?? "산업 판단",
        question: wording(i.item_id, input.stage),
        help: d.gloss(i.item_id) ?? undefined,
        ...(indStrip ? { strip: indStrip } : {}),
        items: [i.item_id],
      });
      indStrip = null;
    }
  }

  /* ── 경험 번역 ── */
  if (input.tier === "PRO") {
    add({
      id: "t-trans", stage: "TRANSLATE", kind: "transition", required: false, auto: false,
      eyebrow: "경험 번역",
      question: "연구나 프로젝트 하나를 떠올려주세요",
      help: "그 하나를 네 화면에 나누어 묻습니다.",
      chips: ["문제와 조건", "쓴 방법", "남긴 것", "쓰인 자리"],
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
    eyebrow: "응답 완료", question: "결과를 만들 준비가 됐습니다",
    items: [],
  });

  const perStage: Record<string, number> = {};
  for (const s of screens) perStage[s.stage] = (perStage[s.stage] ?? 0) + 1;
  return { screens, perStage };
}
