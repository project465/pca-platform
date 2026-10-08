/**
 * CareerMatri 플랫폼의 메뉴.
 *
 * **여덟 자리다.** 홈은 소개 사이트(`careermatri.com`)이고 앱 안에서
 * 갈리는 것은 일곱이다: 검사 · 내 CareerMatri · 탐색 · 경험 · 공고 ·
 * Track · 설정.
 *
 * 손전화에서는 **다섯 자리까지만** 아래 띠에 세운다. 여섯째부터 글자가
 * 두 줄로 접히고, 접힌 띠는 누르는 자리가 어디인지 알 수 없다. 나머지
 * 둘은 왼쪽 띠와 대시보드 카드에서 닿는다.
 *
 * `soon` 은 거짓말을 막는 표시다. 자리는 메뉴에 두되 뒤에 붙을 자료가
 * 아직 없는 쪽은 점을 붙이고, 눌러 들어가면 지어낸 숫자 대신 무엇이
 * 없는지와 그 까닭을 적는다.
 */
import type { IconName } from "@/components/sf/icon";

export type CmNavItem = {
  href: string;
  label: string;
  /** 왼쪽 띠에서 한 줄 더 적는다. 손전화 띠에서는 쓰지 않는다 */
  hint?: string;
  icon: IconName;
  /** 손전화 아래 띠에 세우는가 */
  tab?: boolean;
  /** 자료가 아직 없는 자리 */
  soon?: boolean;
};

export const CM_NAV: CmNavItem[] = [
  { href: "/me", label: "내 CareerMatri", hint: "방향 · 근거 · Gap · 다음 행동",
    icon: "home", tab: true },
  { href: "/cores", label: "검사", hint: "전공 Core 고르기 · 이어하기",
    icon: "clipboard", tab: true },
  { href: "/me/explore", label: "탐색", hint: "산업 · 직무 · 지역과 기관",
    icon: "compass", tab: true },
  { href: "/me/experience", label: "경험", hint: "새 경험 추가 · 근거 기록",
    icon: "layers", tab: true },
  { href: "/me/track", label: "Track", hint: "바뀔 때 다시 계산해 주는 자리",
    icon: "spark", tab: true },
  { href: "/me/jobs", label: "공고", hint: "내 근거와 공고를 맞춰 보는 자리",
    icon: "send", soon: true },
  { href: "/my/account", label: "설정", hint: "계정과 파기", icon: "user" },
];

export const CM_TABS = CM_NAV.filter((x) => x.tab);

/** 지금 쪽이 그 줄인가. 정확히 같거나 그 아래 경로면 켠다 */
export function navOn(href: string, active: string): boolean {
  if (href === "/me") return active === "/me";
  return active === href || active.startsWith(`${href}/`);
}
