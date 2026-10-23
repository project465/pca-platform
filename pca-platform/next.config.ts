import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: true,
  /**
   * 컨테이너에 넣을 때 node_modules 통째를 나르지 않는다.
   * `.next/standalone` 안에 필요한 것만 모여 나오고, 이미지가 작을수록
   * 배포가 빠르다 — 도메인이 생기는 날 며칠이 아니라 몇 분이어야 한다.
   */
  output: "standalone",
  /**
   * 긴 결과지(PRO 책자)가 읽는 자료. 코드가 경로를 글자로 들고 있지 않아 Next 가
   * 따라가지 못하므로 적어 준다. 지역 자료는 OpenDART 와 벤처기업 확인 명단에서 온
   * 파일만 넣는다(`kr-chungcheong-orgs` 는 배포본에 싣지 않는다).
   */
  outputFileTracingIncludes: {
    "/v3/[attemptId]/result/book": [
      "./data/report-gm/biz-role-guide.json",
      "./data/report-gm/role-guide/*.json",
      "./data/region/dart-*.json",
      "./data/region/jeonbuk-*.json",
    ],
  },
  experimental: {
    // 서버 액션에서 다루는 명단 엑셀 업로드를 염두에 둔 여유치
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
