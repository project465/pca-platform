import type { NextConfig } from "next";

/**
 * 마케팅 사이트는 나라마다 따로 배포한다. 코드는 하나고, 빌드할 때
 * SITE 환경변수로 어느 나라 원고를 실을지 고른다.
 *
 *   SITE=global npm run build   →  영어판
 *   SITE=kr     npm run build   →  한국어판
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: { SITE: process.env.SITE ?? "global" },
};

export default nextConfig;
