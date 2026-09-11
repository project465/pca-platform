import type { SiteContent } from "@/content";

/**
 * 플랫폼으로 들어가는 주소.
 *
 * 설계 원칙 5 — 소개 사이트는 나라마다 있지만 학생이 검사를 보는 플랫폼은
 * 전 세계 하나다. 그래야 국가 간 비교가 되고, 그게 이 서비스의 자산이다.
 * 그래서 어느 나라 사이트에서 눌러도 같은 곳으로 간다.
 *
 * 개발 중에는 localhost 를 봐야 하므로 환경변수로 덮을 수 있게 둔다.
 */
export function platformUrl(site: SiteContent, path = "/"): string {
  const base = (process.env.NEXT_PUBLIC_PLATFORM_URL || site.platformUrl).replace(/\/$/, "");
  return base + path;
}

/**
 * 언어를 들고 간다. 튀르키예어 사이트에서 누른 사람이 한국어 화면을 만나면
 * 거기서 끝난다. 플랫폼은 ?lang= 을 쿠키로 굳히므로 한 번만 붙이면 된다.
 */
export function platformStart(site: SiteContent, path = "/start"): string {
  // 카자흐어 화면은 플랫폼에 아직 없다. 영어로 보낸다.
  const lang = site.lang === "kk" ? "en" : site.lang;
  return platformUrl(site, `${path}?lang=${encodeURIComponent(lang)}`);
}
