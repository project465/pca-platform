import path from "node:path";
import type { NextConfig } from "next";

/**
 * 마케팅 사이트는 나라마다 따로 배포한다. 코드는 하나고, 빌드할 때
 * SITE 환경변수로 어느 나라 원고를 실을지 고른다.
 *
 *   SITE=global npm run build   →  영어판
 *   SITE=kr     npm run build   →  한국어판
 *
 * STATIC=1 을 같이 주면 서버 없이 열리는 정적 파일로 내보낸다(미리보기용).
 * 서버가 없으므로 문의 폼의 server action 을 정적 대체본으로 바꿔 끼운다.
 */
const isStatic = process.env.STATIC === "1";

/**
 * 가격은 앱 한 곳에만 있다.
 *
 * 홈페이지에도 요금 페이지가 서 있었다. 같은 값을 두 곳에 적어 두면 어느
 * 날 갈리고, **갈린 날 사는 쪽은 둘 중 하나를 보고 결제한다.** 그래서
 * 쪽을 지우고 들어오던 주소는 앱 가격표로 넘긴다: 명함이나 메일에 적혀
 * 나간 주소가 404 로 끝나면 그 사람은 가격을 못 보고 닫는다.
 *
 * 301 이라 검색엔진이 옛 주소의 평가를 새 주소로 옮기고 다시 묻지 않는다.
 * 앱 쪽 언어는 빌드한 나라가 정한다 — 카자흐어 화면은 앱에 아직 없어서
 * 영어로 보낸다.
 */
const APP_URL = "https://app.careermatri.com";
const APP_LANG: Record<string, string> = { kr: "ko", global: "en", tr: "tr", kz: "en" };
const lang = APP_LANG[process.env.SITE ?? "global"] ?? "en";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: { SITE: process.env.SITE ?? "global", STATIC: isStatic ? "1" : "" },
  ...(isStatic
    ? { output: "export" as const, distDir: `.next-static`, images: { unoptimized: true } }
    : {}),
  /* 정적 내보내기(STATIC=1)는 서버가 없어서 이 표를 쓰지 못한다. 미리보기용
     이고 운영 배포는 서버 빌드다 */
  async redirects() {
    return [
      { source: "/pricing", destination: `${APP_URL}/pricing?lang=${lang}`, statusCode: 301 },
      /* 옛 결과지 뷰어. 머리띠에 있던 주소라 밖에 적혀 나갔을 수 있다.
         공개 샘플은 앱 `/sample` 하나다 */
      { source: "/pca", destination: `${APP_URL}/sample?lang=${lang}`, statusCode: 301 },
    ];
  },
  webpack: (config) => {
    if (isStatic) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@/lib/actions": path.resolve(process.cwd(), "src/lib/actions-static.ts"),
      };
    }
    return config;
  },
};

export default nextConfig;
