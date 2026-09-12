import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import type { SessionUser } from "@/lib/session";

/**
 * 현멘은 검사 응시와 다른 목적으로 들어오는 화면이므로 셸을 따로 둔다.
 * 브랜드 표기는 '현멘'. 멘토 콘솔 링크는 멘토로 등록된 사람에게만 보인다.
 *
 * 로그인하지 않은 사람도 갤러리와 멘토 상세를 본다(2026-09-12).
 * 개인이 직접 결제하는 서비스인데 어떤 멘토가 있는지 보지도 못하고 가입부터
 * 하라고 하면 아무도 들어오지 않는다. 로그인은 신청 버튼에서 받는다.
 */
export default function MentoringShell({
  user,
  current,
  isMentor,
  children,
}: {
  /** 로그인하지 않았으면 null */
  user: SessionUser | null;
  current: string;
  isMentor: boolean;
  children: React.ReactNode;
}) {
  const nav = user
    ? [
        { href: "/mentoring", label: "멘토 둘러보기" },
        { href: "/mentoring/requests", label: "내 신청" },
        { href: "/mentoring/mentor", label: isMentor ? "멘토 콘솔" : "멘토로 참여하기" },
      ]
    : [{ href: "/mentoring", label: "멘토 둘러보기" }];

  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/mentoring" style={{ textDecoration: "none" }}>
          현멘 <span style={{ fontWeight: 500, color: "var(--muted)" }}>현직자 멘토링</span>
        </Link>
        <nav>
          {nav.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={i.href === current ? "page" : undefined}
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="who">
          {user ? (
            <>
              <span>{user.name} 님</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href={`/login?next=${encodeURIComponent(current)}`}>로그인</Link>
              <Link className="act solid" href="/signup">
                가입
              </Link>
            </>
          )}
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
