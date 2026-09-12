import { queryOne, tx } from "@/lib/db";
import { randomBytes } from "node:crypto";

/**
 * 소셜로 들어온 사람을 users 에 붙인다.
 *
 * 이미 붙어 있으면 그 계정, 이메일이 같은 계정이 있으면 거기에 붙이고,
 * 둘 다 아니면 새로 만든다. 이메일을 안 주는 계정도 있어서 제공자 id 가 기준이다.
 * 비밀번호는 쓸 수 없는 값으로 채운다 — 소셜 계정은 비밀번호 로그인을 하지 않는다.
 */
export async function linkSocialUser(input: {
  provider: string;
  providerUserId: string;
  email: string | null;
  name: string | null;
}): Promise<string | null> {
  if (!input.provider || !input.providerUserId) return null;

  const linked = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM user_identities WHERE provider = $1 AND provider_user_id = $2`,
    [input.provider, input.providerUserId],
  );
  if (linked) return linked.user_id;

  return tx(async (c) => {
    let userId: string | null = null;

    if (input.email) {
      const found = await c.query<{ id: string }>(
        `SELECT id FROM users WHERE lower(email) = lower($1)`,
        [input.email],
      );
      userId = found.rows[0]?.id ?? null;
    }

    if (!userId) {
      const made = await c.query<{ id: string }>(
        `INSERT INTO users
           (email, display_name, password_hash, must_reset_pw, terms_agreed_at, email_verified_at)
         VALUES ($1, $2, $3, false, now(), CASE WHEN $1::text IS NULL THEN NULL ELSE now() END)
         RETURNING id`,
        [
          input.email,
          input.name?.trim() || "이름 없음",
          `social:${randomBytes(24).toString("hex")}`,
        ],
      );
      userId = made.rows[0].id;
    }

    await c.query(
      `INSERT INTO user_identities (user_id, provider, provider_user_id, email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (provider, provider_user_id) DO NOTHING`,
      [userId, input.provider, input.providerUserId, input.email],
    );

    return userId;
  });
}

export function socialProviders(): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
    out.push({ id: "kakao", label: "카카오로 계속하기" });
  }
  if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
    out.push({ id: "naver", label: "네이버로 계속하기" });
  }
  return out;
}
