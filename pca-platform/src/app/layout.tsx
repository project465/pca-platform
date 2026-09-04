import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "단체 PCA 플랫폼",
  description: "공과계열 학과를 위한 진로 지표 검사 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
