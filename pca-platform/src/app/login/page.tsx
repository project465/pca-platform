import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import LoginForm from "./login-form";

export const metadata = { title: "로그인 — 단체 PCA 플랫폼" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/");

  return (
    <main className="center-wrap">
      <div className="panel narrow">
        <h1>단체 PCA 플랫폼</h1>
        <p className="sub">
          계정은 학과를 통해 발급됩니다. 직접 가입하는 절차는 없습니다.
        </p>

        <LoginForm />

        <div className="foot-links">
          <Link href="/password/forgot">비밀번호를 잊으셨나요?</Link>
        </div>
      </div>
    </main>
  );
}
