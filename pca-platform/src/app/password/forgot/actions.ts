"use server";

import { query, queryOne, tx } from "@/lib/db";
import { createResetToken } from "@/lib/password";
import { sendMail } from "@/lib/mail";
import { resetMail } from "@/lib/mail-templates";

export type ForgotState = { done?: boolean; devLink?: string };

const TOKEN_TTL_HOURS = 24;

/**
 * 계정이 있든 없든 같은 화면을 돌려준다.
 * 응답이 다르면 남의 학번이 등록돼 있는지 확인하는 수단이 된다.
 *
 * 이메일이 있는 계정에는 메일로 보낸다. 학생 계정은 email 이 없는 경우가
 * 많으므로, 그때는 학과 담당자가 재설정 링크를 발급해 전달하는 경로가 남는다.
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

  /* 메일이 나갔는지 여부도 화면에 알리지 않는다. 알리면 그 계정에 이메일이
     있는지가 드러나고, 위에서 같은 화면을 돌려주기로 한 이유가 무너진다 */
  if (user.email) {
    await sendMail(resetMail("ko", { to: user.email, setupUrl: link, hours: TOKEN_TTL_HOURS }));
  } else {
    console.info("[password-reset] 이메일이 없는 계정. 담당자 발급 경로로 전달해야 한다", user.id);
  }

  // 개발 중에는 메일함을 열지 않고도 확인할 수 있게 링크를 함께 돌려준다
  if (process.env.NODE_ENV === "production") return { done: true };
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
