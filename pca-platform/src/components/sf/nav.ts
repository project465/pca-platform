/**
 * 세 화면의 메뉴.
 *
 * 규격이 적어 둔 목록을 그대로 담았다. **`soon` 은 거짓말을 막는 표시다**:
 * 자리는 메뉴에 두되 뒤에 붙을 자료가 아직 없는 쪽은 흐리게 그리고, 눌러
 * 들어가면 지어낸 숫자 대신 '아직 열려 있지 않다' 를 적는다.
 *
 * 메뉴에서 빼는 것은 권한이 아니다. 막는 일은 각 쪽의 `requireRole()` 이
 * 한다. 여기 없는 주소도 손으로 치면 서버가 다시 본다.
 *
 * **손님 메뉴에서는 `soon` 을 쓰지 않는다.** 운영자는 무엇이 아직 안
 * 열렸는지 알고 있어야 하지만, 돈을 낸 사람에게 흐린 줄은 "덜 만든
 * 제품" 으로 읽힌다. 눌러서 '아직 열려 있지 않습니다' 가 뜨면 더 그렇다.
 * 그래서 개인 메뉴는 **켜질 때까지 줄 자체를 빼고**, 켜는 자리는
 * `FEATURE_APPLY` 한 곳이다(Phase 3 Apply 가 나오는 날 `yes` 로 둔다).
 * 쪽은 지우지 않는다: 주소로 들어오면 그대로 '아직 열려 있지 않습니다' 다.
 */
import type { NavItem } from "./shell";

/*
 * **개인 메뉴가 없어졌다.** 사용자 화면의 껍데기는 작업공간 한 벌이고
 * (`src/app/me/shell.tsx`) 계정 쪽도 그 띠를 쓴다. 전에는 `/my/*` 가
 * 여기 적힌 아홉 줄을 들고 자기 껍데기를 세워서, 계정에 들른 사람이
 * 머리띠와 왼쪽 띠가 전부 다른 화면을 받았다.
 *
 * 띠는 `src/app/me/nav.ts` 하나다. `Shell` 과 이 파일은 Campus 와
 * Admin 이 계속 쓴다: 저쪽은 파는 제품의 화면이 아니라 일하는 화면이고
 * 메뉴가 열다섯 줄이라 같은 띠에 담기지 않는다.
 */

export const NAV_CAMPUS: NavItem[] = [
  { href: "/org", label: "navOverview", icon: "grid" },
  { href: "/org/participants", label: "navParticipants", icon: "users" },
  { href: "/org/cohorts", label: "navCohorts", icon: "group" },
  { href: "/org/licenses", label: "navLicenses", icon: "seat" },
  { href: "/org/insights", label: "navCareerInsights", icon: "compass" },
  { href: "/org/evidence-insights", label: "navEvidenceInsights", icon: "ladder" },
  { href: "/org/reports", label: "navReports", icon: "doc", soon: true },
  { href: "/org/contract", label: "navContract", icon: "contract" },
  { href: "/org/settings", label: "navSettings", icon: "gear", soon: true },
];

/**
 * 운영 메뉴.
 *
 * **한 벌만 둔다.** 예전에는 `/admin` 이 이 목록을, 나머지 열 쪽이
 * `admin-shell.tsx` 의 평평한 열다섯 줄을 따로 들고 있었다. 두 메뉴가
 * 서로를 모르니 쪽을 더할 때마다 한쪽만 늘었고, 운영자가 지금 어디인지도
 * 쪽마다 다르게 보였다.
 *
 * **묶음은 누가 그 줄을 보는가로 가른다.** 아침에 여는 세 줄이 맨 위고,
 * 켜기 전에 한 번 보는 줄과 손님이 생긴 뒤에 보는 줄이 그 아래다. 쪽수가
 * 아니라 묻는 때가 다르다.
 *
 * **자리만 잡아 둔 쪽은 `soon` 으로 흐리게 그린다**(들어가면 '아직 열려
 * 있지 않다' 를 적는다). 아직 쪽 자체가 없는 자리는 메뉴에 두지 않는다:
 * 눌러서 404 가 뜨는 줄은 자리를 잡아 둔 것이 아니다.
 */
export const NAV_ADMIN: NavItem[] = [
  { href: "/admin", label: "navOverview", icon: "grid", group: "navGroupToday" },
  { href: "/admin/ops", label: "navOps", icon: "gear", group: "navGroupToday" },
  { href: "/admin/incidents", label: "navIncidents", icon: "alert", group: "navGroupToday" },

  /* 런칭을 막는 것을 아침에 보이게 둔다. **로그에만 두면 돈 낸 사람이
     먼저 알고 우리가 나중에 안다**(규격 §26) */
  { href: "/admin/launch", label: "navLaunch", icon: "compass", group: "navGroupLaunch" },
  { href: "/admin/readiness", label: "navReadiness", icon: "spark", group: "navGroupLaunch" },
  { href: "/admin/localization", label: "navLocalization", icon: "globe", group: "navGroupLaunch" },
  { href: "/admin/business", label: "navBusiness", icon: "building", group: "navGroupLaunch" },

  { href: "/admin/funnel", label: "navFunnel", icon: "spark", group: "navGroupCustomers" },
  /* 본 파일럿을 보는 자리. **거대한 관리 시스템을 새로 짓지 않는다** —
     참가자와 응시와 의견을 한 표로 본다 */
  { href: "/admin/v3-pilot", label: "navV3Pilot", icon: "clipboard", group: "navGroupCustomers" },
  { href: "/admin/orders", label: "navOrders", icon: "cart", soon: true, group: "navGroupCustomers" },
  { href: "/admin/refunds", label: "navRefunds", icon: "cart", group: "navGroupCustomers" },
  { href: "/admin/organizations", label: "navOrganizations", icon: "building", group: "navGroupCustomers" },
  { href: "/admin/contracts", label: "navContracts", icon: "contract", group: "navGroupCustomers" },
  { href: "/admin/users", label: "navUsers", icon: "users", soon: true, group: "navGroupCustomers" },

  { href: "/admin/products", label: "navProducts", icon: "box", soon: true, group: "navGroupCatalog" },
  { href: "/admin/assessments", label: "navAttempts", icon: "clipboard", soon: true, group: "navGroupCatalog" },
  { href: "/admin/reports", label: "navReports", icon: "doc", soon: true, group: "navGroupCatalog" },

  { href: "/admin/sites", label: "navSites", icon: "window", group: "navGroupSystem" },
  { href: "/admin/countries", label: "navCountries", icon: "globe", group: "navGroupSystem" },
  { href: "/admin/audit", label: "navAudit", icon: "log", soon: true, group: "navGroupSystem" },
];
