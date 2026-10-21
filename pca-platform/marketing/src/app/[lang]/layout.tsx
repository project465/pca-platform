import type { Metadata, Viewport } from "next";
import { getSite, type Lang } from "@/content";
import { HTML_LANG, LANGS, OG_LOCALE } from "@/lib/i18n";
import "../globals.css";

/**
 * 언어마다 한 벌씩 미리 굽는다. 주소에 없는 언어(`/fr`)는 `getSite()` 가
 * 404 로 보낸다: 기본 언어로 조용히 그리면 같은 본문이 두 주소에 선다
 */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}
export const dynamicParams = false;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const site = getSite(lang);
  /* 미리보기 그림은 한국어판과 영어판 두 벌이다. 일본어·중국어 판은 영어
     그림을 쓴다: 한국어 글자가 박힌 그림이 그 언어의 쪽에 서는 것보다 낫다 */
  const og = lang === "ko" ? `/og-${site.key}.png` : "/og-global.png";
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
      locale: OG_LOCALE[lang as Lang],
      images: [{ url: og, width: 1200, height: 630, alt: site.meta.ogAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: site.meta.title,
      description: site.meta.description,
      images: [og],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default async function RootLayout({ children, params }: Readonly<{ children: React.ReactNode } & Props>) {
  const { lang } = await params;
  getSite(lang);
  return (
    <html lang={HTML_LANG[lang as Lang]}>
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
