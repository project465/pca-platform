import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, safeNext } from "@/lib/session";
import LoginForm from "./login-form";
import SocialButtons from "@/components/social-buttons";

export const metadata = { title: "로그인 — 단체 PCA 플랫폼" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  if (await currentUser()) redirect(next);

  return (
    <main className="center-wrap">
      <div className="panel narrow">
        <h1>단체 PCA 플랫폼</h1>
        <p className="sub">
          학과에서 받은 계정으로 들어오거나, 현직자 멘토링을 쓰실 분은 직접 가입하세요.
        </p>

        <LoginForm next={next} />
        <SocialButtons />

        <div className="foot-links">
          <Link href="/password/forgot">비밀번호를 잊으셨나요?</Link>
          <Link href={`/signup?next=${encodeURIComponent(next)}`}>회원가입</Link>
        </div>
      </div>
    </main>
  );
}
