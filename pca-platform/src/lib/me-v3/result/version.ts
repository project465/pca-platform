/**
 * 결과 모델의 판본. **채점 판본과 따로 올린다.**
 *
 * 결과지의 구조가 바뀌는 것과 판단 규칙이 바뀌는 것은 다른 일이다.
 * 둘을 한 판본으로 묶으면 절 하나를 옮긴 날 이미 응시한 사람의 점수를
 * 다시 계산해야 하는지 묻게 된다.
 */

/** 결과 모델의 구조. 절이 늘거나 칸이 바뀌면 올린다 */
export const RESULT_MODEL_VERSION = "me-v3-result-model.1";

/** 결과지에 나가는 한국어. 문장만 바뀌면 이것만 올린다 */
export const RESULT_COPY_VERSION = "me-v3-result-copy.1";

/**
 * 결과지 화면. **모델·문장과 또 따로 올린다.**
 *
 * 문장 하나를 고친 날 화면 판본까지 올리면, 되짚을 때 무엇이 바뀐
 * 것인지 알 수 없다. 넷이 따로 간다: 화면 · 문장 · 모델 · 판단.
 */
export const RESULT_UI_VERSION = "ME_V3_RESULT_UI_V1";
