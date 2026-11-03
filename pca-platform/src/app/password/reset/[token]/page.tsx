import Link from "next/link";
import { queryOne } from "@/lib/db";
import { hashToken } from "@/lib/password";
import ResetForm from "./reset-form";
import { entrySay } from "@/lib/entry-say";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const say = entrySay(await linkLang(token));
  return { title: say("새 비밀번호 설정 · CareerMatri") };
}

/**
 * **링크를 연 사람의 계정 언어로 선다.** 이 쪽은 메일에서 열리므로 화면
 * 쿠키가 없을 때가 많다. 메일이 계정 언어(`users.locale`)로 나갔으니 이
 * 쪽도 그 언어를 따른다. 링크가 죽었으면 한국어다(누구 것인지 모른다).
 */
async function linkLang(token: string): Promise<"ko" | "en"> {
  const r = await queryOne<{ locale: string | null }>(
    `SELECT u.locale FROM password_reset_tokens t JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = $1`, [hashToken(token)]).catch(() => null);
  return r?.locale?.trim() === "en" ? "en" : "ko";
}

export default async function ResetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const lang = await linkLang(token);
  const say = entrySay(lang);

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
        <h1>{say("새 비밀번호 설정")}</h1>

        {row ? (
          <>
            <p className="sub">{say("{name} 님의 비밀번호를 새로 정합니다.", { name: row.display_name })}</p>
            <ResetForm token={token} lang={lang} />
          </>
        ) : (
          <>
            <p className="sub">
              {say("이 링크는 만료되었거나 이미 사용되었습니다. 링크는 발급 후 24시간 동안, 한 번만 쓸 수 있습니다.")}
            </p>
            <Link className="act solid full" href="/password/forgot">
              {say("다시 발급받기")}
            </Link>
          </>
        )}

        <div className="foot-links">
          <Link href="/login">{say("로그인")}</Link>
        </div>
      </div>
    </main>
  );
}
