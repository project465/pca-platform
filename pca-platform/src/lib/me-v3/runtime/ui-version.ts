/**
 * 검사 화면의 판본. **동결한 것은 화면이고 채점이 아니다.**
 *
 * 결과지를 만드는 동안 검사 화면을 편의상 고치면, 같은 판본으로 응시한
 * 두 사람이 다른 화면을 본 것이 된다. 그래서 화면 파일의 지문을
 * `assessment/ME_V3/ui-lock.json` 에 적어 두고 `npm run v3:freeze` 가
 * 매번 대조한다. **고치지 못하게 막는 장치가 아니다**: 명백한 버그와
 * 접근성 오류는 고치고, 그때 여기 판본을 올리고 지문을 다시 적는다.
 */

/** 화면 구조와 상호작용. 흐름이나 화면이 바뀌면 올린다 */
export const ASSESSMENT_UI_VERSION = "ME_V3_ASSESSMENT_UI_V1";

/** 화면에 나가는 한국어. 안내문·설명문·단추·전환·머리글이 바뀌면 올린다 */
export const ASSESSMENT_COPY_VERSION = "me-v3-assessment-copy.1";
