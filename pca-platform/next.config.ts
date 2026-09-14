import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: true,
  /**
   * 컨테이너에 넣을 때 node_modules 통째를 나르지 않는다.
   * `.next/standalone` 안에 필요한 것만 모여 나오고, 이미지가 작을수록
   * 배포가 빠르다 — 도메인이 생기는 날 며칠이 아니라 몇 분이어야 한다.
   */
  output: "standalone",
  experimental: {
    // 서버 액션에서 다루는 명단 엑셀 업로드를 염두에 둔 여유치
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
