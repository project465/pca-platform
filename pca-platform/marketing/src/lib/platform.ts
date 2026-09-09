import type { SiteContent } from "@/content";

/**
 * 플랫폼으로 넘어가는 주소.
 *
 * 소개 사이트는 나라마다 있지만 학생이 검사를 보는 플랫폼은 전 세계 하나다
 * (설계 원칙 5). 그래서 어느 나라 사이트에서 눌러도 같은 곳으로 간다.
 *
 * 환경변수가 있으면 그것을 먼저 쓴다. 도메인이 아직 정해지지 않아 원고에는
 * 임시값이 들어 있는데, 배포할 때 원고 파일을 고치지 않고 주소만 바꿀 수
 * 있어야 하기 때문이다.
 */
export function platformUrl(site: SiteContent): string {
  const base = process.env.PLATFORM_URL || site.platformUrl;
  return base.replace(/\/+$/, "");
}

/** 로그인 화면. 플랫폼의 로그인 경로는 나라와 무관하게 같다 */
export function loginUrl(site: SiteContent): string {
  return `${platformUrl(site)}/login`;
}
