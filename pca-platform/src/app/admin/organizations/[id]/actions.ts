"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne, tx } from "@/lib/db";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { requireRole } from "@/lib/session";

export type StaffState = {
  error?: string;
  issued?: { name: string; loginId: string; role: string; tempPassword: string };
};

const ALLOWED = new Set(["org_admin", "instructor"]);

/**
 * 학과 담당자·교수 계정을 발급한다.
 *
 * 이게 없으면 기관과 계약을 만들어 놓고도 그 학과 사람이 로그인할 방법이 없다.
 * 학생은 명단 업로드로 생기지만 담당자는 어디서도 생기지 않아, 지금까지는
 * SQL 을 직접 쳐야 했다.
 *
 * 임시 비밀번호는 여기서 한 번만 보여주고 저장하지 않는다 — 명단 발급과
 * 같은 규칙이다. must_reset_pw 로 첫 로그인 때 반드시 바꾸게 한다.
 */
export async function issueStaff(_prev: StaffState, form: FormData): Promise<StaffState> {
  await requireRole(["superadmin"]);

  const orgId = String(form.get("orgId") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const loginId = String(form.get("loginId") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const role = String(form.get("role") ?? "");

  if (!ALLOWED.has(role)) return { error: "역할을 고르세요." };
  if (!name) return { error: "이름을 적어 주세요." };
  if (name.length > 60) return { error: "이름이 너무 깁니다." };
  if (!loginId && !email) return { error: "아이디나 이메일 중 하나는 있어야 합니다." };
  if (loginId && !/^[A-Za-z0-9_.-]{3,40}$/.test(loginId)) {
    return { error: "아이디는 영문·숫자·하이픈·밑줄 3~40자여야 합니다." };
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(email)) {
    return { error: "이메일 형식이 아닙니다." };
  }

  const org = await queryOne<{ id: string }>(
    `SELECT id FROM organizations WHERE id = $1 AND status = 'active'`,
    [orgId],
  );
  if (!org) return { error: "기관을 찾을 수 없습니다." };

  // 이미 있는 사람인지 먼저 본다. 예외로 흐름을 만들면 트랜잭션이 자기가 한
  // 일을 되돌려 놓고 밖에서 다시 하는 꼴이 된다.
  const existing = await queryOne<{ id: string; name: string; ident: string }>(
    `SELECT id, display_name AS name, COALESCE(login_id, email) AS ident
       FROM users
      WHERE ($1 <> '' AND lower(login_id) = lower($1))
         OR ($2 <> '' AND lower(email) = lower($2))
      LIMIT 1`,
    [loginId, email],
  );

  if (existing) {
    // 계정을 새로 만들지 않고 이 기관에 붙이기만 한다. 비밀번호는 건드리지
    // 않는다 — 다른 기관에서 쓰고 있을 수 있다.
    await query(
      `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, org_id, role) DO NOTHING`,
      [existing.id, orgId, role],
    );
    revalidatePath(`/admin/organizations/${orgId}`);
    return {
      error: `이미 있는 계정(${existing.ident})이라 이 기관에 역할만 붙였습니다. 비밀번호는 그대로입니다.`,
    };
  }

  const temp = generateTempPassword();
  const hash = await hashPassword(temp);

  try {
    await tx(async (c) => {
      const made = await c.query<{ id: string }>(
        `INSERT INTO users (login_id, email, display_name, password_hash, must_reset_pw, status)
         VALUES (NULLIF($1,''), NULLIF($2,''), $3, $4, true, 'active') RETURNING id`,
        [loginId, email, name, hash],
      );
      await c.query(
        `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, $3)`,
        [made.rows[0].id, orgId, role],
      );
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "발급하지 못했습니다." };
  }

  revalidatePath(`/admin/organizations/${orgId}`);
  return { issued: { name, loginId: loginId || email, role, tempPassword: temp } };
}

/** 담당자 비밀번호 재발급. 학생 재발급과 같은 규칙이다. */
export async function resetStaff(_prev: StaffState, form: FormData): Promise<StaffState> {
  await requireRole(["superadmin"]);
  const orgId = String(form.get("orgId") ?? "");
  const userId = String(form.get("userId") ?? "");

  const who = await queryOne<{ id: string; name: string; ident: string; role: string }>(
    `SELECT u.id, u.display_name AS name, COALESCE(u.login_id, u.email) AS ident, m.role
       FROM memberships m JOIN users u ON u.id = m.user_id
      WHERE m.org_id = $1 AND u.id = $2 AND m.role IN ('org_admin','instructor')
      LIMIT 1`,
    [orgId, userId],
  );
  if (!who) return { error: "이 기관의 담당자가 아닙니다." };

  const temp = generateTempPassword();
  const hash = await hashPassword(temp);
  await query(`UPDATE users SET password_hash = $2, must_reset_pw = true WHERE id = $1`, [
    who.id,
    hash,
  ]);
  await query(
    `UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL`,
    [who.id],
  );

  revalidatePath(`/admin/organizations/${orgId}`);
  return { issued: { name: who.name, loginId: who.ident, role: who.role, tempPassword: temp } };
}
