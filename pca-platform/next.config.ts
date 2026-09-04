import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // 서버 액션에서 다루는 명단 엑셀 업로드를 염두에 둔 여유치
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
