import Link from "next/link";
import { queryOne } from "@/lib/db";
import { hashToken } from "@/lib/password";
import ResetForm from "./reset-form";

export const metadata = { title: "새 비밀번호 설정 — 단체 PCA 플랫폼" };

export default async function ResetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const row = await queryOne<{ display_name: string }>(
    `SELECT u.display_name
       FROM password_reset_tokens t
       JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = $1 AND t.used_at IS NULL AND t.expires_at > now()`,
    [hashToken(token)],
  );

  return (
    <main className="center-wrap">
      <div className="panel narrow">
        <h1>새 비밀번호 설정</h1>

        {row ? (
          <>
            <p className="sub">{row.display_name} 님의 비밀번호를 새로 정합니다.</p>
            <ResetForm token={token} />
          </>
        ) : (
          <>
            <p className="sub">
              이 링크는 만료되었거나 이미 사용되었습니다. 링크는 발급 후 24시간 동안,
              한 번만 쓸 수 있습니다.
            </p>
            <Link className="act solid full" href="/password/forgot">
              다시 발급받기
            </Link>
          </>
        )}

        <div className="foot-links">
          <Link href="/login">로그인</Link>
        </div>
      </div>
    </main>
  );
}
