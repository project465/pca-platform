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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: { SITE: process.env.SITE ?? "global", STATIC: isStatic ? "1" : "" },
  ...(isStatic
    ? { output: "export" as const, distDir: `.next-static`, images: { unoptimized: true } }
    : {}),
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
