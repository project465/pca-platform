import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import { ROLE_LABEL } from "@/lib/roles";
import type { SessionUser } from "@/lib/session";

type NavItem = { href: string; label: string; ready: boolean };

/** 화면 목록(CLAUDE.md)의 운영사 관리자 1~5번. 만든 것만 링크가 된다. */
const NAV: NavItem[] = [
  { href: "/admin/applications", label: "도입 신청", ready: true },
  { href: "/admin/organizations", label: "기관", ready: true },
  { href: "/admin/contracts", label: "계약·응시권", ready: false },
  { href: "/admin/instruments", label: "검사 문항", ready: false },
  { href: "/admin/mappings", label: "매핑 데이터", ready: false },
  { href: "/admin/attempts", label: "응시 현황", ready: false },
];

export default function AdminShell({
  user,
  current,
  children,
}: {
  user: SessionUser;
  current: string;
  children: React.ReactNode;
}) {
  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">단체 PCA</span>
        <nav>
          {NAV.map((item) =>
            item.ready ? (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.href === current ? "page" : undefined}
              >
                {item.label}
              </Link>
            ) : (
              <span key={item.href} className="soon" title="아직 만들지 않았습니다">
                {item.label}
              </span>
            ),
          )}
        </nav>
        <div className="who">
          <span>
            {user.name} · {ROLE_LABEL[user.role]}
          </span>
          <LogoutButton />
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
