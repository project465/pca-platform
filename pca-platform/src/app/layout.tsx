import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";
/* CareerMatri 제품 화면의 디자인 시스템. `globals.css` 다음에 와야
   같은 이름이 겹칠 때 이쪽이 이긴다 */
import "./surface.css";

export const metadata: Metadata = {
  title: "CareerMatri",
  description: "전공과 경험을 실제 커리어 선택으로 잇는 공학 진로 엔진",
  /* **탭의 표시도 같은 파일 하나를 읽는다**(규격 §4 · §5). 여기에 따로
     그린 그림을 두면 상표가 두 벌이 되고, 둘은 어느 날 갈린다. `app/`
     안에 `icon.svg` 를 두는 길도 있지만 그쪽은 **파일을 한 벌 더
     만드는 일**이라 쓰지 않았다 */
  icons: {
    icon: "/brand/careermatri/mark.svg",
    /* 아이폰 홈 화면은 SVG 를 읽지 않아 PNG 한 장을 따로 준다. 같은 상표에서 뽑았다(`npm run pwa:icons`) */
    apple: "/brand/careermatri/apple-touch-180.png",
  },
  /* 홈 화면에 설치했을 때(PWA). 매니페스트는 `app/manifest.ts` 가 붙인다 */
  appleWebApp: { capable: true, title: "CareerMatri", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#2F6BFF" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        {/* 공개 전 배포본임을 적는 띠는 운영자 화면에만 선다
            (`src/app/admin/layout.tsx`). 손님과 학생과 학과 담당자가 보는
            쪽에는 개발용 문구를 두지 않는다 */}
        {children}
        <PwaRegister />
        {/* 결제창 모듈. portone 일 때만 내려보낸다. mock 으로 도는 동안
            외부 스크립트를 붙일 이유가 없다 */}
        {process.env.PAYMENTS_PROVIDER === "portone" ? (
          <Script src="https://cdn.portone.io/v2/browser-sdk.js" strategy="beforeInteractive" />
        ) : null}
      </body>
    </html>
  );
}
