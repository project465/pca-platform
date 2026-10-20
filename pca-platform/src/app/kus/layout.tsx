import "../surface.css";
import "./kus.css";

/**
 * KUS 학생 화면. 껍데기와 칸은 전부 `kus.css` 가 든다(R3 부터 공통 작업공간 껍데기를 읽지 않는다).
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
