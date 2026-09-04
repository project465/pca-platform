import Link from "next/link";
import ForgotForm from "./forgot-form";

export const metadata = { title: "비밀번호 재설정 — 단체 PCA 플랫폼" };

export default function ForgotPage() {
  return (
    <main className="center-wrap">
      <div className="panel narrow">
        <h1>비밀번호 재설정</h1>
        <p className="sub">등록된 학번이나 이메일을 입력하세요.</p>

        <ForgotForm />

        <div className="foot-links">
          <Link href="/login">로그인</Link>
        </div>
      </div>
    </main>
  );
}
