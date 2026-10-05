import type { Metadata } from "next";
import Script from "next/script";
import StagingMark from "@/components/staging-mark";
import "./globals.css";
/* CareerMatri 제품 화면의 디자인 시스템. `globals.css` 다음에 와야
   같은 이름이 겹칠 때 이쪽이 이긴다 */
import "./surface.css";

export const metadata: Metadata = {
  title: "CareerMatri",
  description: "전공과 경험을 실제 커리어 선택으로 잇는 공학 진로 엔진",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        {/* 공개 전 배포본이면 쪽마다 그 사실을 적는다 */}
        <StagingMark />
        {children}
        {/* 결제창 모듈. portone 일 때만 내려보낸다. mock 으로 도는 동안
            외부 스크립트를 붙일 이유가 없다 */}
        {process.env.PAYMENTS_PROVIDER === "portone" ? (
          <Script src="https://cdn.portone.io/v2/browser-sdk.js" strategy="beforeInteractive" />
        ) : null}
      </body>
    </html>
  );
}
