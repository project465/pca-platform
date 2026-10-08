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
