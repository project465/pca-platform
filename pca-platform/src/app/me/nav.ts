/**
 * CareerMatri Workspace 의 메뉴.
 *
 * 손전화에서는 **사이드바를 좁히지 않는다.** 아래 띠에 셋(MAT · 홈 · 결과)을
 * 세우고 넷째 칸이 서랍이다. 글자는 `me-text.ts` 에서 읽는다.
 *
 * **권한 판단이 한 줄도 없다.** 메뉴를 숨기는 것은 안내이고 막는 것은
 * 각 쪽의 `requireUser()` 다. 여기 없는 주소도 손으로 치면 열린다.
 */
import type { IconName } from "@/components/sf/icon";
import { NAV_TEXT as N } from "./me-text";

export type CmNavItem = {
  href: string;
  label: string;
  /** 왼쪽 띠에서 한 줄 더 적는다. 손전화 띠에서는 쓰지 않는다 */
  hint?: string;
  /** 이름 옆의 작은 꼬리표(MAT 줄의 `AI 취업비서`) */
  tag?: string;
  /**
   * 손전화 아래 띠에 적는 짧은 이름. 다섯 칸이 같은 높이여야 어디를 누르는지가
   * 읽힌다. 긴 이름은 `aria-label` 이 들고 간다.
   */
  tabLabel?: string;
  icon: IconName;
  /** 손전화 아래 띠에 세우는가 */
  tab?: boolean;
  /** 띠에서 가장 크게 세우는 줄(MAT 하나) */
  big?: boolean;
};

/** `title` 이 비면 묶음 머리를 적지 않는다. `foot` 은 띠 바닥으로 내린다 */
export type CmNavGroup = { title: string; items: CmNavItem[]; foot?: boolean };

/**
 * 메뉴(2026-11-03 시안 `Main.dc.html`): **MAT 이 첫 줄이고 가장 크다.** 그 아래 홈 · 검사 결과,
 * 바닥에 내 정보 · 이용권. MAT 탭과 겹치던 쪽(공고 · 지원 기록)은 MAT 으로 보낸다.
 * 검사 결과에서 이어지는 쪽(현재 상태 · 할 일 · 경험 · 산업·직무 · 지역·기관 · 지원서·면접 준비)은
 * 띠에서 빼고 검사 결과 안의 작은 탭(`RESULT_TABS`)이 든다.
 */
export const CM_GROUPS: CmNavGroup[] = [
  {
    title: "",
    items: [
      { href: "/mat", label: N.mat.ko, tag: N.matTag.ko, hint: N.matHint.ko, tabLabel: N.mat.ko,
        icon: "spark", tab: true, big: true },
    ],
  },
  {
    title: "",
    items: [
      { href: "/me", label: N.home.ko, tabLabel: N.home.ko, icon: "home", tab: true },
      { href: "/me/results", label: N.results.ko, tabLabel: N.resultsTab.ko, icon: "report", tab: true },
    ],
  },
  {
    title: "",
    foot: true,
    items: [
      { href: "/my", label: N.me.ko, icon: "user" },
      { href: "/mat/pass", label: N.pass.ko, icon: "contract" },
    ],
  },
];

export const CM_NAV: CmNavItem[] = CM_GROUPS.flatMap((g) => g.items);
export const CM_TABS: CmNavItem[] = CM_NAV.filter((x) => x.tab);

/** 검사 결과 안의 작은 탭. 띠에서는 `검사 결과` 줄이 켜진다 */
export const RESULT_TABS: { href: string; label: string }[] = [
  { href: "/me/results", label: N.subResult.ko },
  { href: "/me/state", label: N.subState.ko },
  { href: "/me/next", label: N.subNext.ko },
  { href: "/me/experience", label: N.subExperience.ko },
  { href: "/me/explore", label: N.subExplore.ko },
  { href: "/me/region", label: N.subRegion.ko },
  { href: "/me/prep", label: N.subPrep.ko },
];

/** 작은 탭의 별칭: 경험 추가 · 반영은 `경험`, 빈자리는 `현재 상태` */
const SUB_SAME: Record<string, string> = {
  "/me/experience/new": "/me/experience",
  "/me/recompute": "/me/experience",
  "/me/gap": "/me/state",
};

/** 지금 쪽이 검사 결과 묶음이면 켤 작은 탭 주소. 아니면 null */
export function resultTabOf(active: string): string | null {
  const a = SUB_SAME[active] ?? active;
  return RESULT_TABS.find((x) => a === x.href || a.startsWith(`${x.href}/`))?.href ?? null;
}

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
  /* 검사 결과에서 이어지는 쪽은 `검사 결과` 줄을 켠다 */
  "/me/state": "/me/results",
  "/me/next": "/me/results",
  "/me/experience": "/me/results",
  "/me/experience/new": "/me/results",
  "/me/recompute": "/me/results",
  "/me/explore": "/me/results",
  "/me/region": "/me/results",
  "/me/prep": "/me/results",
  "/me/gap": "/me/results",
  "/cores": "/me/results",
  "/v3/start": "/me/results",
  /* MAT 으로 옮긴 쪽 */
  "/me/jobs": "/mat",
  "/me/apply": "/mat",
  "/me/track": "/mat",
};

/** 별칭의 왼쪽은 **메뉴에 없는 주소**여야 한다 */
export const ALIAS_OK: { from: string; to: string; ok: boolean }[] =
  Object.entries(SAME).map(([from, to]) => ({
    from, to,
    ok: !CM_NAV.some((n) => n.href === from) && CM_NAV.some((n) => n.href === to),
  }));

/** 쪽이 넘기는 `active` 가 메뉴나 별칭에 있는 주소인가 */
export function navKnown(active: string): boolean {
  const a = SAME[active] ?? SAME[resultTabOf(active) ?? ""] ?? active;
  return CM_NAV.some((n) => n.href === a || a.startsWith(`${n.href}/`));
}

export function navOn(href: string, active: string): boolean {
  const a = SAME[active] ?? SAME[resultTabOf(active) ?? ""] ?? active;
  if (href === "/me") return a === "/me";
  return a === href || a.startsWith(`${href}/`);
}
