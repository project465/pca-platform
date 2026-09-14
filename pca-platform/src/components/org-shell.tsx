import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import { ROLE_LABEL } from "@/lib/roles";
import type { SessionUser } from "@/lib/session";

/**
 * 학과 담당자 셸. 담당자가 보는 것은 자기 학과의 회차와 명단뿐이라
 * 메뉴를 길게 두지 않았다.
 */
export default function OrgShell({
  user,
  orgName,
  current,
  children,
}: {
  user: SessionUser;
  orgName?: string | null;
  /** 지금 보고 있는 메뉴. 없으면 아무것도 선택되지 않는다 */
  current?: string;
  children: React.ReactNode;
}) {
  const nav = [
    { href: "/org", label: "회차" },
    { href: "/org/mentoring", label: "멘토링 이용권" },
  ];

  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/org" style={{ textDecoration: "none" }}>
          단체 PCA
        </Link>
        <nav>
          {nav.map((i) => (
            <Link key={i.href} href={i.href} aria-current={i.href === current ? "page" : undefined}>
              {i.label}
            </Link>
          ))}
        </nav>
        {orgName ? (
          <span style={{ fontSize: 14, color: "var(--muted)" }}>{orgName}</span>
        ) : null}
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
