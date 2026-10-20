import Link from "next/link";
import Icon, { type IconName } from "@/components/icons";
import LogoutButton from "@/components/logout-button";
import { BRAND, BRAND_SUB } from "@/lib/brand";
import { ROLE_LABEL } from "@/lib/roles";
import type { SessionUser } from "@/lib/session";

type NavItem = { href: string; label: string; icon: IconName; ready: boolean };
export type Area = "admin" | "org" | "student";

/** 화면 목록(CLAUDE.md)을 역할별로 나눴다. 만든 것만 링크가 된다. */
const NAV: Record<Area, { title: string; icon: IconName; items: NavItem[] }> = {
  admin: {
    title: "운영 관리",
    icon: "building",
    items: [
      { href: "/admin/organizations", label: "기관", icon: "building", ready: true },
      { href: "/admin/contracts", label: "계약·응시권", icon: "contract", ready: false },
      { href: "/admin/instruments", label: "검사 문항", icon: "list", ready: false },
      { href: "/admin/mappings", label: "매핑 데이터", icon: "link", ready: false },
      { href: "/admin/attempts", label: "응시 현황", icon: "chart", ready: false },
    ],
  },
  org: {
    title: "학과 업무",
    icon: "users",
    items: [
      { href: "/org", label: "홈", icon: "home", ready: true },
      { href: "/org/sessions", label: "회차 관리", icon: "calendar", ready: false },
      { href: "/org/roster", label: "명단·계정 발급", icon: "upload", ready: false },
      { href: "/org/progress", label: "응시 현황", icon: "chart", ready: false },
      { href: "/org/report", label: "단체 리포트", icon: "report", ready: false },
    ],
  },
  student: {
    title: "나의 검사",
    icon: "pencil",
    items: [
      { href: "/my", label: "홈", icon: "home", ready: true },
      { href: "/my/test", label: "검사 응시", icon: "pencil", ready: false },
      { href: "/my/report", label: "내 결과지", icon: "report", ready: false },
      { href: "/password/change", label: "비밀번호 변경", icon: "key", ready: true },
    ],
  },
};

export default function AppShell({
  user,
  area,
  current,
  children,
}: {
  user: SessionUser;
  area: Area;
  current: string;
  children: React.ReactNode;
}) {
  const nav = NAV[area];

  return (
    <div className="app">
      <header className="app-top">
        <Link className="brand" href="/">
          <span className="mark">
            <Icon name="mark" size={17} />
          </span>
          {BRAND}
          <small>{BRAND_SUB}</small>
        </Link>
        <div className="who">
          <span className="chip">
            <span className="avatar">{user.name.slice(0, 1)}</span>
            {user.name}
            <span className="role">{ROLE_LABEL[user.role]}</span>
          </span>
          <LogoutButton />
        </div>
      </header>

      <div className="app-body">
        <aside className="side">
          <div className="area">
            <span className="ico">
              <Icon name={nav.icon} size={15} />
            </span>
            {nav.title}
          </div>
          <nav>
            {nav.items.map((item) =>
              item.ready ? (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.href === current ? "page" : undefined}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              ) : (
                <span key={item.href} className="soon">
                  <Icon name={item.icon} />
                  {item.label}
                  <em>준비 중</em>
                </span>
              ),
            )}
          </nav>
          <div className="help">
            <b>도움이 필요하면</b>
            {area === "student"
              ? "계정·응시 문의는 소속 학과 사무실로 연락해 주세요."
              : "운영사 담당자에게 연락해 주세요."}
          </div>
        </aside>

        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
