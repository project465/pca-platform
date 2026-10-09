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
 * 묶음 넷: 지금 · 내 커리어 · 탐색 · 기타.
 *
 * **줄마다 적던 한 줄 설명을 걷었다.** 아홉 줄에 설명이 붙어 띠가
 * 열여덟 줄로 읽혔고, 그 설명은 들어가면 쪽 머리에 다시 있다. 띠가
 * 하는 일은 **지금 어디인지와 갈 수 있는 곳**까지다.
 *
 * `준비 중` 을 묶음 이름으로 쓰던 것도 걷었다. 그 묶음에 줄이 하나뿐인데
 * 이름이 묶음 자리를 차지하면, 아직 없는 것이 메뉴에서 가장 크게 읽힌다.
 * Track 한 줄만 `준비 중` 을 달고 `기타` 로 들어간다.
 *
 * **계정이 이 띠 안으로 들어왔다.** 전에는 `/my` 가 자기 껍데기를 따로
 * 들고 있어서 계정에 들른 사람이 다른 제품으로 넘어간 것처럼 보였다.
 */
export const CM_GROUPS: CmNavGroup[] = [
  {
    title: "지금",
    items: [
      { href: "/me", label: "홈", tabLabel: "홈", icon: "home", tab: true },
      { href: "/cores", label: "검사", tabLabel: "검사", icon: "clipboard", tab: true },
    ],
  },
  {
    title: "내 커리어",
    items: [
      /**
       * **결과 기록을 손전화 띠에 세운다.**
       *
       * 검사를 끝낸 사람이 가장 자주 돌아오는 자리인데 서랍 안에 있었다.
       * 그렇다고 **띠를 여섯 칸으로 늘리지 않는다**: 320px 에서 다섯 칸도
       * 빠듯하고, 여섯이면 글자가 두 줄로 접혀 어디를 누르는지가 안
       * 읽힌다. 대신 `지금 상태` 를 서랍으로 내렸다 — 그쪽은 홈의 첫
       * 카드가 요약을 들고 있어서 한 번 더 눌러 들어가는 자리이고,
       * 결과 기록은 홈에 요약이 없다.
       */
      { href: "/me/results", label: "결과", tabLabel: "결과", icon: "report", tab: true },
      { href: "/me/experience", label: "경험", tabLabel: "경험", icon: "layers", tab: true },
      { href: "/me/state", label: "지금 상태", icon: "ladder" },
      { href: "/me/next", label: "다음 할 일", icon: "spark" },
    ],
  },
  {
    title: "탐색",
    items: [
      { href: "/me/explore", label: "산업과 직무", icon: "compass" },
      { href: "/me/region", label: "지역과 기관", icon: "globe" },
      { href: "/me/apply", label: "지원한 곳", icon: "send" },
    ],
  },
  {
    title: "기타",
    items: [
      { href: "/my", label: "계정", icon: "user" },
      { href: "/me/track", label: "Track", hint: "준비 중", icon: "globe" },
    ],
  },
];

export const CM_NAV: CmNavItem[] = CM_GROUPS.flatMap((g) => g.items);
export const CM_TABS: CmNavItem[] = CM_NAV.filter((x) => x.tab);

/**
 * 지금 쪽이 그 줄인가. 정확히 같거나 그 아래 경로면 켠다.
 *
 * `/me` 는 아래 경로가 전부 다른 줄이라 정확히 같을 때만 켠다. 그리고
 * **경험 추가와 반영은 `내 경험` 줄로 묶인다**: 그 둘이 따로 켜지면
 * 사이드바가 지금 어디인지를 세 줄로 말하게 된다.
 *
 * **별칭은 메뉴에 없는 주소만 접는다.** 전에는 `/me/apply` 가 쪽에서
 * `/me/jobs` 를 넘기고 있었고, 그 별칭이 `/me/track` 으로 다시 접혀서
 * **`지원한 곳` 을 열면 `Track` 이 켜졌다.** 메뉴에 제 줄이 있는 주소를
 * 별칭에 적으면 그 줄은 영원히 안 켜진다. 그래서 `ALIAS_OK` 가 그것을
 * 막고 `npm run v3:workspace` 가 매번 센다.
 */
const SAME: Record<string, string> = {
  "/me/experience/new": "/me/experience",
  "/me/recompute": "/me/experience",
  "/me/jobs": "/me/track",
  "/me/gap": "/me/state",
  "/v3/start": "/cores",
};

/** 별칭의 왼쪽은 **메뉴에 없는 주소**여야 한다 */
export const ALIAS_OK: { from: string; to: string; ok: boolean }[] =
  Object.entries(SAME).map(([from, to]) => ({
    from, to,
    ok: !CM_NAV.some((n) => n.href === from) && CM_NAV.some((n) => n.href === to),
  }));

/** 쪽이 넘기는 `active` 가 메뉴나 별칭에 있는 주소인가 */
export function navKnown(active: string): boolean {
  const a = SAME[active] ?? active;
  return CM_NAV.some((n) => n.href === a || a.startsWith(`${n.href}/`));
}

export function navOn(href: string, active: string): boolean {
  const a = SAME[active] ?? active;
  if (href === "/me") return a === "/me";
  return a === href || a.startsWith(`${href}/`);
}
