/**
 * 결과 모델을 한국어로 옮긴다. **모델은 이 파일을 읽지 않는다.**
 *
 * 문장은 셋을 지킨다.
 *
 *   1. **관찰한 것만 적는다.** `분석적 사고력이 뛰어납니다` 가 아니라
 *      `하중 조건을 직접 정한 경험이 확인됩니다` 다. 재지 않은 것을
 *      단정하면 그 줄은 아무것도 재지 않은 줄이 된다.
 *   2. **비어 있는 자리를 `부족합니다` 로 끝내지 않는다.** 무엇이 비었고 ·
 *      왜 그 자리가 중요하고 · 다음에 무엇을 하면 되는지가 한 묶음이다.
 *   3. **막연한 할 일을 쓰지 않는다.** `경험을 쌓으세요` 대신 그 영역의
 *      자료에서 가져온 재료로 문장을 만든다.
 */
import type { Axis, AxisState, Stage } from "../scoring/types";
import { andList, josaOf, orList, withJosa } from "./josa";
import { REASON_KO, ZONE_KO } from "../scoring/text.ko";
import type {
  Action, ActionCode, FirstMove, Gap, GapWhy, HeadlineCode, PackView, ResultModel,
} from "./model";

export const AXIS_KO: Record<Axis, string> = {
  J1: "문제 정의", J2: "요구 해석", J3: "직접 판단", J4: "방법과 도구",
  J5: "산출물", J6: "비교와 검증", J7: "실패와 수정", J8: "조직 활용",
};

/** 축이 무엇을 묻는 자리인지 한 줄. 결과지에서 축 이름 아래 선다 */
export const AXIS_WHAT_KO: Record<Axis, string> = {
  J1: "무엇을 풀 문제로 잡았는가",
  J2: "받은 요구를 어떻게 읽었는가",
  J3: "직접 정한 조건과 기준이 무엇인가",
  J4: "어떤 방법과 도구로 했는가",
  J5: "무엇이 결과물로 남았는가",
  J6: "무엇과 비교해 확인했는가",
  J7: "안 됐을 때 무엇을 고쳤는가",
  J8: "그 결과가 어디에 쓰였는가",
};

export const AXIS_STATE_SHORT_KO = {
  NOT_OBSERVED: "아직 없음",
  PARTICIPATED: "받아서 수행",
  CONFIRMED: "직접 수행",
  OWNED: "직접 결정",
} as const;

/**
 * 축 하나의 상태를 **문장으로** 적는다.
 *
 * 칸 셋에 색을 채워 두면 `3점 가운데 2점` 으로 읽힌다. 이 자리가 재는
 * 것은 점수가 아니고 누가 정했는지라서, 주인공은 글자 쪽이어야 한다.
 *
 * **축 이름을 문장에 그대로 끼우지 않는다.** `직접 판단` 을 끼우면
 * `직접 판단을 직접 해 본 것으로 확인됐습니다` 가 되고, 여덟 줄이 거의
 * 같은 모양으로 늘어선다. 축마다 묻는 것이 다르니 문장도 따로 적는다.
 */
type Said = "OWNED" | "CONFIRMED" | "PARTICIPATED";
const AXIS_SENT_KO: Record<Axis, Record<Said, string>> = {
  J1: {
    OWNED: "무엇을 풀 문제로 잡을지 직접 정했습니다",
    CONFIRMED: "주어진 범위 안에서 문제를 직접 잡았습니다",
    PARTICIPATED: "문제를 잡는 자리에 함께했습니다",
  },
  J2: {
    OWNED: "받은 요구를 어떤 조건으로 옮길지 직접 정했습니다",
    CONFIRMED: "받은 요구를 조건으로 옮기는 일을 직접 했습니다",
    PARTICIPATED: "옮겨진 조건을 받아 썼습니다",
  },
  J3: {
    OWNED: "조건과 기준값을 직접 정했습니다",
    CONFIRMED: "조건과 기준값을 다루는 일을 직접 했습니다",
    PARTICIPATED: "정해진 조건과 기준값을 받아 썼습니다",
  },
  J4: {
    OWNED: "어떤 방법과 도구로 풀지 직접 골랐습니다",
    CONFIRMED: "그 방법과 도구를 직접 다뤘습니다",
    PARTICIPATED: "정해진 방법과 도구를 받아 썼습니다",
  },
  J5: {
    OWNED: "무엇을 결과물로 남길지 직접 정했습니다",
    CONFIRMED: "결과물을 직접 만들어 남겼습니다",
    PARTICIPATED: "결과물 만드는 일에 함께했습니다",
  },
  J6: {
    OWNED: "무엇과 비교해 확인할지 직접 정했습니다",
    CONFIRMED: "낸 값을 다른 것과 직접 비교했습니다",
    PARTICIPATED: "비교한 결과를 받아 읽었습니다",
  },
  J7: {
    OWNED: "안 됐을 때 무엇을 고칠지 직접 정했습니다",
    CONFIRMED: "안 된 자리를 직접 고쳤습니다",
    PARTICIPATED: "고치는 일에 함께했습니다",
  },
  J8: {
    OWNED: "그 결과를 어디에 쓸지 직접 정했습니다",
    CONFIRMED: "그 결과가 쓰이는 데까지 직접 따라갔습니다",
    PARTICIPATED: "그 결과가 쓰인 자리를 전해 들었습니다",
  },
};

export function axisStateKo(axis: Axis, state: AxisState): string {
  if (state === "NOT_OBSERVED") {
    return `${withJosa(AXIS_KO[axis], "은는")} 이번 응답에서 확인되지 않았습니다`;
  }
  return AXIS_SENT_KO[axis][state];
}

/**
 * 묶음의 이름. **코드를 사용자에게 내보내지 않는다.**
 *
 * `scoring/text.ko.ts` 의 이름은 되짚는 자리에서 쓰는 긴 말이고, 결과지
 * 화면에는 짧은 쪽이 선다. 둘이 어긋나지 않게 긴 말은 그대로 가져와
 * 설명 줄로 쓴다.
 */
export const ZONE_TITLE_KO = {
  Z1_EVIDENCE_ESTABLISHED: "근거가 확인된 영역",
  Z2_EVIDENCE_INCOMPLETE: "경험은 있지만 근거를 더 만들어야 하는 영역",
  Z3_EVIDENCE_LOW_INTEREST: "경험은 있지만 지금 관심이 낮은 영역",
  Z4_INSUFFICIENT_EVIDENCE: "아직 판단하기 어려운 영역",
  NOT_EXPLORED: "이번에 보지 않은 영역",
} as const;

export const ZONE_LEAD_KO = ZONE_KO;

const HEADLINE_KO: Record<HeadlineCode, { title: string; lead: string }> = {
  /* **품질까지 보증하는 말을 쓰지 않는다.** 우리가 본 것은 응답에서 확인된
     경험이고 밖에서 검증된 성과가 아니다 */
  EVIDENCE_READY: {
    title: "지원서에서 정리해볼 만한 근거가 있는 영역이 있습니다",
    lead: "직접 정한 것과 남긴 결과물이 함께 확인된 영역입니다. 여기부터 보시면 됩니다.",
  },
  EVIDENCE_PARTIAL: {
    title: "해 본 일은 있고, 설명할 재료가 아직 모자랍니다",
    lead: "경험은 확인됐습니다. 남은 것은 그 경험을 설명할 결과물과 비교 기록입니다.",
  },
  EXPLORING: {
    title: "관심 있는 쪽은 또렷하고, 해 본 일이 아직 적습니다",
    lead: "지금 필요한 것은 공부보다 짧게 한 번 해 보는 쪽입니다.",
  },
  NO_EVIDENCE: {
    title: "아직 판단할 재료가 모이지 않았습니다",
    lead: "지금 응답만으로는 어느 영역이 앞선다고 보기 어렵습니다."
      + " 무엇을 더 해 보면 되는지부터 적었습니다.",
  },
};

const WHY_KO: Record<GapWhy, string> = {
  REQUIRED_FOR_DOMAIN: "이 영역에서 빠지면 경험을 설명하기 어려운 자리입니다",
  BLOCKS_EVIDENCE: "이것이 없으면 해 본 일을 다른 사람에게 보여줄 방법이 없습니다",
  NEEDED_BY_INDUSTRY: "고르신 산업에서 특히 자주 묻는 자리입니다",
  NEEDED_BY_ROLE: "고르신 역할에서 특히 자주 묻는 자리입니다",
};

const GAP_TITLE_KO: Record<Gap["kind"], (ax: string) => string> = {
  REQUIRED_AXIS: (ax) => `${ax} 경험이 아직 확인되지 않았습니다`,
  OUTPUT: () => "남은 결과물이 아직 확인되지 않았습니다",
  OUTPUT_EVIDENCE: () => "남긴 결과물이 무엇인지 아직 고르지 않았습니다",
  VERIFICATION: () => "무엇과 비교해 확인했는지가 비어 있습니다",
  AXIS: (ax) => `${ax} 경험이 아직 확인되지 않았습니다`,
  /* **확인된 축에 `확인되지 않았습니다` 를 붙이지 않는다.** 해 본 것은
     확인됐고, 덜 적힌 것은 어디까지 직접 정했는지다 */
  PARTIAL_EVIDENCE: (ax) => `${ax} 경험은 확인됐고, 어디까지 직접 정했는지가 덜 적혔습니다`,
};

/**
 * 첫 화면 칸에 들어가는 짧은 꼴.
 *
 * 긴 제목을 그대로 넣으면 칸 하나가 두 줄로 벌어져 옆 칸과 어긋난다.
 * 여기는 **어디의 무엇인지**만 적고, 왜 그 자리가 필요한지는 아래 절이
 * 맡는다.
 */
const GAP_SHORT_KO: Record<Gap["kind"], (ax: string) => string> = {
  REQUIRED_AXIS: (ax) => `${ax} 경험`,
  OUTPUT: () => "남은 결과물",
  OUTPUT_EVIDENCE: () => "남긴 결과물이 무엇인지",
  VERIFICATION: () => "무엇과 비교해 확인했는지",
  AXIS: (ax) => `${ax} 경험`,
  PARTIAL_EVIDENCE: () => "어디까지 직접 정했는지",
};

export function gapShortKo(g: Gap, domainName: string): string {
  return `${domainName} · ${GAP_SHORT_KO[g.kind](g.axis ? AXIS_KO[g.axis] : "")}`;
}

/** 반쯤 선 자리는 까닭도 다르다. `보여줄 방법이 없다` 는 참이 아니다 */
const PARTIAL_WHY_KO = "해 본 것은 확인됐습니다. 지원서에서는 여기서"
  + " 무엇을 직접 정했는지까지 묻습니다.";


/**
 * 학위마다 할 일의 깊이가 다르다. **Core 판정은 그대로다.**
 *
 * 학부생에게 `협업에서 가진 권한` 을 적으라고 하면 적을 것이 없고, 포닥에게
 * `수업 과제면 됩니다` 는 하나 마나 한 말이다. 달라지는 것은 다음 걸음의
 * 깊이뿐이고, 묶음과 축 상태는 학위를 보지 않는다.
 */
const DEPTH_KO: Record<Stage, string> = {
  bachelor: "수업 프로젝트나 캡스톤, 짧은 스터디 가운데 하나면 됩니다.",
  master: "학위 과제에서 직접 맡은 범위와, 그 결과를 무엇으로 검증했는지까지"
    + " 적으면 됩니다.",
  phd: "문제를 어떻게 잡았고 그 방법을 왜 골랐는지, 남은 불확실성까지"
    + " 적으면 됩니다.",
  postdoc: "혼자 판단한 범위와 과제에서 맡은 몫, 그 결과를 산업이나 기관의"
    + " 말로 옮긴 문장까지 적으면 됩니다.",
};

/** 짧게 한 번 해 보는 자리도 학위마다 다르다 */
const TRY_KO: Record<Stage, string> = {
  bachelor: "수업 프로젝트나 교내 과제 하나면 충분합니다.",
  master: "연구실 과제에서 작은 범위를 하나 맡아보는 것으로 됩니다.",
  phd: "본 연구 옆에 작은 검증 과제를 하나 두는 쪽이 빠릅니다.",
  postdoc: "협업 과제나 외부 의뢰 가운데 짧은 것을 하나 맡아보세요.",
};

/**
 * 영역마다 **그 일을 설명하는 차례가 다르다.**
 *
 * 영역 사전의 `쓰는 방법` 과 `내놓는 산출물` 을 기계로 이어 붙이면 열두
 * 영역이 거의 같은 문장을 받는다(해석과 진동과 시험이 모두 `사례 하나를
 * 골라 정리해보세요` 가 됐다). 그래서 차례만은 손으로 적는다. 여기 적는
 * 것은 문장이 아닌 **순서**고, 판정에는 들어가지 않는다.
 */
const CHAIN_KO: Record<string, string[]> = {
  TD01: ["요구 조건", "개념안 비교", "공차와 체결 결정", "도면", "시작품 확인"],
  TD02: ["하중과 구속조건", "이상화와 모델", "해석값", "검증 대조", "설계 변경"],
  TD03: ["발열과 유량 조건", "지배 전달 경로", "작동점 선정", "해석값", "실측 대조"],
  TD04: ["주파수 대역", "가진원", "전달경로", "측정값", "개선 전후 결과"],
  TD05: ["요구 동작", "구동과 제어 구조", "시퀀스", "시운전 결과", "사이클 타임 판정"],
  TD06: ["파단면 관찰", "손상 기구 후보", "분석 방법", "증거", "배제한 후보"],
  TD07: ["시험 목적", "지그와 센서", "판정 기준", "결과", "산포와 오차 대응"],
  TD08: ["도면 공차", "공법 선정", "조건 실험", "공정능력", "표준화"],
  TD09: ["고장 이력", "고장 모드", "점검 주기와 교체 기준", "조치", "전후 가동률"],
  TD10: ["고객 요구", "관리할 특성", "관리 한계", "시정조치", "전후 불량률"],
  TD11: ["상위 요구", "요구 분해", "할당과 인터페이스", "검증 배정", "충족률"],
  TD12: ["반복 작업", "입출력 규격", "자동화 범위", "검증 규칙", "손으로 한 결과 대조"],
};

/** 영역이 정해지지 않은 할 일에는 차례가 없다 */
function chainOf(domain: string | null): string[] {
  return (domain ? CHAIN_KO[domain] : undefined) ?? [];
}

/** 그 영역이 일하는 차례. 결과지에서 영역을 소개하는 자리에도 쓴다 */
export function domainChainKo(domain: string): string[] {
  return CHAIN_KO[domain] ?? [];
}

/**
 * 해 본 것은 확인됐고 **어디까지 직접 정했는지**가 덜 적힌 축.
 *
 * `경험을 더 쌓으세요` 로 끝내면 할 말이 없어진다. 이미 한 일에서 자기
 * 몫을 가려 적는 것이 다음 걸음이고, 축마다 가릴 것이 다르다.
 */
type Mat = Action["material"];
const OWN_KO: Record<Axis, (d: string, m: Mat) => string> = {
  J1: (d) => `${d} 사례에서 문제 범위를 누가 정했는지 한 줄로 적어보세요.`,
  J2: (d) => `${d}에서 요구를 조건으로 옮길 때 어느 값을 직접 정했는지 적어보세요.`,
  /* **영역마다 정하는 것이 다르다.** 영역 사전의 `먼저 정하는 것` 을
     그대로 가져오면 열두 영역이 서로 다른 문장을 받는다 */
  J3: (d, m) => (m.workflow.decide
    ? `${d}에서 ${m.workflow.decide} 가운데 직접 정한 것을 하나 골라 근거까지 적어보세요.`
    : `${d}에서 직접 정한 조건이나 기준값을 하나 골라 그 근거까지 적어보세요.`),
  J4: (d, m) => (m.workflow.method
    ? `${d}에서 ${m.workflow.method} 같은 선택을 왜 그렇게 했는지 한 줄 덧붙여보세요.`
    : `${d}에서 그 방법과 도구를 왜 골랐는지 한 줄 덧붙여보세요.`),
  J5: (d, m) => (m.artifacts.length
    ? `${d}에서 남긴 ${orList(m.artifacts)}에 가정과 한계를 한 줄씩 적어보세요.`
    : `${d}에서 남긴 결과물에 가정과 한계를 한 줄씩 적어보세요.`),
  J6: (d, m) => (m.verify_targets.length
    ? `${d}에서 ${orList(m.verify_targets)} 가운데 무엇과 견줬는지, 차이가 난 까닭까지 적어보세요.`
    : `${d}에서 비교한 기준과 차이가 난 까닭을 적어보세요.`),
  J7: (d, m) => (m.workflow.on_fail
    ? `${d}에서 안 됐을 때 원인을 어디까지 좁혔는지 적어보세요. ${m.workflow.on_fail}`
    : `${d}에서 안 됐을 때 원인을 어디까지 좁혔는지 적어보세요.`),
  J8: (d) => `${d}에서 낸 결과가 다음 결정에 어떻게 쓰였는지 적어보세요.`,
};

/** 축마다 다음에 맡아볼 일이 다르다 */
const FILL_KO: Record<Axis, (d: string) => string> = {
  J1: (d) => `${d}에서 무엇을 풀 문제로 잡을지 한 번 직접 정해보세요.`,
  J2: (d) => `${d}에서 받은 요구를 수치 조건으로 옮기는 일을 한 번 맡아보세요.`,
  J3: (d) => `${d}에서 조건이나 기준값을 직접 정하는 일을 한 번 맡아보세요.`,
  J4: (d) => `${d}에서 어떤 방법과 도구로 풀지 직접 골라보세요.`,
  J5: (d) => `${d}에서 한 일이 결과물로 남도록 한 번 끝까지 가보세요.`,
  J6: (d) => `${d}에서 낸 값을 다른 방법으로 한 번 더 확인해보세요.`,
  J7: (d) => `${d}에서 안 됐을 때 원인을 좁혀 고친 사례를 하나 만들어보세요.`,
  J8: (d) => `${d}에서 낸 결과가 다음 작업에 쓰이는 데까지 따라가 보세요.`,
};

/**
 * 할 일 한 줄과 덧붙이는 한 줄.
 *
 * **막연한 말을 쓰지 않는다.** 재료는 그 영역의 사전에서 가져온다:
 * 정하는 것 · 쓰는 방법 · 내놓는 산출물 · 무엇과 견주는가. 그래서 같은
 * `정리해 두세요` 라도 구조해석과 진동과 시험이 서로 다른 차례를 받는다.
 *
 * 덧붙이는 줄은 **학위마다 다르다.** 학부생에게 `맡아서 끌고 간 범위` 를
 * 적으라고 하면 적을 것이 없고, 포닥에게 `수업 과제면 됩니다` 는 하나 마나
 * 한 말이다. **Core 판정은 학위로 달라지지 않는다**: 달라지는 것은 다음
 * 걸음의 깊이뿐이다.
 */
export function actionKo(
  a: Action, domainName: string, stage?: Stage,
): { do: string; note?: string } {
  const w = a.material.workflow;
  const art = orList(a.material.artifacts.length ? a.material.artifacts
    : (w?.output ? [w.output] : []));
  const vt = orList(a.material.verify_targets);
  const depth = stage ? DEPTH_KO[stage] : undefined;

  if (a.code === "WRITE_UP") {
    const chain = chainOf(a.domain).join(" → ");
    return {
      do: chain
        ? `${domainName} 사례 하나를 골라 ${chain} 차례로 한 쪽에 정리해보세요.`
        : `${domainName}에서 무엇을 정했고 그 결과가 어디에 쓰였는지 한 문단으로 정리해보세요.`,
      note: depth,
    };
  }
  if (a.code === "DEEPEN_OWNERSHIP" && a.axis) {
    return { do: OWN_KO[a.axis](domainName, a.material), note: depth };
  }
  if (a.code === "EXPLORE_BROADLY") {
    return {
      do: "지금 응답만으로는 어느 영역이 앞선다고 보기 어렵습니다."
        + " 수업이나 교내 과제 가운데 하나를 골라 짧게 해 본 뒤에 다시 보세요.",
    };
  }
  if (a.code === "BUILD_OUTPUT") {
    const chain = chainOf(a.domain).slice(0, 3).join(" → ");
    return {
      do: art
        ? `다음 ${domainName} 과제에서는 ${art} 같은 결과물을 하나 남겨보세요.`
        : `다음 ${domainName} 과제에서는 판단한 내용을 문서 하나로 남겨보세요.`,
      note: chain ? `${chain} 까지 적혀 있으면 설명 재료가 됩니다.` : depth,
    };
  }
  if (a.code === "ADD_VERIFICATION") {
    const target = vt || "기준값";
    return {
      do: `다음에는 ${domainName} 결과를 ${withJosa(target, "과와")} 비교하고,`
        + " 차이가 난 이유를 적어보세요.",
      note: w?.on_fail ? `어긋났을 때는 ${w.on_fail}` : undefined,
    };
  }
  if (a.code === "FILL_AXIS" && a.axis) {
    return { do: FILL_KO[a.axis](domainName), note: depth };
  }
  if (a.code === "TRY_SHORT_EXPERIENCE") {
    /* **화면이 이미 보여 준 것을 문장으로 다시 설명하지 않는다.** 관심이
       높다는 것은 바로 위 칸에 적혀 있고, 여기 필요한 것은 할 일이다 */
    return {
      do: `${withJosa(domainName, "을를")} 짧은 과제나 스터디로 한 번 해보세요.`,
      note: stage ? TRY_KO[stage] : undefined,
    };
  }
  if (a.code === "STUDY_NEXT") {
    return {
      do: `${domainName} 수업이나 교육을 하나 들어보세요.`,
      note: "들은 뒤에 작은 과제로 한 번 써보면 경험으로 남습니다.",
    };
  }
  return {
    do: `${withJosa(domainName, "은는")} 해 본 일이 있는데 지금 관심이 낮습니다.`
      + " 원하는 방향인지 한 번 더 보세요.",
  };
}

export function gapKo(g: Gap, domainName: string): {
  title: string; why: string; detail: string;
} {
  const ax = g.axis ? AXIS_KO[g.axis] : "";
  return {
    title: `${domainName} · ${GAP_TITLE_KO[g.kind](ax)}`,
    why: g.kind === "PARTIAL_EVIDENCE" ? PARTIAL_WHY_KO : WHY_KO[g.why],
    detail: REASON_KO[g.reason],
  };
}

/**
 * 산업과 직무와 Evidence 와 Gap 을 **한 이야기로** 잇는다.
 *
 * 전에는 넷이 서로 다른 카드였다. 기술영역 묶음을 읽고, 산업 카드를 읽고,
 * 확인된 근거를 읽고, 비어 있는 자리를 읽는다. 네 번 읽고도 **그래서 이
 * 산업을 보려면 무엇이 더 필요한가**가 한 문장으로 서지 않았다.
 *
 * 이 함수가 세 토막을 한 문단으로 잇는다.
 *
 *   ① 어디에서 무엇이 확인됐다
 *   ② 그 산업이나 직무를 보려면 무엇이 아직 모자라다
 *   ③ 다음에 무엇을 하면 그 자리가 메워진다
 *
 * **셋 다 모델이 들고 있는 값에서만 온다.** 없는 토막은 적지 않는다: 지어낸
 * 연결 문장은 그 자리에서 가장 그럴듯하게 읽히고 가장 먼저 거짓이 된다.
 */
export function bridgeKo(
  pack: PackView, packName: string,
  domainName: (td: string) => string,
  action: Action | null, stage?: Stage,
): string[] {
  const out: string[] = [];

  const est = pack.established[0];
  if (est && est.axes.length) {
    const axes = andList(est.axes.slice(0, 2).map((a) => AXIS_WHAT_KO[a]));
    out.push(`${withJosa(domainName(est.domain), "은는")} ${axes} 쪽이 확인됐습니다.`);
  }

  const req = pack.requested[0];
  if (req) {
    const what = AXIS_WHAT_KO[req.axis];
    const where = domainName(req.domain);
    out.push(`${withJosa(packName, "을를")} 보려면 ${where}에서 ${what} 쪽 근거가 아직 모자랍니다.`);
  }

  if (action) {
    const k = actionKo(action, action.domain ? domainName(action.domain) : packName, stage);
    out.push(k.do);
  }
  return out;
}

export function headlineKo(m: ResultModel): { title: string; lead: string } {
  return HEADLINE_KO[m.overview.headline];
}

/** 등급마다 무엇까지 말하는가. **BASIC 에 근거가 섰다는 판정을 두지 않는다** */
export const TIER_NOTE_KO = {
  BASIC: "이 결과는 어느 쪽부터 살펴볼지를 정하는 데까지입니다."
    + " 경험을 자세히 확인하는 질문은 아직 받지 않았습니다.",
  STANDARD: "경험이 확인된 영역과 아직 부족한 자리까지 적었습니다.",
  PRO: "연구나 프로젝트 하나를 직무 언어로 바꾸고, 고르신 산업과 역할에서"
    + " 같은 경험이 어떻게 읽히는지까지 적었습니다.",
} as const;

/**
 * 번역 열 단계의 이름.
 *
 * 문항 문면은 길다(`그 과제에서 가장 먼저 푼 문제는 무엇이었습니까`).
 * 결과지의 표에서는 **왼쪽 칸이 짧아야** 오른쪽의 그 사람 답이 읽힌다.
 */
export const TRANS_STEP_KO: Record<string, string> = {
  /* **이름이 없는 단계를 문항 번호로 적지 않는다.** `TR_TAG_1` 이 그대로
     화면과 종이에 나갔다. 여기 없는 단계는 화면이 아예 세우지 않는다 */
  TR_TAG_1: "이 과제가 닿은 영역",
  TR_TAG_2: "함께 걸친 영역",
  TR_T1: "어떤 문제였나",
  TR_T2: "왜 문제였나",
  TR_T3: "어떤 방법으로 봤나",
  TR_T4: "무엇을 바꿨나",
  TR_T5: "몇 번 돌렸나",
  TR_T6: "무엇과 비교했나",
  TR_T7: "흩어짐은 어떻게 다뤘나",
  TR_T8: "무엇을 직접 정했나",
  TR_T9: "무엇이 남았나",
  TR_T10: "그 결과가 어디에 쓰였나",
};

/**
 * 첫 화면 세 번째 칸의 제목.
 *
 * **묻지 않은 것을 `없습니다` 로 적지 않는다.** 네 축만 물은 응시에서
 * `지금 비어 있는 자리는 없습니다` 가 섰고, 바로 옆 칸에는 `관심은 높고
 * 해 본 적이 없습니다` 가 섰다. 두 문장이 같은 화면에서 서로를 부순다.
 */
export const FIRST_MOVE_KO: Record<FirstMove, string> = {
  FILL_GAP: "가장 먼저 채울 것",
  WRITE_UP: "지원서와 면접용으로 정리할 것",
  TRY: "지금 해볼 것",
  NONE: "지금 해볼 것",
};

/**
 * 네 축만 물은 응시의 영역 네 묶음.
 *
 * **근거 판정이 아니다.** 관심과 배울 뜻에 그 사람이 답한 것으로만 묶었고,
 * 묶음 이름에도 `근거` 가 들어가지 않는다.
 */
export const BASIC_GROUP_KO = {
  do_now: {
    title: "직접 해볼 영역",
    lead: "관심도 배울 뜻도 높다고 답한 영역입니다. 여기부터 한 번 해보세요.",
  },
  scan: {
    title: "짧게 탐색할 영역",
    lead: "관심이나 배울 뜻 가운데 하나가 높습니다. 한 번 보고 정하면 됩니다.",
  },
  low: {
    title: "지금 우선순위가 낮은 영역",
    lead: "관심이 낮다고 답한 영역입니다. 나중에 다시 보셔도 됩니다.",
  },
  unseen: {
    title: "답하지 않으신 영역",
    lead: "관심을 답하지 않으셨습니다. 경험이 없다는 뜻이 아닙니다.",
  },
} as const;

/** 할 일을 언제 할 것인가 */
export const HORIZON_KO = {
  NOW: "지금 할 일",
  NEXT: "다음 과제에서",
  LATER: "한 번 더 볼 것",
} as const;

/* **실제로 어떻게 처리했는지 적는다.** `좁게 읽어주세요` 는 무엇을 하라는
   말인지 알 수 없고, 읽는 사람은 자기 결과를 의심하게 된다 */
export const QUALITY_KO = {
  OK: "",
  REVIEW: "일부 답변이 서로 달라, 겹쳐 확인된 내용만 결과에 반영했습니다.",
  LOW_VARIANCE: "영역 사이에 차이가 거의 생기지 않아, 먼저 볼 영역을 좁히지"
    + " 못했습니다. 더 끌리는 쪽과 덜 끌리는 쪽을 갈라 답하시면 또렷해집니다.",
  INCONSISTENT: "같은 경험을 묻는 두 문항의 답이 달라, 낮은 쪽으로 반영했습니다.",
} as const;


/**
 * 고르신 답을 지원서 문장으로 잇는다.
 *
 * **없는 내용을 지어내지 않는다.** 이어 붙이는 것은 응시자가 고른 보기
 * 뿐이고, 말끝만 높임으로 바꾼다. 과장하거나 성과를 보태지 않는다.
 */
const POLITE_TAIL = /([가-힣])다$/;

function polite(clause: string): string {
  const t = clause.trim().replace(/[.]$/, "");
  const m = POLITE_TAIL.exec(t);
  if (m) {
    /* 받침이 있는 어간 + `다` 는 `습니다` 로 간다(했다 · 없었다 · 남았다) */
    const code = m[1].charCodeAt(0);
    const jong = (code - 0xac00) % 28;
    if (jong !== 0) return `${t.slice(0, -1)}습니다`;
    return `${t.slice(0, -1)}ㅂ니다`;
  }
  /* 이름씨로 끝나면 `였습니다` 를 붙인다(…정하는 문제 → …문제였습니다) */
  return `${t}${josaOf(t, "이가") === "이" ? "이었습니다" : "였습니다"}`;
}

/**
 * 번역 열 단계를 한 문단으로. 빠진 단계는 그대로 건너뛴다.
 *
 * **문장을 마침표로 끊는다.** 빈칸으로만 이으면 여덟 마디가 한 줄로
 * 붙어서 읽는 사람이 어디서 숨을 쉬어야 할지 모른다.
 */
export function draftKo(
  steps: { item_id: string; choice: string | null }[],
): string[] {
  const by = new Map(steps.filter((x) => x.choice).map((x) => [x.item_id, x.choice as string]));
  const out: string[] = [];
  for (const id of ["TR_T1", "TR_T2", "TR_T3", "TR_T4", "TR_T6", "TR_T8", "TR_T9"]) {
    const v = by.get(id);
    if (v) out.push(`${polite(v)}.`);
  }
  const used = by.get("TR_T10");
  if (used) out.push(`그 결과는 ${used} 쓰였습니다.`);
  return out;
}

/**
 * 번역 표에 세울 차례.
 *
 * 열 단계가 이야기고, `TR_TAG_*` 는 그 과제가 어느 영역에 닿았는지를
 * 적어 두는 꼬리표다. 둘을 한 표에 섞으면 `열 단계` 가 열두 줄이 된다.
 */
export const TRANS_ORDER = [
  "TR_T1", "TR_T2", "TR_T3", "TR_T4", "TR_T5",
  "TR_T6", "TR_T7", "TR_T8", "TR_T9", "TR_T10",
] as const;
