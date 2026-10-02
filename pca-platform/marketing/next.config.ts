import type { NextConfig } from "next";

/**
 * 마케팅 사이트는 나라마다 따로 배포한다. 코드는 하나고, 빌드할 때
 * SITE 환경변수로 어느 나라 원고를 실을지 고른다.
 *
 *   SITE=global npm run build   →  영어판
 *   SITE=kr     npm run build   →  한국어판
 */
/**
 * 어느 판을 굽는지 빌드 기록에 남긴다.
 *
 * SITE 를 안 주면 조용히 영어판이 된다. 그래서 한국판 프로젝트에서 이 값을
 * 빠뜨리면 kr 주소에 영어판이 올라가고, 아무도 실패를 보지 못한다.
 * 배포 기록의 이 한 줄이 유일한 신호다.
 */
console.info(
  `[careermatri] SITE=${process.env.SITE ?? "(없음 → global)"}`,
);

const nextConfig: NextConfig = {
  /**
   * 정적으로 내보낸다. 나가는 곳은 `out/` 이다.
   *
   * 처음에는 Firebase Hosting 때문이었고(R033), 2026-10-02 지시로 배포는
   * 대표 Vercel 팀에서 이 저장소를 Import 하는 방식이 됐다. 어느 쪽이든
   * 정적이라는 조건은 같다 — **서버 액션을 쓸 수 없다.** 문의 폼은
   * 브라우저에서 창구를 직접 부른다(`src/lib/contact.ts`). 여기를
   * 되돌리려면 폼도 함께 되돌려야 한다.
   *
   * Vercel 설정은 README 의 "Vercel 설정" 절에 적어 두었다.
   */
  output: "export",
  reactStrictMode: true,
  env: { SITE: process.env.SITE ?? "global" },

  /**
   * 이 앱이 어디서부터 자기 것인지 못 박는다.
   *
   * 저장소에 package-lock.json 이 둘이다 — 플랫폼(`pca-platform/`)과
   * 소개 사이트(`pca-platform/marketing/`). Next 는 잠금 파일을 보고
   * 작업공간의 뿌리를 짐작하는데, 그대로 두면 한 칸 위를 뿌리로 잡고
   * "Detected additional lockfiles" 를 찍는다. 로컬에서는 경고로 끝나지만
   * 배포에서는 넣어야 할 파일을 못 찾는 형태로 터질 수 있다.
   */
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
