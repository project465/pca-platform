import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 도커 이미지를 작게 만든다. .next/standalone 에 필요한 것만 모인다
  output: "standalone",
  experimental: {
    // 서버 액션에서 다루는 명단 엑셀 업로드를 염두에 둔 여유치
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
