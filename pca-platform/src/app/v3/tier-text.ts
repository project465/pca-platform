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
    what: "열두 기술영역 가운데 어디부터 볼지와, 지금 확인된 판단이 무엇인지까지",
  },
  STANDARD: {
    label: "경험 심화",
    what: "앞에서 나타난 영역을 여덟 축으로 나눠 보고, 비어 있는 축의 이름과 채우는 조건까지",
  },
  PRO: {
    label: "경험 번역",
    what: "연구나 과제 하나를 직무 언어로 옮기고, 산업과 역할을 하나씩 깊게 보는 데까지",
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
 * 보기 넷을 한눈에 가르는 꼬리표.
 *
 * `남이 한 것을 받아 썼다` 와 `내가 했다` 와 `내가 정하고 그 결과가
 * 쓰였다` 는 끝까지 읽어야 갈리는데, 응시자는 백 번 가까이 이 보기를
 * 본다. **무엇이 다른지를 네 글자로 옆에 적어** 두 번째와 세 번째를
 * 눈으로 가르게 한다. 뜻은 `scoring/ownership.ts` 가 들고 있고 여기는
 * 그것을 줄인 말이라 판정에 들어가지 않는다.
 */
export const OWNERSHIP_TAG = [
  "해 본 적 없음",
  "조건은 남이 정함",
  "내가 수행",
  "내가 결정",
];

/** 산업에서 기계공학자가 실제로 다루는 것. **추천이 아니라 탐색 안내다** */
export const INDUSTRY_HINT: Record<string, string> = {
  INDUSTRY_SEMICON_V1: "정밀 기구 · 열변형 · 진공 · 장비 신뢰성",
  INDUSTRY_DEFENSE_V1: "구조 · 진동과 충격 · 시험 평가 · 체계 요구",
  INDUSTRY_MOBILITY_V1: "양산 설계 · 원가와 공정 · 내구 · 소음과 진동",
  INDUSTRY_ROBOT_V1: "구동과 기구 · 제어 연동 · 반복 정밀도 · 택트",
  INDUSTRY_BATTERY_V1: "열 관리 · 전극과 조립 공정 · 안전 · 수율",
  INDUSTRY_SHIP_V1: "대형 구조 · 선급 규칙 · 블록 공정 · 용접과 변형",
  INDUSTRY_ENERGY_V1: "안전 등급 · 열유체 · 재료 열화 · 품질 기록",
  INDUSTRY_SMARTFACTORY_V1: "설비와 라인 · 자동화 연동 · 가동률 · 계측",
};

/** 그 역할이 실제로 내리는 판단. **순위를 뜻하지 않는다** */
export const ROLE_HINT: Record<string, string> = {
  ROLE_DESIGN_V1: "형상과 치수와 공차를 정해 도면이나 사양으로 남긴다",
  ROLE_CAE_V1: "모델과 조건을 세우고 결과를 검증해 설계 판단을 받친다",
  ROLE_RND_V1: "답이 없는 문제에서 방법부터 세워 범위를 좁힌다",
  ROLE_TEST_V1: "무엇을 어떻게 잴지 정하고 기준에 맞는지 판정한다",
  ROLE_MFG_V1: "같은 품질로 반복 생산되도록 공정 조건을 잡는다",
  ROLE_QUALITY_V1: "불량의 원인을 찾아 기준과 절차로 되돌려 둔다",
  ROLE_PM_V1: "요구와 일정과 위험을 묶어 기술 결정을 조율한다",
};
