import { query, queryOne, tx } from "@/lib/db";
import { createResetToken, hashPassword, hashToken } from "@/lib/password";

export class SignupError extends Error {}

/**
 * 개인 회원가입. 소속이 없는 사람이 개인회원이다 (설계 원칙 1).
 * memberships 에 행을 만들지 않는 것이 곧 개인회원 표시다.
 */
export async function signup(input: {
  email: string;
  name: string;
  password: string;
}): Promise<{ userId: string; token: string }> {
  const dup = await queryOne<{ id: string }>(
    `SELECT id FROM users WHERE lower(email) = lower($1)`,
    [input.email],
  );
  if (dup) throw new SignupError("이미 가입된 이메일입니다. 로그인하거나 비밀번호를 재설정하세요.");

  const hash = await hashPassword(input.password);
  const { token, tokenHash } = createResetToken();

  const userId = await tx(async (c) => {
    const u = await c.query<{ id: string }>(
      `INSERT INTO users (email, display_name, password_hash, must_reset_pw, terms_agreed_at)
       VALUES ($1, $2, $3, false, now())
       RETURNING id`,
      [input.email, input.name, hash],
    );
    const id = u.rows[0].id;
    await c.query(
      `INSERT INTO email_verifications (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + interval '3 days')`,
      [id, tokenHash],
    );
    return id;
  });

  return { userId, token };
}

export async function verifyEmail(token: string): Promise<boolean> {
  const rows = await query<{ user_id: string }>(
    `UPDATE email_verifications
        SET used_at = now()
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
      RETURNING user_id`,
    [hashToken(token)],
  );
  if (rows.length === 0) return false;

  await query(`UPDATE users SET email_verified_at = now() WHERE id = $1`, [rows[0].user_id]);
  return true;
}
