/**
 * 코드를 한국어로 옮기는 표. **엔진은 이 파일을 읽지 않는다.**
 *
 * 결과지 renderer 만 읽는다. 채점 코드 안에 한국어를 박으면 영어판을 여는
 * 날 채점을 고쳐야 하고, 그러면 산 사람의 점수가 번역 작업 때문에 움직인다.
 * 검사가 `scoring/` 의 다른 파일이 이 파일을 읽지 않는지 센다.
 */
import type { ReasonCode } from "./reason-codes";

export const REASON_KO: Record<ReasonCode, string> = {
  MISSING_REQUIRED_AXIS: "이 영역이 꼭 보는 판단 가운데 하나가 아직 확인되지 않았습니다",
  MISSING_OUTPUT: "실제 판단 경험은 확인됐지만 이를 남긴 산출물이 아직 확인되지 않았습니다",
  MISSING_OUTPUT_EVIDENCE: "산출물을 내셨다고 답하셨는데 그것이 무엇인지는 아직 고르지 않으셨습니다",
  MISSING_VERIFICATION: "무엇과 견주어 확인했는지가 아직 비어 있습니다",
  INSUFFICIENT_CONFIRMED_AXES: "확인된 판단이 아직 넷에 못 미칩니다",
  NO_CONFIRMED_AXIS: "이 영역에서 확인된 판단이 아직 없습니다",
  NO_RESPONSE: "이 영역의 심화 문항에 답이 없습니다",
  NOT_ROUTED: "이 영역은 이번 응시에서 열리지 않았습니다",
  TIER_WITHOUT_DEEP_AXES: "무료 응시는 여덟 판단축을 묻지 않습니다",
  LOW_INTEREST_WITH_EVIDENCE: "근거는 서 있고 지금 관심은 낮게 답하셨습니다",
  TRY_SHORT_EXPERIENCE: "관심은 높고 겪어 본 적이 없습니다. 짧게 한 번 겪어 보시는 것이 먼저입니다",
  STUDY_NEXT: "관심과 배우려는 뜻이 함께 높습니다. 수업이나 교육이 다음 걸음입니다",
  BUILD_OUTPUT: "판단은 하셨고 남은 것이 없습니다. 남길 산출물 하나가 다음 걸음입니다",
  ADD_VERIFICATION: "남은 것은 있고 무엇과 견주었는지가 없습니다",
  RECHECK_DIRECTION: "이미 가진 근거입니다. 원하는 방향인지 다시 보십시오",
  NOT_A_PRIORITY: "지금 먼저 보실 자리는 아닙니다",
  REVERSE_PAIR_AGREED: "서로 반대 방향인 두 문항에 비슷하게 답하셨습니다. 이 결과는 좁게 읽으십시오",
  LOW_VARIANCE_GRID: "영역 사이에 차이가 생기지 않았습니다. 고르신 쪽을 먼저 적었습니다",
  CONSISTENCY_PAIR_GAP: "수업 장면과 실무 장면의 답이 다릅니다. 낮은 쪽으로 적었습니다",
  CHECKLIST_MISMATCH_HIGH: "하셨다고 답한 축에 고른 항목이 없습니다. 그 자리를 비워 두었습니다",
  CHECKLIST_MISMATCH_LOW: "고르신 항목이 있는 축에 답이 없습니다",
};

export const ZONE_KO = {
  Z1_EVIDENCE_ESTABLISHED: "근거가 선 영역",
  Z2_EVIDENCE_INCOMPLETE: "관심은 있고 근거가 아직 덜 선 영역",
  Z3_EVIDENCE_LOW_INTEREST: "근거는 있고 관심이 낮은 영역",
  Z4_INSUFFICIENT_EVIDENCE: "아직 판단할 근거가 부족한 영역",
  NOT_EXPLORED: "이번에 열지 않은 영역",
} as const;

export const AXIS_STATE_KO = {
  NOT_OBSERVED: "아직 확인되지 않음",
  PARTICIPATED: "받아 쓴 범위까지 확인",
  CONFIRMED: "확인",
  OWNED: "직접 정한 것으로 확인",
} as const;
