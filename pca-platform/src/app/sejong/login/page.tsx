import LoginForm from "./form";

export const dynamic = "force-dynamic";

export default async function SejongLoginPage({
  searchParams,
}: { searchParams: Promise<{ denied?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="sj-grid c2" style={{ alignItems: "start" }}>
      <div className="sj-card">
        <h1>로그인</h1>
        <p className="muted small">진흥원이 발급한 아이디로 들어옵니다. 셀프 가입은 없습니다.</p>
        {sp.denied ? (
          <p className="sj-note warn">이 화면을 볼 수 있는 권한이 없는 계정입니다. 다른 계정으로 로그인해 주세요.</p>
        ) : null}
        <LoginForm />
      </div>
      <div className="sj-card">
        <h2>시연 계정</h2>
        <p className="small muted">로컬 시연 DB 에만 있는 계정입니다. 운영에는 없습니다.</p>
        <table className="sj-table">
          <thead><tr><th>역할</th><th>아이디</th><th>비밀번호</th></tr></thead>
          <tbody>
            <tr><td>구직자 (직접 진단)</td><td>sj-demo01</td><td>sejong-seeker-demo-2026</td></tr>
            <tr><td>기관 관리자</td><td>sj-admin</td><td>sejong-admin-demo-2026</td></tr>
            <tr><td>상담사</td><td>sj-counsel1</td><td>sejong-counsel-demo-2026</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
