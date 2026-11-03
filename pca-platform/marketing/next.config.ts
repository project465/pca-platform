import type { NextConfig } from "next";
import { PLATFORM_URL } from "./src/lib/domains";

/**
 * 홈페이지(`HOME_DOMAIN`, src/lib/domains.ts). 코드는 하나고 빌드할 때 `SITE` 로 원고를 고른다.
 *
 *   SITE=kr     npm run build   →  한국어판 (기본값)
 *   SITE=global npm run build   →  영어판
 *
 * **기본값이 한국어판이다.** 한 주소가 두 시장을 다 받고(2026-10-06), 지금
 * 파는 시장이 한국이라 값을 빠뜨린 배포가 한국어로 서는 쪽이 덜 다친다.
 *
 * STATIC=1 을 같이 주면 서버 없이 열리는 정적 파일로 내보낸다(미리보기용).
 * 정적 내보내기에는 아래 리디렉션이 없다.
 */
const isStatic = process.env.STATIC === "1";
const site = process.env.SITE ?? "kr";

/**
 * 앱 한 곳에 있는 것은 앱으로 넘긴다.
 *
 * **가격·견본 결과지·약관을 홈페이지가 따로 들고 있지 않는다.** 같은 것을
 * 두 곳에 두면 어느 날 갈리고, 갈린 날 사는 쪽은 둘 중 하나를 보고
 * 결제하거나 동의한다. 들어오던 주소는 301 로 넘긴다: 명함과 메일에 적혀
 * 나간 주소가 404 로 끝나면 그 사람은 거기서 닫는다.
 */
/* 도메인은 src/lib/domains.ts 한 곳에만 적는다 */
const APP_URL = PLATFORM_URL;
const APP_LANG: Record<string, string> = { kr: "ko", global: "en" };
const lang = APP_LANG[site] ?? "ko";
const app = (path: string) => `${APP_URL}${path}?lang=${lang}`;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: { SITE: site, STATIC: isStatic ? "1" : "" },
  ...(isStatic
    ? { output: "export" as const, distDir: `.next-static`, images: { unoptimized: true } }
    : {}),
  async redirects() {
    return [
      { source: "/pricing", destination: app("/pricing"), statusCode: 301 },
      /* 옛 결과지 뷰어. 공개 견본은 앱 `/sample` 하나다 */
      { source: "/pca", destination: app("/sample"), statusCode: 301 },
      /* 약관은 결제할 때 동의하는 글 하나만 둔다(앱 `/legal/*`) */
      { source: "/terms", destination: app("/legal/terms"), statusCode: 301 },
      { source: "/privacy", destination: app("/legal/privacy"), statusCode: 301 },
      { source: "/refund", destination: app("/legal/refund"), statusCode: 301 },
      /* 2026-10-21 에 접은 옛 쪽들. 같은 이야기를 하는 새 쪽으로 넘긴다 */
      { source: "/adopt", destination: "/universities", statusCode: 301 },
      { source: "/anchor", destination: "/universities", statusCode: 301 },
      { source: "/about", destination: "/contact", statusCode: 301 },
      { source: "/partnership", destination: "/contact", statusCode: 301 },
      { source: "/localisation", destination: "/", statusCode: 301 },
    ];
  },
  async headers() {
    return [
      {
        /* 활자와 상표는 바뀌면 파일 이름을 바꾸지 않으므로 하루만 묶어 둔다 */
        source: "/(fonts|brand)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
};

export default nextConfig;
