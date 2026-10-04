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

export const NAV_ADMIN: NavItem[] = [
  { href: "/admin", label: "navOverview", icon: "grid" },
  { href: "/admin/users", label: "navUsers", icon: "users", soon: true },
  { href: "/admin/organizations", label: "navOrganizations", icon: "building" },
  { href: "/admin/contracts", label: "navContracts", icon: "contract" },
  { href: "/admin/products", label: "navProducts", icon: "box", soon: true },
  { href: "/admin/orders", label: "navOrders", icon: "cart", soon: true },
  { href: "/admin/assessments", label: "navAssessments", icon: "clipboard", soon: true },
  { href: "/admin/reports", label: "navReports", icon: "doc", soon: true },
  { href: "/admin/countries", label: "navCountries", icon: "globe" },
  { href: "/admin/sites", label: "navSites", icon: "window" },
  { href: "/admin/audit", label: "navAudit", icon: "log", soon: true },
  { href: "/admin/ops", label: "navSettings", icon: "gear" },
];
