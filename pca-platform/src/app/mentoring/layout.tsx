/**
 * 갤러리와 멘토 상세는 로그인 없이 본다 (2026-09-12).
 * 개인이 직접 결제하는 서비스인데 어떤 멘토가 있는지 보지도 못하고 가입하라고
 * 하면 아무도 들어오지 않는다. 그래서 여기에 일괄 차단을 두지 않는다.
 *
 * 로그인이 필요한 화면과 동작은 각자 requireUser() 로 막는다 —
 * 내 신청 · 멘토 콘솔 · 결제 화면, 그리고 신청·취소·후기·노쇼 신고 같은 서버 동작.
 * 화면만 열어둔 것이 아니라 동작 쪽에도 같은 문지기가 서 있어야 한다.
 */
export default function MentoringLayout({ children }: { children: React.ReactNode }) {
  return children;
}
