"use server";

import { query, queryOne, tx } from "@/lib/db";
import { createResetToken } from "@/lib/password";

export type ForgotState = { done?: boolean; devLink?: string };

const TOKEN_TTL_HOURS = 24;

/**
 * 계정이 있든 없든 같은 화면을 돌려준다.
 * 응답이 다르면 남의 학번이 등록돼 있는지 확인하는 수단이 된다.
 *
 * 메일 발송은 아직 붙어 있지 않다. 학생 계정은 email 이 없는 경우가 많아
 * 실제 운영에서는 학과 담당자가 재설정 링크를 발급해 전달하는 경로가 주가 된다.
 */
export async function forgotAction(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  if (!identifier) return { done: true };

  const user = await queryOne<{ id: string; email: string | null }>(
    `SELECT id, email FROM users
      WHERE (login_id = $1 OR lower(email) = lower($1)) AND status = 'active'
      LIMIT 1`,
    [identifier],
  );

  if (!user) return { done: true };

  const { token, tokenHash } = createResetToken();

  await tx(async (c) => {
    // 이전에 발급한 링크는 무효로 돌린다. 살아 있는 링크는 항상 하나다.
    await c.query(
      `UPDATE password_reset_tokens SET used_at = now()
        WHERE user_id = $1 AND used_at IS NULL`,
      [user.id],
    );
    await c.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + ($3 || ' hours')::interval)`,
      [user.id, tokenHash, String(TOKEN_TTL_HOURS)],
    );
  });

  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const link = `${base}/password/reset/${token}`;

  if (process.env.NODE_ENV === "production") {
    // TODO: 메일 발송 연결. 그 전까지는 담당자 발급 경로만 실제로 동작한다.
    console.info("[password-reset] issued for user", user.id);
    return { done: true };
  }

  return { done: true, devLink: link };
}

export async function countActiveTokens(userId: string): Promise<number> {
  const rows = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM password_reset_tokens
      WHERE user_id = $1 AND used_at IS NULL AND expires_at > now()`,
    [userId],
  );
  return Number(rows[0]?.n ?? 0);
}
