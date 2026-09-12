/**
 * 문의 화면이 쓰는 값만 따로 둔다.
 *
 * 클라이언트 컴포넌트가 inquiry.ts 에서 이 값들을 가져가면 pg 가 브라우저 번들로
 * 딸려 들어와 빌드가 깨진다(roster-types.ts 와 같은 이유). 타입과 상수는 DB 를
 * 모르는 파일에 있어야 한다.
 */

export const INQUIRY_KINDS = ["general", "mentor", "payment", "report"] as const;
export type InquiryKind = (typeof INQUIRY_KINDS)[number];

export const KIND_LABEL: Record<InquiryKind, string> = {
  general: "서비스가 궁금합니다",
  mentor: "멘토로 참여하고 싶습니다",
  payment: "결제·환불 문제입니다",
  report: "세션에서 문제가 있었습니다",
};

export const KIND_HINT: Record<InquiryKind, string> = {
  general: "이용 안내와 자주 묻는 질문에서 답을 못 찾으셨다면 적어주세요.",
  mentor: "학위와 지금 하시는 일, 다룰 수 있는 주제를 적어주시면 빠릅니다.",
  payment: "주문번호나 결제하신 시각을 같이 적어주시면 바로 찾습니다.",
  report: "언제 어느 세션이었는지와 무슨 일이 있었는지 적어주세요.",
};
