/**
 * **경험 번역 열 단계의 보기를 Core 마다 든다**(R31 · PDF 검증에서 찾은 자리).
 *
 * 전에는 `runtime/menus.ts` 가 보기 한 벌을 글자로 들고 **스무 Core 전부**에
 * 내줬다. 그 벌이 기계공학의 말이라(`재질이나 부품을 바꿨다` · `해석이나 시험
 * 보고로 남았다` · `판정이나 인증의 근거로`) 경영학과 학생이 검사에서 그
 * 보기를 고르고, 결과지와 종이의 `지원서에서 이렇게 묶어볼 수 있습니다` 가
 * 그 말을 그대로 이었다. 운영 Canary 의 `기계공학자` 와 같은 종류이고, 한
 * Core 의 값을 공통 층에 박아 둔 버릇의 다음 번이다.
 *
 * **측정은 바뀌지 않는다.** 저장되는 값은 보기의 자리(`S1`~`S5`)이고 채점은
 * 그 문항이 답해졌는지만 센다(`engine.ts` 의 `translation_steps`). 그래서
 * 단계마다 보기의 **수와 차례**를 세 벌에서 같게 두고, `없다` 류의 보기가 서는
 * 자리(T6 넷째 · T7 다섯째 · T8 넷째 · T9 다섯째)도 그대로다. 이미 응시한
 * 사람의 결과 모델은 그때 이은 글자를 굳혀 두었으므로 달라지지 않는다.
 *
 * 기계공학 벌은 전의 글자 그대로이고, 경영은 그 전공의 말이며, 사전이 없는
 * Core 는 어느 전공도 가리키지 않는 중립 벌로 떨어진다. **그 사실을 숨기지
 * 않는다**: 어느 Core 가 제 벌을 드는지는 `v3:student` 가 센다.
 */
export type TranslateStep = { options: string[]; note?: string };
export type TranslateMenu = Record<string, TranslateStep>;

const NOTE_T1 = "그 문제를 한두 줄로 적어주세요 (선택)";
const NOTE_T2 = "무엇이 문제였는지 한 줄로 적어주세요 (선택)";
const NOTE_T3 = "검토했지만 쓰지 않은 방법이 있으면 적어주세요 (선택)";
const NOTE_T4 = "끝까지 바꾸지 않은 것이 있으면 적어주세요 (선택)";
const NOTE_T5 = "몇 번 했는지 적어주세요 (선택)";
const NOTE_T10 = "누가 활용할 수 있는지 한 줄로 적어주세요 (선택)";

/** 기계공학. **전의 글자 그대로다** */
const ME: TranslateMenu = {
  TR_T1: { options: [
    "주어진 조건에서 치수나 값을 정하는 문제", "되지 않는 원인을 찾는 문제",
    "방법이나 절차 자체를 세우는 문제", "서로 부딪히는 요구를 맞추는 문제",
  ], note: NOTE_T1 },
  TR_T2: { options: [
    "그대로 두면 기준을 맞출 수 없었다", "앞 단계가 정해지지 않아 다음 작업을 진행할 수 없었다",
    "기존 방법으로는 시간이나 비용을 맞출 수 없었다", "결과를 신뢰할 근거가 없었다",
  ], note: NOTE_T2 },
  TR_T3: { options: [
    "계산이나 해석으로 미리 예측했다", "시험이나 계측으로 재서 확인했다",
    "먼저 만들어 보고 고쳤다", "기존 사례와 자료를 모아 정리했다",
  ], note: NOTE_T3 },
  TR_T4: { options: [
    "형상이나 치수를 바꿨다", "재질이나 부품을 바꿨다",
    "조건이나 설정값을 바꿨다", "절차나 순서를 바꿨다",
  ], note: NOTE_T4 },
  TR_T5: { options: [
    "조건을 바꿔 여러 번 돌렸다", "같은 조건으로 여러 번 측정해 편차를 확인했다",
    "한 번 하고 결과를 정리했다", "다른 사람이 낸 결과를 받아 정리했다",
  ], note: NOTE_T5 },
  TR_T6: { options: [
    "규격이나 기준값과 비교했다", "시험이나 계측 결과와 비교했다",
    "다른 방법으로 계산한 값과 비교했다", "비교한 것이 없다",
  ] },
  TR_T7: { options: [
    "원인을 좁혀 조건을 바꾸고 다시 했다", "모델이나 가정을 고쳐 다시 계산했다",
    "측정이나 시험 방법을 바꿨다", "범위를 좁히고 적용 한계를 적어 남겼다",
    "예상과 다르지 않았다",
  ] },
  TR_T8: { options: [
    "어느 안으로 갈지 정했다", "조건이나 기준값을 정했다",
    "다시 할 것과 그만둘 것을 정했다", "내가 정한 것은 없다",
  ] },
  TR_T9: { options: [
    "도면이나 사양으로 남았다", "해석이나 시험 보고로 남았다",
    "절차서나 기준으로 남았다", "발표 자료나 논문으로 남았다", "남은 것이 없다",
  ] },
  TR_T10: { options: [
    "다음 설계나 해석의 입력으로", "생산이나 공정 조건으로",
    "판정이나 인증의 근거로", "뒤이은 연구의 출발점으로",
  ], note: NOTE_T10 },
};

/** 경영. 목표와 지표와 고객과 예산의 말로 묻는다 */
const BIZ: TranslateMenu = {
  TR_T1: { options: [
    "목표에 맞는 숫자나 기준을 정하는 문제", "성과가 나오지 않는 원인을 찾는 문제",
    "절차나 방식 자체를 세우는 문제", "서로 부딪히는 요구를 맞추는 문제",
  ], note: NOTE_T1 },
  TR_T2: { options: [
    "그대로 두면 목표나 기준을 맞출 수 없었다", "앞 단계가 정해지지 않아 다음 일을 진행할 수 없었다",
    "기존 방식으로는 기한이나 예산을 맞출 수 없었다", "결과를 믿을 근거가 없었다",
  ], note: NOTE_T2 },
  TR_T3: { options: [
    "자료와 수치로 미리 추정했다", "설문이나 인터뷰로 직접 확인했다",
    "작게 먼저 해 보고 고쳤다", "기존 사례와 자료를 모아 정리했다",
  ], note: NOTE_T3 },
  TR_T4: { options: [
    "목표나 지표를 바꿨다", "대상 고객이나 채널을 바꿨다",
    "조건이나 기준값을 바꿨다", "절차나 순서를 바꿨다",
  ], note: NOTE_T4 },
  TR_T5: { options: [
    "조건을 바꿔 여러 번 해 봤다", "같은 조건으로 여러 번 확인해 차이를 봤다",
    "한 번 하고 결과를 정리했다", "다른 사람이 낸 결과를 받아 정리했다",
  ], note: NOTE_T5 },
  TR_T6: { options: [
    "목표나 기준값과 비교했다", "지난 실적이나 실제 반응과 비교했다",
    "다른 방식으로 추정한 값과 비교했다", "비교한 것이 없다",
  ] },
  TR_T7: { options: [
    "원인을 좁혀 조건을 바꾸고 다시 했다", "가정이나 추정 근거를 고쳐 다시 계산했다",
    "확인하는 방법을 바꿨다", "다룰 범위를 줄이고, 이 방법이 안 통하는 경우를 적어 두었다",
    "예상과 다르지 않았다",
  ] },
  TR_T8: { options: [
    "어느 안으로 갈지 정했다", "조건이나 기준값을 정했다",
    "다시 할 것과 그만둘 것을 정했다", "내가 정한 것은 없다",
  ] },
  TR_T9: { options: [
    "계획서나 제안서로 남았다", "분석 보고나 결산 자료로 남았다",
    "절차서나 기준으로 남았다", "발표 자료나 논문으로 남았다", "남은 것이 없다",
  ] },
  TR_T10: { options: [
    "다음 기획이나 예산을 짤 때 자료로", "운영이나 영업 방식을 정할 때",
    "결정하거나 보고할 때 근거로", "다음 과제의 출발점으로",
  ], note: NOTE_T10 },
};

/** 사전이 없는 Core. 어느 전공도 가리키지 않는 말 */
export const TRANSLATE_NEUTRAL: TranslateMenu = {
  TR_T1: { options: [
    "주어진 조건에서 값이나 기준을 정하는 문제", "되지 않는 원인을 찾는 문제",
    "방법이나 절차 자체를 세우는 문제", "서로 부딪히는 요구를 맞추는 문제",
  ], note: NOTE_T1 },
  TR_T2: { options: [
    "그대로 두면 기준을 맞출 수 없었다", "앞 단계가 정해지지 않아 다음 작업을 진행할 수 없었다",
    "기존 방법으로는 시간이나 비용을 맞출 수 없었다", "결과를 신뢰할 근거가 없었다",
  ], note: NOTE_T2 },
  TR_T3: { options: [
    "자료와 계산으로 미리 예측했다", "직접 재거나 확인해서 봤다",
    "먼저 해 보고 고쳤다", "기존 사례와 자료를 모아 정리했다",
  ], note: NOTE_T3 },
  TR_T4: { options: [
    "대상이나 범위를 바꿨다", "재료나 구성 요소를 바꿨다",
    "조건이나 설정값을 바꿨다", "절차나 순서를 바꿨다",
  ], note: NOTE_T4 },
  TR_T5: { options: [
    "조건을 바꿔 여러 번 해 봤다", "같은 조건으로 여러 번 확인해 편차를 봤다",
    "한 번 하고 결과를 정리했다", "다른 사람이 낸 결과를 받아 정리했다",
  ], note: NOTE_T5 },
  TR_T6: { options: [
    "규격이나 기준값과 비교했다", "실제 결과나 측정값과 비교했다",
    "다른 방법으로 구한 값과 비교했다", "비교한 것이 없다",
  ] },
  TR_T7: { options: [
    "원인을 좁혀 조건을 바꾸고 다시 했다", "가정이나 모델을 고쳐 다시 계산했다",
    "확인하는 방법을 바꿨다", "범위를 좁히고 적용 한계를 적어 남겼다",
    "예상과 다르지 않았다",
  ] },
  TR_T8: { options: [
    "어느 안으로 갈지 정했다", "조건이나 기준값을 정했다",
    "다시 할 것과 그만둘 것을 정했다", "내가 정한 것은 없다",
  ] },
  TR_T9: { options: [
    "설계안이나 사양으로 남았다", "분석이나 확인 보고로 남았다",
    "절차서나 기준으로 남았다", "발표 자료나 논문으로 남았다", "남은 것이 없다",
  ] },
  TR_T10: { options: [
    "다음 설계나 분석의 입력으로", "운영이나 현장 조건으로",
    "판정이나 승인의 근거로", "뒤이은 과제의 출발점으로",
  ], note: NOTE_T10 },
};

export const TRANSLATE_MENU: Record<string, TranslateMenu> = {
  ME_CORE_V3: ME,
  BIZ_CORE_V1: BIZ,
};

/* ── 영어(영어판 1차, 2026-10-24) ──────────────────────────────────────
   **수와 차례가 한국어 벌과 같다.** 저장되는 값이 자리(`S1`~`S5`)라서 차례가
   어긋나면 같은 답이 다른 보기로 읽힌다. `없다` 류가 서는 자리도 같다.
   영어판을 여는 Core 가 이공계 셋이라 기계공학 벌과 중립 벌만 적었다
   (전기전자 · 컴퓨터는 한국어에서도 중립 벌을 받는다) */

const EN_NOTE_T1 = "Describe the problem in a line or two (optional)";
const EN_NOTE_T2 = "In one line, what made it a problem? (optional)";
const EN_NOTE_T3 = "Any method you considered but didn't use? (optional)";
const EN_NOTE_T4 = "Anything you kept the same throughout? (optional)";
const EN_NOTE_T5 = "How many times? (optional)";
const EN_NOTE_T10 = "In one line, who could use it? (optional)";

/** 기계공학 */
const ME_EN: TranslateMenu = {
  TR_T1: { options: [
    "Setting dimensions or values under given conditions", "Finding out why something didn't work",
    "Building the method or procedure itself", "Balancing requirements that pulled against each other",
  ], note: EN_NOTE_T1 },
  TR_T2: { options: [
    "Left as it was, it couldn't meet the spec", "The next step couldn't start until an earlier one was settled",
    "The usual method couldn't meet the time or budget", "There was no basis for trusting the results",
  ], note: EN_NOTE_T2 },
  TR_T3: { options: [
    "I predicted it ahead of time with calculations or simulation", "I measured it with tests or instruments",
    "I built it first and then improved it", "I gathered and organized past cases and data",
  ], note: EN_NOTE_T3 },
  TR_T4: { options: [
    "I changed the geometry or dimensions", "I changed the material or parts",
    "I changed conditions or settings", "I changed the procedure or order",
  ], note: EN_NOTE_T4 },
  TR_T5: { options: [
    "I ran it several times with different conditions", "I measured it several times under the same conditions to check the spread",
    "I did it once and wrote up the results", "I compiled results someone else produced",
  ], note: EN_NOTE_T5 },
  TR_T6: { options: [
    "I compared it with a standard or target value", "I compared it with test or measurement results",
    "I compared it with values calculated another way", "I didn't compare it with anything",
  ] },
  TR_T7: { options: [
    "I narrowed down the cause, changed conditions and tried again", "I fixed the model or assumptions and recalculated",
    "I changed how I measured or tested", "I narrowed the scope and wrote down the limits",
    "It went as expected",
  ] },
  TR_T8: { options: [
    "I decided which option to go with", "I set the conditions or target values",
    "I decided what to redo and what to drop", "I didn't decide anything myself",
  ] },
  TR_T9: { options: [
    "It became drawings or specifications", "It became a simulation or test report",
    "It became a procedure or standard", "It became a presentation or paper", "Nothing tangible came out of it",
  ] },
  TR_T10: { options: [
    "As input for the next design or analysis", "As production or process conditions",
    "As the basis for a pass/fail call or certification", "As a starting point for follow-up research",
  ], note: EN_NOTE_T10 },
};

/** 사전이 없는 Core 의 영어 벌. 어느 전공도 가리키지 않는 말 */
const NEUTRAL_EN: TranslateMenu = {
  TR_T1: { options: [
    "Setting values or criteria under given conditions", "Finding out why something didn't work",
    "Building the method or procedure itself", "Balancing requirements that pulled against each other",
  ], note: EN_NOTE_T1 },
  TR_T2: { options: [
    "Left as it was, it couldn't meet the requirement", "The next step couldn't start until an earlier one was settled",
    "The usual method couldn't meet the time or budget", "There was no basis for trusting the results",
  ], note: EN_NOTE_T2 },
  TR_T3: { options: [
    "I predicted it ahead of time with data and calculations", "I measured or checked it directly",
    "I tried it first and then improved it", "I gathered and organized past cases and data",
  ], note: EN_NOTE_T3 },
  TR_T4: { options: [
    "I changed the target or scope", "I changed the materials or components",
    "I changed conditions or settings", "I changed the procedure or order",
  ], note: EN_NOTE_T4 },
  TR_T5: { options: [
    "I ran it several times with different conditions", "I checked it several times under the same conditions to see the spread",
    "I did it once and wrote up the results", "I compiled results someone else produced",
  ], note: EN_NOTE_T5 },
  TR_T6: { options: [
    "I compared it with a standard or target value", "I compared it with real results or measurements",
    "I compared it with values found another way", "I didn't compare it with anything",
  ] },
  TR_T7: { options: [
    "I narrowed down the cause, changed conditions and tried again", "I fixed the assumptions or model and recalculated",
    "I changed how I checked it", "I narrowed the scope and wrote down the limits",
    "It went as expected",
  ] },
  TR_T8: { options: [
    "I decided which option to go with", "I set the conditions or target values",
    "I decided what to redo and what to drop", "I didn't decide anything myself",
  ] },
  TR_T9: { options: [
    "It became a design or specification", "It became an analysis or review report",
    "It became a procedure or standard", "It became a presentation or paper", "Nothing tangible came out of it",
  ] },
  TR_T10: { options: [
    "As input for the next design or analysis", "As operating or field conditions",
    "As the basis for a pass/fail call or approval", "As a starting point for follow-up work",
  ], note: EN_NOTE_T10 },
};

export const TRANSLATE_MENU_EN: Record<string, TranslateMenu> = {
  ME_CORE_V3: ME_EN,
};

/**
 * 그 Core 의 한 단계 보기. 사전이 없으면 중립 벌.
 *
 * `lang` 이 영어면 영어 벌을 고른다. 영어 벌이 없는 Core 는 영어 중립 벌이다:
 * 한국어 벌로 떨어지지 않는다.
 */
export function translateMenu(
  core: string, itemId: string, lang: string = "ko",
): TranslateStep | null {
  if (lang === "en") {
    return (TRANSLATE_MENU_EN[core] ?? NEUTRAL_EN)[itemId] ?? NEUTRAL_EN[itemId] ?? null;
  }
  return (TRANSLATE_MENU[core] ?? TRANSLATE_NEUTRAL)[itemId]
    ?? TRANSLATE_NEUTRAL[itemId] ?? null;
}

/** 영어 벌 전부. 결과지가 굳은 한국어 보기를 같은 자리의 영어로 옮길 때 읽는다 */
export function translateMenus(core: string, lang: string): TranslateMenu {
  if (lang === "en") return TRANSLATE_MENU_EN[core] ?? NEUTRAL_EN;
  return TRANSLATE_MENU[core] ?? TRANSLATE_NEUTRAL;
}
