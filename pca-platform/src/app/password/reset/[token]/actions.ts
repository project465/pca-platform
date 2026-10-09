"use server";

import { redirect } from "next/navigation";
import { queryOne, tx } from "@/lib/db";
import { hashPassword, hashToken } from "@/lib/password";
import { passwordSchema } from "@/lib/validation";

export type ResetState = { error?: string };

export async function resetAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const parsed = passwordSchema.safeParse(next);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (next !== confirm) return { error: "새 비밀번호가 서로 다릅니다." };

  const row = await queryOne<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM password_reset_tokens
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [hashToken(token)],
  );
  if (!row) {
    return { error: "링크가 만료되었거나 이미 사용되었습니다. 다시 발급받으세요." };
  }

  const hash = await hashPassword(next);
  /* **`pw_login` 을 같이 올린다.** 소셜로만 만든 계정은 그 칸이 `false`
     다. 비밀번호를 정하면 그 순간부터 비밀번호로 들어올 수 있는데, 칸을
     그대로 두면 `/my` 의 `로그인 방법` 이 **없다고 적는다.** 들고 있는
     열쇠를 없다고 적으면 공급자 쪽이 막힌 날 그 사람은 자기가 잠긴 줄
     안다 */
  await tx(async (c) => {
    await c.query(
      `UPDATE users SET password_hash = $2, must_reset_pw = false, pw_login = true
      WHERE id = $1`,
      [row.user_id, hash],
    );
    await c.query(`UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`, [
      row.id,
    ]);
  });

  redirect("/login?reset=done");
}
