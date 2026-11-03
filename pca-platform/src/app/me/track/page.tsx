import { redirect } from "next/navigation";

/**
 * **학생이 보는 MAT 는 `/mat` 하나다**(2026-11-03 대표 "이거도 AI느낌난다" · 네이비 헤더 · 카드 모양을 고름).
 * 이 쪽에 있던 것은 `/mat` 의 탭으로 옮겼다: 공고 붙여 넣기 → 공고, 메모 → 경험 · 파일 → 파일, 지원서 → 지원서,
 * AI 분석 · 파일 읽기 · 알림 → 설정. 옛 주소로 들어오면 MAT 홈으로 보낸다.
 */
export default function Track(): never {
  redirect("/mat");
}
