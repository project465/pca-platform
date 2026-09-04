"use server";

import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { requireUser } from "@/lib/session";
import { passwordSchema } from "@/lib/validation";

export type ChangeState = { error?: string };

export async function changePasswordAction(
  _prev: ChangeState,
  formData: FormData,
): Promise<ChangeState> {
  const user = await requireUser({ skipPasswordGate: true });

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const parsed = passwordSchema.safeParse(next);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (next !== confirm) return { error: "새 비밀번호가 서로 다릅니다." };

  const row = await queryOne<{ password_hash: string }>(
    `SELECT password_hash FROM users WHERE id = $1`,
    [user.id],
  );
  if (!row) return { error: "계정을 찾을 수 없습니다." };

  if (!(await verifyPassword(current, row.password_hash))) {
    return { error: "지금 쓰는 비밀번호가 올바르지 않습니다." };
  }
  if (await verifyPassword(next, row.password_hash)) {
    return { error: "지금 쓰는 비밀번호와 다른 것으로 정해주세요." };
  }

  await query(
    `UPDATE users SET password_hash = $2, must_reset_pw = false WHERE id = $1`,
    [user.id, await hashPassword(next)],
  );

  // 발급된 재설정 링크가 남아 있으면 더는 쓰지 못하게 막는다.
  await query(
    `UPDATE password_reset_tokens SET used_at = now()
      WHERE user_id = $1 AND used_at IS NULL`,
    [user.id],
  );

  redirect("/");
}
