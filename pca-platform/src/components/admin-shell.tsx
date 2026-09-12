import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import { ROLE_LABEL } from "@/lib/roles";
import type { SessionUser } from "@/lib/session";

type NavItem = { href: string; label: string; ready: boolean };

/** 화면 목록(CLAUDE.md)의 운영사 관리자 1~5번 + 현멘. 만든 것만 링크가 된다. */
const NAV: NavItem[] = [
  { href: "/admin/organizations", label: "기관", ready: true },
  { href: "/admin/contracts", label: "계약·응시권", ready: true },
  { href: "/admin/instruments", label: "검사 문항", ready: true },
  { href: "/admin/mappings", label: "매핑 데이터", ready: false },
  { href: "/admin/attempts", label: "응시 현황", ready: false },
  { href: "/admin/mentors", label: "현직자 멘토", ready: true },
  { href: "/admin/prices", label: "가격·정책", ready: true },
  { href: "/admin/payouts", label: "멘토 정산", ready: true },
  { href: "/admin/no-shows", label: "노쇼 신고", ready: true },
  { href: "/admin/refunds", label: "환불 실패", ready: true },
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
