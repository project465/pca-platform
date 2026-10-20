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
        <p className="small muted">
          시연 계정과 비밀번호는 진흥원 시연 담당자에게 따로 받습니다. 화면과 저장소에는
          적지 않습니다. 시연 DB 에는 가상 참여자와 합성 자료만 들어 있습니다.
        </p>
      </div>
    </div>
  );
}
