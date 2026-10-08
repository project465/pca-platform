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
import type { Axis } from "../scoring/types";
import { REASON_KO, ZONE_KO } from "../scoring/text.ko";
import type {
  Action, ActionCode, Gap, GapWhy, HeadlineCode, ResultModel,
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
  EVIDENCE_READY: {
    title: "지원서에 쓸 수 있는 근거가 확인된 영역이 있습니다",
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
};

/** 둘 이상을 `~이나 ~` 로 잇는다. 목록 기호를 문장 안에 넣지 않는다 */
function or(list: string[], n = 2): string {
  const x = list.slice(0, n);
  if (x.length === 0) return "";
  if (x.length === 1) return x[0];
  return `${x[0]}이나 ${x[1]}`;
}

/**
 * 할 일 한 줄.
 *
 * **막연한 말을 쓰지 않는다.** 재료가 없으면 그 영역에서 할 수 있는 가장
 * 작은 한 걸음으로 떨어지고, `역량을 강화하세요` 같은 문장으로는 가지
 * 않는다.
 */
export function actionKo(a: Action, domainName: string): string {
  if (a.code === "WRITE_UP") {
    return `${domainName}은 직접 정한 것과 남긴 결과물이 함께 확인됐습니다.`
      + " 무엇을 정했고 그 결과가 어디에 쓰였는지 한 문단으로 정리해 두세요.";
  }
  if (a.code === "EXPLORE_BROADLY") {
    return "지금 응답만으로는 어느 영역이 앞선다고 보기 어렵습니다."
      + " 수업이나 교내 과제 가운데 하나를 골라 짧게 해 본 뒤에 다시 보세요.";
  }
  const art = or(a.material.artifacts);
  const vt = or(a.material.verify_targets);
  const ax = a.axis ? AXIS_KO[a.axis] : "";
  const M: Record<Exclude<ActionCode, "EXPLORE_BROADLY" | "WRITE_UP">, string> = {
    BUILD_OUTPUT: art
      ? `다음 ${domainName} 과제에서는 판단한 내용을 ${art} 같은 형태로 한 번 남겨보세요.`
      : `다음 ${domainName} 과제에서는 판단한 내용을 문서 하나로 남겨보세요.`,
    ADD_VERIFICATION: vt
      ? `다음에는 결과를 ${vt}과 한 번 비교하고, 차이가 난 이유를 적어보세요.`
      : "다음에는 결과를 기준값과 한 번 비교하고, 차이가 난 이유를 적어보세요.",
    FILL_AXIS: `${domainName}에서 ${ax}에 해당하는 일을 한 번 직접 맡아보세요.`,
    TRY_SHORT_EXPERIENCE:
      `${domainName}은 관심이 높은데 해 본 적이 없습니다. 짧은 과제나 스터디로 한 번 해보세요.`,
    STUDY_NEXT: `${domainName} 관련 수업이나 교육을 하나 들어보세요.`,
    RECHECK_DIRECTION:
      `${domainName}은 근거가 있는데 지금 관심이 낮습니다. 원하는 방향인지 한 번 더 보세요.`,
  };
  return M[a.code as Exclude<ActionCode, "EXPLORE_BROADLY" | "WRITE_UP">];
}

export function gapKo(g: Gap, domainName: string): {
  title: string; why: string; detail: string;
} {
  const ax = g.axis ? AXIS_KO[g.axis] : "";
  return {
    title: `${domainName} · ${GAP_TITLE_KO[g.kind](ax)}`,
    why: WHY_KO[g.why],
    detail: REASON_KO[g.reason],
  };
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
  TR_T1: "어떤 문제였나",
  TR_T2: "왜 문제였나",
  TR_T3: "어떤 방법으로 봤나",
  TR_T4: "무엇을 바꿨나",
  TR_T5: "몇 번 돌렸나",
  TR_T6: "무엇과 비교했나",
  TR_T7: "흩어짐은 어떻게 다뤘나",
  TR_T8: "무엇을 직접 정했나",
  TR_T9: "무엇이 남았나",
  TR_T10: "그 결과가 어디에 쓰이나",
};

/** 할 일을 언제 할 것인가 */
export const HORIZON_KO = {
  NOW: "지금 할 일",
  NEXT: "다음 과제에서",
  LATER: "한 번 더 볼 것",
} as const;

export const QUALITY_KO = {
  OK: "",
  REVIEW: "답변 가운데 서로 맞지 않는 곳이 있어, 이 결과는 좁게 읽어주세요.",
  LOW_VARIANCE: "영역 사이에 차이가 거의 생기지 않았습니다."
    + " 더 끌리는 쪽과 덜 끌리는 쪽을 갈라 답하시면 결과가 또렷해집니다.",
  INCONSISTENT: "같은 경험을 묻는 두 문항의 답이 달라, 낮은 쪽으로 적었습니다.",
} as const;
