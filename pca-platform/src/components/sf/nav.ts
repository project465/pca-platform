/**
 * 세 화면의 메뉴.
 *
 * 규격이 적어 둔 목록을 그대로 담았다. **`soon` 은 거짓말을 막는 표시다**:
 * 자리는 메뉴에 두되 뒤에 붙을 자료가 아직 없는 쪽은 흐리게 그리고, 눌러
 * 들어가면 지어낸 숫자 대신 '아직 열려 있지 않다' 를 적는다.
 *
 * 메뉴에서 빼는 것은 권한이 아니다. 막는 일은 각 쪽의 `requireRole()` 이
 * 한다. 여기 없는 주소도 손으로 치면 서버가 다시 본다.
 */
import type { NavItem } from "./shell";

export const NAV_INDIVIDUAL: NavItem[] = [
  { href: "/my", label: "navHome", icon: "home" },
  { href: "/my/assessments", label: "navAssessments", icon: "clipboard" },
  { href: "/my/results", label: "navResults", icon: "report" },
  { href: "/my/evidence", label: "navEvidence", icon: "layers" },
  { href: "/my/applications", label: "navApplications", icon: "send", soon: true },
  { href: "/my/account", label: "navAccount", icon: "user" },
  /* **지원 경로가 메뉴에 있어야 한다**(규격 §15). 주소를 아는 사람만
     쓰는 화면이면 결제가 막힌 사람은 그 화면을 못 찾는다 */
  { href: "/support", label: "navSupport", icon: "log" },
];

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
