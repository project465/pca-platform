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
  /**
   * 메뉴는 로그인 여부로 갈리되 순서는 같다. 로그인했다고 항목이 앞뒤로 움직이면
   * 같은 사이트를 두 번 익혀야 한다. '내 신청'만 로그인한 사람에게 끼어든다.
   */
  const nav = [
    { href: "/mentoring", label: "멘토 둘러보기" },
    { href: "/mentoring/guide", label: "이용 안내" },
    { href: "/mentoring/faq", label: "자주 묻는 질문" },
    { href: "/mentoring/contact", label: "문의" },
    ...(user ? [{ href: "/mentoring/requests", label: "내 신청" }] : []),
    { href: "/mentoring/mentor", label: isMentor ? "멘토 콘솔" : "멘토로 참여하기" },
  ];

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
      <footer className="site-foot">
        <div className="foot-cols">
          <div>
            <b>현멘</b>
            <Link href="/mentoring">멘토 둘러보기</Link>
            <Link href="/mentoring/guide">이용 안내</Link>
            <Link href="/mentoring/faq">자주 묻는 질문</Link>
            <Link href="/mentoring/contact">문의</Link>
          </div>
          <div>
            <b>멘토</b>
            <Link href="/mentoring/mentor">멘토로 참여하기</Link>
            <Link href="/mentoring/guide#mentor">정산과 지급</Link>
            <Link href="/mentoring/contact?kind=mentor">멘토 문의</Link>
          </div>
          <div>
            <b>약관</b>
            <Link href="/terms">이용약관</Link>
            <Link href="/privacy">개인정보처리방침</Link>
          </div>
        </div>
        <p className="foot-note">
          현멘은 석·박사 현직자와 석·박사 과정에 있는 사람이 만나는 자리입니다.
          멘토는 익명이며, 운영사가 현직 여부를 확인한 사람만 갤러리에 올라갑니다.
        </p>
      </footer>
    </div>
  );
}
