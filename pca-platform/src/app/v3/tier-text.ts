/**
 * 화면에서만 쓰는 말. **문항 은행과 팩 자료를 고치지 않는다.**
 *
 * 산업과 역할을 고르는 자리에 붙는 한 줄은 팩 안의 문항 문면이 아니라
 * **고르기 전에 읽는 안내**다. 팩의 `demands` 는 문항이 서는 장면을 적어
 * 둔 것이라 한 줄이 길고, 그대로 여덟 개를 세우면 고르는 화면이 읽는
 * 화면이 된다. 그래서 여기에 짧게 따로 적고 팩 파일은 건드리지 않는다.
 */
import type { Tier } from "@/lib/me-v3/scoring/types";

export const TIER_WHAT: Record<Tier, { label: string; what: string }> = {
  BASIC: {
    label: "기본 선별",
    what: "열두 기술영역 가운데 어디부터 살펴볼지와, 지금까지 확인된 경험이 무엇인지",
  },
  STANDARD: {
    label: "경험 심화",
    what: "경험이 확인된 영역을 여덟 가지 관점으로 나누어 보고, 아직 부족한 부분과 채우는 방법까지",
  },
  PRO: {
    label: "경험 번역",
    what: "연구나 프로젝트 하나를 직무 언어로 바꾸고, 산업과 역할을 하나씩 자세히 살펴보는 것까지",
  },
};

export const STAGE_LABEL: Record<string, string> = {
  bachelor: "학부", master: "석사", phd: "박사", postdoc: "박사후연구원",
};

export const FIELD_LABEL: Record<string, string> = {
  STEM: "이공계",
  HUMANITIES_SOCIAL: "인문·사회",
  BUSINESS: "경상",
  OTHER_INTERDISCIPLINARY: "기타·융합",
};

/**
 * 학부 전공이 기계공학 계열인가.
 *
 * 대학원이 인문사회나 경상 계열인 사람에게만 묻는다. 이 검사는 기계공학
 * 경험을 재므로 **기계공학 경험이 아예 없는 사람에게는 줄 것이 없다.**
 * 학부가 기계공학이면 경험이 실제로 있고, 그때는 받는다.
 */
export const UNDERGRAD_LABEL: Record<string, string> = {
  ME: "기계공학 계열이었습니다",
  OTHER: "기계공학 계열이 아니었습니다",
};

export const UNDERGRAD_GLOSS: Record<string, string> = {
  ME: "기계공학 · 기계시스템 · 자동차 · 항공우주 · 조선해양 · 메카트로닉스",
  OTHER: "이 검사는 기계공학 경험을 읽습니다. 다른 전공 검사는 준비 중입니다.",
};

/**
 * 보기 넷을 한눈에 가르는 꼬리표.
 *
 * `남이 한 것을 받아 썼다` 와 `내가 했다` 와 `내가 정하고 그 결과가
 * 쓰였다` 는 끝까지 읽어야 갈리는데, 응시자는 백 번 가까이 이 보기를
 * 본다. **무엇이 다른지를 짧게 옆에 적어** 두 번째와 세 번째를 눈으로
 * 가르게 한다. 뜻은 `scoring/ownership.ts` 가 들고 있고 여기는 그것을
 * 줄인 말이라 판정에 들어가지 않는다.
 */
export const OWNERSHIP_TAG = [
  "경험 없음",
  "조건은 주어짐",
  "직접 수행",
  "직접 결정",
];

/** 산업에서 기계공학자가 실제로 다루는 것. **추천이 아니라 탐색 안내다** */
export const INDUSTRY_HINT: Record<string, string> = {
  INDUSTRY_SEMICON_V2: "정밀 구조 · 열변형 · 떨림 · 진공 · 장비 가동",
  INDUSTRY_DEFENSE_V2: "요구조건 · 경량화 근거 · 충격과 진동 · 환경 시험",
  INDUSTRY_MOBILITY_V2: "원가와 무게 · 양산성 · 내구 · 소음과 진동",
  INDUSTRY_ROBOT_V2: "부하와 관성 · 구동 선정 · 전달계 · 반복 정밀도",
  INDUSTRY_BATTERY_V2: "열 빼는 길 · 부풀림 구조 · 좁은 조건 폭 · 수율",
  INDUSTRY_SHIP_V2: "큰 구조 · 선급 규정 · 용접 변형 · 부식과 수명",
  INDUSTRY_ENERGY_V2: "계통 작동점 · 회전기계 상태 · 점검 주기 · 가동률",
  INDUSTRY_SMARTFACTORY_V2: "자동화 범위 · 장치 제작 · 라인 흐름 · 측정과 기록",
};

/** 그 역할이 실제로 내리는 판단. **순위를 뜻하지 않는다** */
export const ROLE_HINT: Record<string, string> = {
  ROLE_DESIGN_V2: "형상과 치수와 공차를 확정합니다",
  ROLE_CAE_V2: "만들기 전에 예측하고 그 예측을 책임집니다",
  ROLE_RND_V2: "쓸 방법이 없을 때 방법을 세웁니다",
  ROLE_TEST_V2: "재는 방법과 합격 기준을 정하고 판정합니다",
  ROLE_MFG_V2: "같은 것이 반복해서 나오는 조건을 잡습니다",
  ROLE_MAINT_V2: "장비가 제 성능을 내게 하고 멈추면 되살립니다",
  ROLE_QUALITY_V2: "양산과 수명 내내 요구가 지켜지는지 보증합니다",
  ROLE_PM_V2: "요구와 일정과 역할을 묶어 순서를 세웁니다",
};

/** 조직유형. **점수에 쓰이지 않고 결과를 읽는 순서만 정한다** */
export const ORG_HINT: Record<string, string> = {
  OC1: "요구를 받고 여러 부품을 하나로 묶습니다",
  OC2: "한 영역을 깊게 하고 고객 검증을 받습니다",
  OC3: "남의 문제를 받아 가정을 공개하고 답을 냅니다",
  OC4: "과제 서식과 중간 평가가 일정을 정합니다",
  OC5: "방법의 타당성을 스스로 세워야 합니다",
  OC6: "판단의 추적 가능성이 산출물입니다",
  OC7: "한 사람이 여러 역할을 겹쳐 맡습니다",
};
