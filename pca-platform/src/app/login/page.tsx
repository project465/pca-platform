import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import LoginForm from "./login-form";
import AuthBrand from "@/components/auth-brand";
import PublicFooter from "@/components/sf/public-footer";
import { BRAND } from "@/lib/surface-text";

export const metadata = { title: "로그인 · CareerMatri" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // 열린 리다이렉트를 막는다. //evil.com 은 브라우저가 외부로 읽는다.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "";
  if (await currentUser()) redirect(safeNext || "/");

  return (
    <main className="center-wrap">
      <div className="authwrap">
        <AuthBrand name={BRAND.root} />
        <div className="panel narrow">
          <h1>다시 오셨군요</h1>
          <p className="sub">
            학교에서 받은 아이디나, 개인으로 가입하신 이메일로 들어오세요.
          </p>

          <LoginForm next={safeNext} />

          <div className="foot-links">
            <Link href="/password/forgot">비밀번호를 잊으셨나요?</Link>
            <Link href={`/signup${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""}`}>
              개인으로 가입하기
            </Link>
          </div>
        </div>

        {/* 한 가지만 하는 쪽이라 법적 표시 전체는 두지 않는다. 약관과
            고객지원으로 가는 길만 남긴다 */}
        <PublicFooter lang="ko" compact />
      </div>
    </main>
  );
}
