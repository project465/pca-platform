"use server";

import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { requireUser } from "@/lib/session";
import { homePathFor } from "@/lib/roles";
import { passwordSchema } from "@/lib/validation";

export type ChangeState = { error?: string };

export async function changePasswordAction(
  _prev: ChangeState,
  formData: FormData,
): Promise<ChangeState> {
  const user = await requireUser({ skipPasswordGate: true });

  /* 화면이 보여 준 계정과 지금 저장하려는 계정이 같은가. 다르면 비밀번호를 대어 보지 않고 까닭을 적는다
     (다른 탭에서 계정이 바뀌었거나, 같은 브라우저의 다른 로그인이 읽혔다) */
  const uid = String(formData.get("uid") ?? "");
  if (uid && uid !== String(user.id)) {
    return { error: "이 화면을 연 뒤 이 브라우저의 로그인 계정이 바뀌었습니다. 새로고침한 뒤 '바꾸는 계정'을 확인하고 다시 입력해 주세요." };
  }
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
  /* **아이디(학번 · 전화번호)와 같은 비밀번호는 받지 않는다**(2026-11-02 대표 결정). 학번 · 전화번호는 남이 알기 쉽다 */
  const ids = await queryOne<{ login_id: string | null; sid: string | null }>(
    `SELECT u.login_id, cs.student_id AS sid FROM users u LEFT JOIN campus_students cs ON cs.user_id = u.id WHERE u.id = $1`,
    [user.id]);
  const plain = (s: string | null | undefined) => (s ?? "").replace(/[^0-9A-Za-z]/g, "").toLowerCase();
  const bad = [ids?.login_id, ids?.sid, (ids?.login_id ?? "").replace(/^[a-z]+-/i, "")].map(plain).filter(Boolean);
  if (bad.includes(plain(next))) {
    return { error: "아이디(학번 · 전화번호)와 다른 비밀번호로 정해주세요." };
  }

  /* `pw_login` 을 같이 올린다 — 재설정 쪽과 같은 까닭이다 */
  await query(
    `UPDATE users SET password_hash = $2, must_reset_pw = false, pw_login = true
      WHERE id = $1`,
    [user.id, await hashPassword(next)],
  );

  // 발급된 재설정 링크가 남아 있으면 더는 쓰지 못하게 막는다.
  await query(
    `UPDATE password_reset_tokens SET used_at = now()
      WHERE user_id = $1 AND used_at IS NULL`,
    [user.id],
  );

  /* 담당자는 제 화면으로 바로 보낸다. `/` 는 학생 쿠키를 먼저 보므로,
     같은 브라우저에 학생이 들어가 있으면 학생 화면으로 떨어진다 */
  redirect(user.scope === "staff" ? homePathFor(user.role) : "/");
}
