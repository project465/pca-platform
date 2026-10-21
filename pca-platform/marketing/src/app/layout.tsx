import type { Metadata, Viewport } from "next";
import { getSite } from "@/content";
import "./globals.css";

export function generateMetadata(): Metadata {
  const site = getSite();
  return {
    title: site.meta.title,
    description: site.meta.description,
    metadataBase: new URL(`https://${site.domain}`),
    openGraph: {
      type: "website",
      siteName: site.brand,
      title: site.meta.title,
      description: site.meta.description,
      url: `https://${site.domain}`,
      locale: site.lang === "ko" ? "ko_KR" : "en_US",
      images: [{ url: `/og-${site.key}.png`, width: 1200, height: 630, alt: site.meta.ogAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: site.meta.title,
      description: site.meta.description,
      images: [`/og-${site.key}.png`],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const site = getSite();
  return (
    <html lang={site.lang}>
      <head>
        {/* 앱과 같은 활자 한 벌(Pretendard Variable)을 이 사이트가 직접
            내준다. 첫 화면 글자가 다른 활자로 한 번 그려졌다 바뀌지 않게
            미리 받는다 */}
        <link
          rel="preload"
          href="/fonts/pretendard/PretendardVariable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
