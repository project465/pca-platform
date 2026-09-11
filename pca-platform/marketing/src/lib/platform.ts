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

/**
 * 담당자 로그인 화면.
 *
 * `/login` 이 아니라 `/admin/login` 이다. 라이브 플랫폼에 `/login` 은 없다 —
 * 직접 확인했다(2026-09-09).
 *
 *   /            200
 *   /login       404
 *   /admin/login 200
 *   /survey      200
 *
 * **학생은 이 단추로 들어오지 않는다.** 학생은 학교가 받은 전용 링크
 * (`/survey?univ=…&pwd=…`)로 들어온다. 그 링크는 학교마다 값이 달라 소개
 * 사이트가 만들어 낼 수 없다. 그래서 이 단추는 담당자용이고, 학생에게는
 * "학교에서 받은 링크로 들어가라" 고 옆에 적는다(nav.loginNote).
 */
export function loginUrl(site: SiteContent): string {
  return `${platformUrl(site)}/admin/login`;
}

/**
 * 도입 문의를 받는 창구.
 *
 * 정적 사이트라 브라우저가 직접 부른다. 그래서 이 주소는 빌드 때 박히고
 * 화면 소스에 드러난다 — 비밀이 아니어야 한다는 뜻이고, 실제로 아니다.
 * 막는 것은 창구 쪽의 Origin 허용 목록과 속도 제한이다 (R036).
 */
export function intakeUrl(site: SiteContent): string {
  return `${platformUrl(site)}/api/intake`;
}
