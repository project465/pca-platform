/*
 * 계정 영역도 작업공간의 껍데기를 쓴다.
 *
 * 전에는 `/my/*` 가 `components/sf/shell` 의 껍데기를 써서, 로그인 방법을
 * 보러 들어간 사람이 **머리띠와 왼쪽 띠와 브랜드 글자가 전부 다른 화면**을
 * 받았다. 한 제품 안에서 껍데기가 둘이면 쪽을 이어서 누를 때만 그 어긋남이
 * 보인다. 그래서 `CmShell` 한 벌로 모으고, 그 껍데기의 값이 든
 * `platform.css` 를 여기서 싣는다.
 */
import "../surface.css";
import "../me/platform.css";

export const metadata = { title: "계정 · CareerMatri" };

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
