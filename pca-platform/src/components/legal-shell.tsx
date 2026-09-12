import Link from "next/link";

/**
 * 약관·개인정보처리방침이 쓰는 껍데기. 로그인 전에도 읽어야 하므로
 * 다른 셸(응시·현멘·관리자)과 섞지 않는다.
 */
export default function LegalShell({
  title,
  effective,
  children,
}: {
  title: string;
  /** 시행일. 고칠 때마다 올린다 */
  effective: string;
  children: React.ReactNode;
}) {
  return (
    <div className="legal-wrap">
      <header>
        <Link href="/mentoring" className="back">
          ← 현멘으로
        </Link>
        <h1>{title}</h1>
        <p className="effective">시행일 {effective}</p>
      </header>
      <article className="legal">{children}</article>
      <footer className="legal-foot">
        <Link href="/terms">이용약관</Link>
        <Link href="/privacy">개인정보처리방침</Link>
        <Link href="/signup">회원가입</Link>
      </footer>
    </div>
  );
}
