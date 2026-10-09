/**
 * CareerMatri Workspace 의 메뉴.
 *
 * **묶음으로 나눈다.** 평평한 아홉 줄은 어디가 `내 기록` 인지 읽히지
 * 않는다. 묶음 이름이 §54 의 section context 이고, 누르기 전에 그 줄이
 * 무엇에 속하는지를 말해 준다.
 *
 * 손전화에서는 **사이드바를 좁히지 않는다.** 아래 띠에 넷을 세우고
 * 다섯째 칸이 서랍이다. 여섯째부터 글자가 두 줄로 접히고, 접힌 띠는
 * 누르는 자리가 어디인지 알 수 없다.
 *
 * **권한 판단이 한 줄도 없다.** 메뉴를 숨기는 것은 안내이고 막는 것은
 * 각 쪽의 `requireUser()` 다. 여기 없는 주소도 손으로 치면 열린다.
 */
import type { IconName } from "@/components/sf/icon";

export type CmNavItem = {
  href: string;
  label: string;
  /** 왼쪽 띠에서 한 줄 더 적는다. 손전화 띠에서는 쓰지 않는다 */
  hint?: string;
  /**
   * 손전화 아래 띠에 적는 짧은 이름.
   *
   * `내 CareerMatri` 가 띠에서 두 줄로 접혀 그 칸만 키가 커졌다. 다섯
   * 칸이 같은 높이여야 어디를 누르는지가 읽힌다. **긴 이름은 읽는 이름으로
   * 남긴다**: `aria-label` 이 그것을 들고 간다.
   */
  tabLabel?: string;
  icon: IconName;
  /** 손전화 아래 띠에 세우는가 */
  tab?: boolean;
};

export type CmNavGroup = { title: string; items: CmNavItem[] };

/**
 * 묶음 넷.
 *
 * **`준비 중` 을 묶음 이름으로 올렸다.** 줄마다 점을 붙이는 것보다
 * 들어가기 전에 알 수 있고, 뱃지를 남발하지 않는다(§21).
 */
export const CM_GROUPS: CmNavGroup[] = [
  {
    title: "지금",
    items: [
      { href: "/me", label: "홈", tabLabel: "홈",
        hint: "지금 상태와 다음 한 걸음", icon: "home", tab: true },
      { href: "/cores", label: "검사", tabLabel: "검사",
        hint: "전공 고르기 · 이어하기", icon: "clipboard", tab: true },
    ],
  },
  {
    title: "내 기록",
    items: [
      { href: "/me/results", label: "결과 기록",
        hint: "검사 당시 결과와 종이", icon: "report" },
      { href: "/me/experience", label: "내 경험", tabLabel: "경험",
        hint: "새 경험 추가 · 반영", icon: "layers", tab: true },
      { href: "/me/state", label: "지금 상태", tabLabel: "상태",
        hint: "설명할 수 있는 경험과 비어 있는 자리", icon: "ladder", tab: true },
      { href: "/me/next", label: "다음 할 일",
        hint: "지금 · 다음 과제에서 · 나중에", icon: "spark" },
    ],
  },
  {
    title: "넓게 보기",
    items: [
      { href: "/me/explore", label: "산업과 직무",
        hint: "여덟 산업과 여덟 직무 전부", icon: "compass" },
      { href: "/me/region", label: "지역과 기관",
        hint: "일하고 싶은 권역과 기관 유형", icon: "globe" },
      { href: "/me/apply", label: "지원한 곳",
        hint: "직접 지원한 곳과 그 결과", icon: "send" },
    ],
  },
  {
    title: "준비 중",
    items: [
      { href: "/me/track", label: "Track",
        hint: "바뀔 때 다시 계산해 주는 자리", icon: "globe" },
    ],
  },
];

/** 계정은 묶음 밖이고 띠의 맨 아래다. Workspace 와 섞지 않는다 */
export const CM_ACCOUNT: CmNavItem = {
  href: "/my", label: "계정", hint: "로그인 · 주문 · 파기", icon: "user",
};

export const CM_NAV: CmNavItem[] = CM_GROUPS.flatMap((g) => g.items);
export const CM_TABS: CmNavItem[] = CM_NAV.filter((x) => x.tab);

/**
 * 지금 쪽이 그 줄인가. 정확히 같거나 그 아래 경로면 켠다.
 *
 * `/me` 는 아래 경로가 전부 다른 줄이라 정확히 같을 때만 켠다. 그리고
 * **경험 추가와 반영은 `내 경험` 줄로 묶인다**: 그 둘이 따로 켜지면
 * 사이드바가 지금 어디인지를 세 줄로 말하게 된다.
 */
const SAME: Record<string, string> = {
  "/me/experience/new": "/me/experience",
  "/me/recompute": "/me/experience",
  "/me/jobs": "/me/track",
  "/me/gap": "/me/state",
  "/v3/start": "/cores",
};

export function navOn(href: string, active: string): boolean {
  const a = SAME[active] ?? active;
  if (href === "/me") return a === "/me";
  return a === href || a.startsWith(`${href}/`);
}
