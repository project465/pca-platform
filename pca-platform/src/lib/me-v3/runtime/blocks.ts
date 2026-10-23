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
  branchCopy, INDUSTRY_DEEP_MAX, ROLE_SECOND_MAX, type BranchBlock,
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

/**
 * 단계가 바뀔 때 **왜 묻는 방식이 달라지는지** 한 줄로 잇는다
 * (GOLD MASTER §3).
 *
 * 관심을 묻는 자리와 해 본 일을 묻는 자리와 남긴 것을 고르는 자리는
 * 재는 것이 달라서 응답 방식도 다르다. 그 자체는 맞는 설계인데, 아무
 * 말 없이 화면만 바뀌면 응시자는 **갑자기 다른 검사가 시작됐다**고
 * 읽는다. 그래서 그 단계의 **첫 화면에만** 한 줄이 선다.
 *
 * **없는 단계를 지어내지 않는다.** 여기 적힌 것은 전부 `STAGES` 에
 * 이미 있는 자리이고, routing 이 그 단계를 열지 않으면 그 줄도 서지
 * 않는다. 문항과 보기와 저장되는 값은 한 글자도 바뀌지 않는다.
 */
/*
 * **세 줄이 잇달아 `먼저` 로 시작하지 않는다.** 그리고 채점 쪽 설명(`같은
 * 판단을 한 번 더`)과 사실이 아닌 말(`마지막으로` 뒤에 직무·산업·번역이
 * 남는다)을 적지 않는다. 스무 Core 가 함께 읽으므로 전공 이름을 적지 않는다.
 */
export const STAGE_LEAD: Record<StageCode, string> = {
  PROFILE: "먼저 지금 학업 단계부터 확인할게요.",
  FIELD: "관심 있는 산업을 고르면, 그 산업에서 전공자가 하는 일을 보여 드립니다.",
  EXPLORE: "어떤 일을 해 보고 싶은지, 해 본 적은 있는지 가볍게 훑어보겠습니다.",
  JUDGE: "이제 실제로 해 본 일을 여쭙겠습니다.",
  DEEP: "해 보신 일을 조금 더 자세히 여쭙겠습니다.",
  EVIDENCE: "해 봤다고 답한 일을 영역마다 짚어 보겠습니다.",
  PACK: "고르신 직무와 산업에서 자주 하는 일을 여쭙겠습니다.",
  TRANSLATE: "경험 하나를 골라 지원서에 쓸 수 있게 정리해 봅니다.",
  DONE: "",
};

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
   * 질문에 든 **그 전공의 말 하나를 쉬운 말로 받치는 줄**(규격 §5).
   *
   * **`help` 와 한 칸에 담지 않는다.** 둘은 하는 일이 다르다: `help` 는
   * 답하는 법을 적는 안내이고 이것은 낱말의 뜻이다. 한 칸에 담아 두었더니
   * `무엇이 남았는지`(여덟 자) 아래에 `복잡도 — 입력이 늘 때 …`(서른일곱
   * 자)가 서서, **설명문이 질문보다 센 자리**를 세는 검사가 멀쩡한 받침을
   * 예순세 자리나 걸었다. 재는 자가 틀린 것이 아니라 두 글이 한 칸에
   * 들어 있던 것이 틀렸다.
   */
  term?: string;
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
  /**
   * 선별·심화에서 `내가 했다` 이상으로 답한 (영역 · 축).
   *
   * 근거 고르기는 이 칸에서만 판정에 들어간다: 소유는 `내가 정했다` 와
   * 근거 둘이 함께 서야 하고, 산출물 근거는 산출물 축이 확인일 때만 본다.
   * 그래서 **이 칸이 하나도 없는 영역은 근거 화면을 세우지 않는다.**
   * 해 본 적 없다고 답한 판단의 근거를 열 묶음씩 고르게 하면 그 화면이
   * 검사에서 가장 긴 쪽이 되고 판정은 한 글자도 바뀌지 않는다.
   *
   * 비어 있으면 거르지 않는다(가장 긴 경우를 세는 `estimate` 와 옛 응시).
   */
  didCells?: string[];
};

/** 목록을 둘씩 묶는다. 홀수면 마지막 하나는 혼자 선다 */
function byTwo<T>(list: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += 2) out.push(list.slice(i, i + 2));
  return out;
}

/**
 * 영역 훑기를 **넷씩 끊는다**(COMMERCIAL GOLD MASTER §5 · §6).
 *
 * 열둘을 한 화면에 쌓으면 그 화면이 `문장 + 보기 + 모르겠다` 가 열두 번
 * 되풀이되는 설문표가 된다. 넷이면 질문이 크게 서고 보기가 **낱말로**
 * 설 자리가 생기며, 손전화에서도 한 화면에 들어온다. **서로 견주는
 * 값은 그대로다**: 넷 안에서 견주고, 묻는 문항과 저장되는 값과 차례는
 * 한 글자도 바뀌지 않는다.
 */
function byFour<T>(list: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += 4) out.push(list.slice(i, i + 4));
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
    question: "그 경험에서 풀려던 문제와 상황을 골라 주세요" },
  { key: "method", ids: ["TR_T4", "TR_T5"] as string[],
    subject: "어떻게 했나",
    question: "쓴 방법과 직접 정한 것을 골라주세요" },
  { key: "result", ids: ["TR_T6", "TR_T7", "TR_T8"] as string[],
    subject: "무엇이 남았나",
    question: "남은 결과물과 결과를 확인한 방법을 골라 주세요" },
  { key: "handoff", ids: ["TR_T9", "TR_T10"] as string[],
    subject: "어디에 썼나",
    question: "그 결과를 어디에 썼는지 골라 주세요" },
] as const;

/* 여덟 축의 **재는 이름**은 결과를 되짚는 자리(축 이름 · 운영 표)에만
   남는다. 응시 화면에는 아래 `CORE_COPY` 의 주제가 선다(규격 §12·§34) */

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
  /**
   * 그 전공의 말에 붙는 쉬운 말 한 줄.
   *
   * 산업팩의 `gloss` 와 하는 일이 같고 **적는 자리가 다르다**: 저쪽은
   * 문항마다 적고 이쪽은 말마다 적는다(`content/me-v3-terms.json`). 같은
   * 말이 문항 여덟 자리에 서는데 여덟 번 따로 적으면 그 가운데 하나가
   * 어긋난다. **판정에 들어가지 않는다**: 화면의 한 줄이다
   */
  termGloss: (text: string) => string | null;
  roleName: (code: string) => string;
  /**
   * 그 전공의 이름. 등록부의 `name_ko` 를 그대로 받는다.
   *
   * **이 파일에 전공 이름을 글자로 적지 않는다.** 산업 장면의 큰 글씨가
   * `기계공학자` 를 박아 두고 있었고, 그래서 **스무 Core 전부**가 관심
   * 산업을 고른 바로 다음 화면에서 기계공학 문맥을 받았다. 경영학과
   * 학생이 `고른 두 산업에서 기계공학자가 다루는 일` 을 읽은 자리가
   * 이것이다. `ME_CORE` 로 떨어진 것이 아니라 **떨어질 자리가 없었다**:
   * `core_code` 도 세션 복구도 멀쩡했고 문구만 상수였다.
   *
   * 받아 오는 쪽으로 고치면 Core 를 하나 더 만드는 일이 이 파일을 고치는
   * 일이 되지 않는다(`result/chains.ts` 에서 영역 코드를 공통 층에 박아
   * 두어 전기전자 응시자에게 기계공학 작성 차례가 나간 것과 같은 종류다).
   */
  majorName: string;
  /**
   * 그 Core 의 코드. **화면 글을 Core 마다 갈라 적는 자리만 읽는다**
   * (`CORE_COPY` · `branchCopy`). 비어 있으면 공통 글이 선다.
   */
  core?: string;
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
/*
 * **큰 글씨에 반쪽 문장을 두지 않는다.** 전에는 `무엇을 직접 정하셨는지`
 * 처럼 `~인지` 로 끝나는 말이 화면에서 가장 큰 글씨였다. 바로 아래에
 * 진짜 질문이 둘 서므로 여기는 **주제만** 짧게 적는다.
 *
 * **Core 마다 갈라 든다.** 스무 Core 가 함께 읽는 공통 글을 두고, 그
 * 전공의 근거가 다른 말을 쓰는 칸만 `CORE_COPY` 가 바꾼다(경영의 J2 는
 * 목표를 숫자로 바꾸는 일이다).
 */
type CoreCopy = {
  /** 한 화면에 문항이 둘일 때 축마다 서는 주제 */
  pairAsk: Record<string, string>;
  /** 심화의 짝(`J1+J2`)마다 서는 이름. 두 주제를 가운뎃점으로 잇지 않는다 */
  deepPair: Record<string, string>;
  /** 경험 횟수 훑기의 도움말. 그 전공에서 해 봤을 만한 자리 */
  exposureHelp: string;
};
const COPY_DEFAULT: CoreCopy = {
  pairAsk: {
    J1: "풀 문제와 범위 정하기",
    J2: "요구를 조건으로 바꾸기",
    J3: "직접 정해 본 것",
    J4: "쓴 방법과 도구",
    J5: "남긴 결과물",
    J6: "비교하고 확인한 것",
    J7: "잘 안 됐을 때",
    J8: "결과가 쓰인 곳",
  },
  deepPair: {
    "J1+J2": "풀 문제와 요구 정하기",
    "J4+J8": "쓴 방법과 결과가 쓰인 곳",
  },
  exposureHelp: "수업, 실습, 동아리, 아르바이트에서 해 본 것도 넣어 주세요.",
};
const CORE_COPY: Record<string, {
  pairAsk?: Partial<Record<string, string>>;
  deepPair?: Partial<Record<string, string>>;
  exposureHelp?: string;
}> = {
  BIZ_CORE_V1: {
    pairAsk: { J1: "범위 정하기", J2: "목표를 숫자로 바꾸기", J4: "쓴 방법" },
    deepPair: { "J1+J2": "범위와 목표 정하기" },
    exposureHelp: "수업, 동아리, 공모전, 아르바이트에서 해 본 것도 넣어 주세요.",
  },
};
function copyOf(core?: string): CoreCopy {
  const c = core ? CORE_COPY[core] : undefined;
  return {
    pairAsk: { ...COPY_DEFAULT.pairAsk, ...(c?.pairAsk ?? {}) } as Record<string, string>,
    deepPair: { ...COPY_DEFAULT.deepPair, ...(c?.deepPair ?? {}) } as Record<string, string>,
    exposureHelp: c?.exposureHelp ?? COPY_DEFAULT.exposureHelp,
  };
}

/** 고른 영역 수를 글로 적는다. `3가지` 보다 `세 가지` 가 읽힌다 */
const KO_COUNT = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];

/** 등급이 겹쳐 쌓이는 차례. BASIC ⊂ STANDARD ⊂ PRO */
const TIER_RANK: Record<string, number> = { BASIC: 0, STANDARD: 1, PRO: 2 };

export function buildPlan(input: PlanInput, d: Deps): Plan {
  const { domainName, wording, gridRow, majorName } = d;
  const cc = copyOf(d.core);
  const grad = input.stage !== "bachelor";
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
    help: "단계에 따라 질문 속 상황만 바뀌고, 결과를 보는 기준은 같습니다.",
    items: [],
  });

  /* ── 관심 산업. **프로필 바로 뒤다.** 산업이 검사 뒤에 붙은 부가 묶음이
        아니라 검사를 읽는 틀이라는 것을 응시자가 첫 화면에서 알아야 한다 ── */
  add({
    id: "pick-industry", stage: "FIELD", kind: "pick-industry",
    required: false, auto: false, max: 2,
    eyebrow: "관심 산업",
    question: "관심 있는 산업을 골라주세요",
    help: "두 개까지 고를 수 있습니다. 아직 모르겠으면 넘어가셔도 됩니다.",
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
        ? `고른 두 산업에서 ${majorName} 전공자가 다루는 일`
        : `${scenes[0].sc.name}에서 ${majorName} 전공자가 다루는 일`,
      help: "다음 질문에 답하실 때 참고해 주세요.",
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
  /**
   * **넷씩 끊어 세운다**(§5). 머리말과 질문은 묶음마다 같고 **도움말은
   * 첫 묶음에만** 적는다: 같은 두 줄을 세 번 읽히면 그것이 곧 설문지의
   * 되풀이다. 묶음이 하나뿐이면 번호를 붙이지 않는다.
   *
   * **머리말에 큰 질문을 다시 적지 않는다.** `해 보고 싶은 일 1 / 3` 과
   * `해 보고 싶은 일을 골라주세요` 를 위아래로 세우면 같은 말이 두 번
   * 선다. 머리말은 지금 어느 축을 묻는지만 짧게 든다.
   */
  const sweeps = (
    id: string, eyebrow: string, question: string, help: string,
    ids: string[], required: boolean,
  ): void => {
    const gs = byFour(ids);
    gs.forEach((g, k) => add({
      id: gs.length > 1 ? `${id}-${k + 1}` : id,
      stage: "EXPLORE", kind: "sweep", required, auto: false,
      eyebrow: gs.length > 1 ? `${eyebrow} ${k + 1} / ${gs.length}` : eyebrow,
      question,
      help: k === 0 ? help : "",
      items: g,
    }));
  };
  /* **안내가 질문보다 세지 않게 한 줄로 줄였다**(규격: 긴 안내는 접거나
     제거). 그리고 전에 적혀 있던 `잘 모르는 줄은 가운데를 고르면 됩니다`
     는 **보기에 있는 `잘 모르겠다` 와 어긋나는 말**이었다: 그대로 두면
     아직 모르는 사람이 `보통` 으로 적힌다 */
  /* 한 일을 고르는 화면이 아니라 **줄마다 칸을 고르는** 화면이라, 질문도
     그렇게 적는다 */
  sweeps("sweep-interest", "관심", "각 일을 얼마나 해 보고 싶은지 골라 주세요",
    "무슨 일인지 잘 모르겠으면 ‘모르겠다’를 누르세요.",
    pick("interest").map((i) => i.item_id), true);
  sweeps("sweep-exposure", "해 본 횟수", "각 일을 몇 번이나 해 봤는지 골라 주세요",
    cc.exposureHelp,
    pick("exposure").map((i) => i.item_id), true);

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
        help: "두 일에 비슷하게 답하셨습니다. 하나만 먼저 해 볼 수 있다면 어느 쪽일까요?",
      },
      CF_PAIR_2: {
        eyebrow: "더 알아보고 싶은 쪽",
        help: "이번에는 해 보는 것과 상관없이, 더 알아보고 싶은 쪽을 골라 주세요.",
      },
    };
    for (const i of byModule("CORE-FORCE")) {
      const c = FORCE_COPY[i.item_id];
      add({
        id: `force-${i.item_id}`, stage: "EXPLORE", kind: "single",
        required: true, auto: true,
        eyebrow: c?.eyebrow ?? "한 가지만 더",
        question: wording(i.item_id, input.stage),
        help: c?.help ?? "두 일에 비슷하게 답하셔서 하나만 더 여쭙겠습니다.",
        items: [i.item_id],
      });
    }
  }

  /* 학습 의향은 **선별된 영역에만** 묻는다 */
  const lea = pick("learning_intent")
    .filter((i) => input.probe.includes(String(i.technical_domain)));
  if (lea.length) {
    sweeps("sweep-learning", "배우고 싶은 정도",
      "지금 시간을 내서 배워 보고 싶은 정도를 골라 주세요",
      "앞의 답을 보고 몇 가지만 다시 여쭙니다.",
      lea.map((i) => i.item_id), false);
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
      /* **묻는 것은 해 본 경험이다.** 머리글이 성향(`~하는 편인지`)을
         물으면 문항과 머리글이 다른 것을 묻는다 */
      eyebrow: "공통 질문",
      question: pair.length > 1
        ? (grad ? "과제와 연구에서 해 본 일" : "과제와 팀 활동에서 해 본 일")
        : wording(pair[0].item_id, input.stage),
      items: pair.map((i) => i.item_id),
    });
  }
  /* 학위 묶음. 학위마다 다른 여섯 자리를 묻는다 */
  const bc = branchCopy(input.branchBlock, d.core);
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
        question: "대학원에서 한 일을 몇 가지 더 여쭙겠습니다",
        help: `대학원 전공이 달라도 ${majorName} 쪽 경험과 이어 볼 수 있도록 여쭙는 질문입니다.`,
        chips: ["다룬 분야", "가져다 쓸 수 있는 방법", `마지막으로 ${majorName} 일을 한 때`,
                "학부 때 가장 깊이 해 본 활동"],
        items: [],
      });
    }
    for (const i of xf) {
      add({
        id: `xfield-${i.item_id}`, stage: "JUDGE", kind: "single",
        required: false, auto: true,
        eyebrow: "대학원 경험",
        question: wording(i.item_id, input.stage),
        help: "고르신 내용은 경험을 지원서 표현으로 정리할 때 씁니다.",
        items: [i.item_id],
      });
    }
  }

  /* ── 실제 업무 판단. 선별된 영역마다 네 축을 둘씩 ──
     **전환 화면을 세우지 않는다**(규격 §12). `이제 실제 경험을
     확인합니다` 와 영역 이름 목록뿐이었고, 그 이름은 바로 다음 화면의
     머리말에 다시 적혀 있었다. 첫 질문 위에 한 줄로 얹는다 */
  /* **안쪽 이름(`영역 훑기`)을 적지 않는다.** 영역 이름 사이는 쉼표다:
     이름 안에 가운뎃점(`경영전략·기획`)이 있어 가운뎃점으로 이으면 어디서
     끊기는지 안 보인다 */
  const pn = input.probe.length;
  let judgeStrip: string | null = pn
    ? `답하신 내용을 보고 ${KO_COUNT[pn] ?? pn} 가지 일을 골랐습니다: `
      + `${input.probe.map(domainName).join(", ")}. `
      + `${pn > 1 ? "이 일들을" : "이 일을"} 실제로 해 봤는지 하나씩 여쭙겠습니다.`
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
          ? (cc.pairAsk[ax] ?? "해 본 일")
          : wording(cell[0].item_id, input.stage),
        /* **용어를 모르면 해 본 사람도 `없다` 를 고른다**(규격 §5).
           그 전공의 말은 빼지 않고 아래에 쉬운 말 한 줄로 받친다. 받침이
           없는 말은 `v3:items:copy` 가 센다 */
        ...(() => {
          const g = d.termGloss(cell.map((x) => wording(x.item_id, input.stage)).join(" "));
          return g ? { term: g } : {};
        })(),
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
    /* **질문 위 띠를 세우지 않는다.** 이 묶음의 첫 화면에는 단계 첫 줄
       (`해 보신 일을 조금 더 자세히 여쭙겠습니다`)이 이미 서서, 띠를 두면
       같은 뜻의 두 줄이 한 화면에 선다. 전에 서던 `남은 칸을 채우는
       질문입니다` 는 설계 문서의 말이었다 */
    let deepStrip: string | null = null;
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
            ? (cc.deepPair[pair.map((i) => i.evidence_axis ?? "").join("+")]
              ?? pair.map((i) => cc.pairAsk[i.evidence_axis ?? ""] ?? "")
                .filter(Boolean).join(", "))
            : wording(pair[0].item_id, input.stage),
          ...(() => {
            const g = d.termGloss(pair.map((x) => wording(x.item_id, input.stage)).join(" "));
            return g ? { term: g } : {};
          })(),
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
    if (input.didCells && !input.didCells.some((c) => c.startsWith(`${td}.`))) continue;
    add({
      id: `ev-${td}`, stage: "EVIDENCE", kind: "checklist", required: false, auto: false,
      eyebrow: "실제로 한 일",
      subject: domainName(td),
      question: `${domainName(td)}에서 실제로 한 것을 모두 골라 주세요`,
      help: "앞에서 ‘해 봤다’고 답한 것만 모았습니다. 해당하는 게 없으면 비워 두셔도 됩니다.",
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
        /* **화면이 자기가 하는 일을 설명하지 않는다**(`두 번 나눠
           묻습니다`). 축마다 그 짝이 묻는 것을 한 문장으로 적는다 */
        eyebrow: "조금만 더",
        question: axis === "J3"
          ? (input.stage === "postdoc"
            ? "맡은 과제와 다른 기관 일에서 각각 기준을 정해 본 적이 있나요?"
            : "학교 안과 밖에서 각각 기준을 정해 본 적이 있나요?")
          : axis === "J5"
            ? "만든 결과물에 대해 두 가지만 더 여쭙겠습니다"
            : "같은 일을 두 상황으로 나눠 여쭙겠습니다",
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
    help: "두 개까지 고를 수 있습니다. 여기서 고른다고 앞의 답이 바뀌지는 않습니다.",
    items: [],
  });
  add({
    id: "pick-org", stage: "PACK", kind: "pick-org", required: false, auto: false, max: 2,
    eyebrow: "일하고 싶은 곳",
    question: "어떤 조직에서 일하는 모습이 더 그려지나요?",
    help: "두 개까지 고를 수 있습니다. 결과를 보여 드리는 순서에만 씁니다.",
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
      ? `이제 ${sc?.name ?? "고르신 산업"}에서 자주 하는 일을 여쭙겠습니다.`
        + ` 낯선 말은 질문 아래에 쉽게 풀어 두었습니다.`
      : null;
    for (const i of list) {
      add({
        id: `ind-${i.item_id}`, stage: "PACK", kind: "single",
        required: false, auto: true, pack: deepIndustry,
        eyebrow: sc?.name ?? "산업 판단",
        question: wording(i.item_id, input.stage),
        /* **쉬운 말 풀이를 도움말 칸에 또 담지 않는다.** 그 풀이는 이제
           질문 바로 아래 `예` 줄로 서므로(`runtime/examples.ts` 의
           `exampleOf` 가 산업팩 문항에서 그것을 돌려준다), 여기 두면 같은
           글이 한 화면에 두 번 서고 열여덟 자 질문 아래 서른세 자 회색
           글이 또 선다 */
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
      /* 학부생에게 `연구` 를 떠올리라고 하지 않는다 */
      question: grad
        ? "연구나 프로젝트 하나를 떠올려 주세요"
        : "과제나 프로젝트, 활동 하나를 떠올려 주세요",
      help: "그 경험 하나를 네 번에 나눠 여쭙겠습니다. 모두 같은 경험으로 답해 주세요.",
      chips: ["풀려던 문제", "쓴 방법", "남은 결과물", "쓰인 곳"],
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
        question: "지금 생각하는 진로를 골라 주세요",
        help: "결과에서 지금 가진 경험과 나란히 보여 드립니다.",
        items: target.map((i) => i.item_id),
      });
    }
  }

  add({
    id: "done", stage: "DONE", kind: "done", required: false, auto: false,
    eyebrow: "응답 완료", question: "이제 결과를 만들 수 있습니다",
    items: [],
  });

  const perStage: Record<string, number> = {};
  for (const s of screens) perStage[s.stage] = (perStage[s.stage] ?? 0) + 1;
  return { screens, perStage };
}
