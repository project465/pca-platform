/**
 * 왜 그 판정인지를 적는 코드. **엔진은 코드만 내놓는다.**
 *
 * 사람이 읽는 말을 채점 코드 안에 박으면 영어판을 여는 날 채점을 고쳐야
 * 한다. 번역표는 `text.ko.ts` 에 있고 **엔진은 그 파일을 읽지 않는다**
 * (검사가 그것을 센다). 여기 적는 것은 코드 목록뿐이고, 무엇을 뜻하는지는
 * 주석과 `docs/metri/57_v3_scoring_03_reason_codes.md` 에 있다.
 */

export const REASON_CODES = [
  /* 근거가 선 영역에서 떨어진 까닭 */
  "MISSING_REQUIRED_AXIS",
  "MISSING_OUTPUT",
  "MISSING_OUTPUT_EVIDENCE",
  "MISSING_VERIFICATION",
  "INSUFFICIENT_CONFIRMED_AXES",
  /* 판단할 근거 자체가 부족한 까닭 */
  "NO_CONFIRMED_AXIS",
  "NO_RESPONSE",
  "NOT_ROUTED",
  "TIER_WITHOUT_DEEP_AXES",
  /* 관심과 근거가 어긋난 자리 */
  "LOW_INTEREST_WITH_EVIDENCE",
  /* 다음 걸음 */
  "TRY_SHORT_EXPERIENCE",
  "STUDY_NEXT",
  "BUILD_OUTPUT",
  "ADD_VERIFICATION",
  "RECHECK_DIRECTION",
  "NOT_A_PRIORITY",
  /* 응답 품질 */
  "REVERSE_PAIR_AGREED",
  "LOW_VARIANCE_GRID",
  "CONSISTENCY_PAIR_GAP",
  "CHECKLIST_MISMATCH_HIGH",
  "CHECKLIST_MISMATCH_LOW",
] as const;

export type ReasonCode = typeof REASON_CODES[number];

const SET = new Set<string>(REASON_CODES);
export function isReasonCode(x: string): x is ReasonCode {
  return SET.has(x);
}
