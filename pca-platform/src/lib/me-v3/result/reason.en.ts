/**
 * 까닭 코드를 영어로 옮기는 표. `scoring/text.ko.ts` 의 `REASON_KO` 와 열쇠가 같다.
 *
 * **채점 폴더에 두지 않는다.** 그 폴더는 측정 동결 안에 있고, 엔진은 번역표를
 * 읽지 않는다(`v3:scoring` 이 센다). 이 표는 결과지만 읽는다.
 */
import type { ReasonCode } from "../scoring/reason-codes";

export const REASON_EN: Record<ReasonCode, string> = {
  MISSING_REQUIRED_AXIS: "You've made your own calls here, but one judgment this area always looks for is still missing",
  MISSING_OUTPUT: "You've made your own calls, but nothing concrete has come out of them yet",
  MISSING_OUTPUT_EVIDENCE: "You said you produced something, but haven't picked what it was yet",
  MISSING_VERIFICATION: "You've made calls, but what you compared your values against isn't there yet",
  INSUFFICIENT_CONFIRMED_AXES: "You've made your own calls, but not yet the four it takes to explain this area",
  NO_CONFIRMED_AXIS: "You answered the questions for this area, but your own calls don't show yet",
  NO_RESPONSE: "The in-depth questions for this area weren't answered",
  NOT_ROUTED: "This area wasn't part of this assessment",
  TIER_WITHOUT_DEEP_AXES: "The free version doesn't ask about all eight kinds of judgment",
  LOW_INTEREST_WITH_EVIDENCE: "You have evidence here, but said your interest is low right now",
  TRY_SHORT_EXPERIENCE: "Your interest is high, but you haven't tried this yet. A short first try comes first",
  STUDY_NEXT: "Your interest and your wish to learn are both high. A course or training is the next step",
  BUILD_OUTPUT: "You've made calls but have nothing to show yet. One concrete output is the next step",
  ADD_VERIFICATION: "You have something to show, but not what you compared it against",
  RECHECK_DIRECTION: "This is evidence you already have. Check that it's the direction you want",
  NOT_A_PRIORITY: "Not the place to look first right now",
  REVERSE_PAIR_AGREED: "You answered two opposite questions the same way, so read this result with care",
  LOW_VARIANCE_GRID: "There was little difference between areas, so we listed the ones you picked first",
  CONSISTENCY_PAIR_GAP: "Your answers for class and real-work situations differ, so we went with the lower one",
  CHECKLIST_MISMATCH_HIGH: "No items were picked for a judgment you said you made, so we left that spot empty",
  CHECKLIST_MISMATCH_LOW: "Some items were picked for a judgment you didn't answer",
};
