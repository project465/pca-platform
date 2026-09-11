import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "METRI — 공학 진로 진단",
  description: "전공·역량·채용공고를 잇는 공학 커리어 엔진",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        {children}
        {/* 결제창 모듈. portone 일 때만 내려보낸다 — mock 으로 도는 동안
            외부 스크립트를 붙일 이유가 없다 */}
        {process.env.PAYMENTS_PROVIDER === "portone" ? (
          <Script src="https://cdn.portone.io/v2/browser-sdk.js" strategy="beforeInteractive" />
        ) : null}
      </body>
    </html>
  );
}
