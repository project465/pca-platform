import "../surface.css";
import "./app.css";
import type { Metadata, Viewport } from "next";
import { TabBar } from "./tabbar";

/**
 * 앱 화면(`/m`). **스토어 앱(Capacitor)과 홈 화면 앱이 여는 자리**로 미리
 * 세워 둔 것이다(`docs/metri/APP_OPTIONS.md` 7절).
 *
 * **웹 작업공간(`/me`)을 대신하지 않는다.** 같은 자료와 같은 함수를 읽고,
 * 손에 쥔 화면에 맞게 다시 묶을 뿐이다. 판정도 결제도 여기서 하지 않는다.
 * 깊은 일(경험 적기 여러 단계 · 공고 붙여 넣기 · 결과지)은 웹 쪽 화면으로
 * 넘어가고, 그 화면들은 손전화 폭에서 이미 점검을 통과했다.
 *
 * **아직 어디에서도 이 주소로 보내지 않는다.** 설치 정보의 여는 자리는
 * 여전히 `/me` 다. 앱을 낼 때 그 한 줄을 `/m` 으로 바꾼다.
 */
export const metadata: Metadata = {
  title: "CareerMatri",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f3f6fb",
  viewportFit: "cover",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ma">
      <div className="ma-frame">
        {children}
        <TabBar />
      </div>
    </div>
  );
}
