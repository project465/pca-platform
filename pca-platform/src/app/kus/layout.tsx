import "../surface.css";
import "../me/platform.css";
import "./kus.css";

/**
 * KUS 학생 화면. 공통 작업공간과 같은 토큰과 껍데기 클래스를 읽고,
 * KUS 에만 있는 칸(상태 카드 · 탐방 · 계획)은 `kus.css` 가 든다.
 *
 * **검색에 걸리지 않게 한다.** 계약 전 시연 화면이고 학교 이름이 선다.
 */
export const metadata = {
  title: "고려대학교 세종캠퍼스 · CareerMatri",
  robots: { index: false, follow: false },
};

export default function KusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
