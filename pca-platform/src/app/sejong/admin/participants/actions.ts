"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne, tx } from "@/lib/db";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { requireSejong } from "@/sejong/lib/session";

export type AddState = { error?: string; issued?: { login: string; password: string; name: string } };

/**
 * 참여자 한 명 발급. 아이디는 참여번호를 소문자로 쓴다. 임시 비밀번호는
 * **이 응답에서 한 번만** 보여 주고 저장하지 않는다(해시만 남는다).
 * 첫 로그인에서 바꾸게 한다(`must_reset_pw`).
 */
export async function addParticipant(_prev: AddState, formData: FormData): Promise<AddState> {
  const a = await requireSejong("admin");
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const no = String(formData.get("participant_no") ?? "").trim().toUpperCase().slice(0, 20);
  const program = String(formData.get("program") ?? "");
  if (!name || !/^[A-Z0-9-]{3,20}$/.test(no)) return { error: "이름과 참여번호(영문·숫자·-, 3~20자)를 적어 주세요." };
  const prog = await queryOne<{ code: string }>(
    `SELECT code FROM sj_programs WHERE code = $1 AND org_id = $2`, [program, a.orgId]);
  if (!prog) return { error: "사업을 골라 주세요." };
  const login = no.toLowerCase();
  const taken = await queryOne<{ id: string }>(`SELECT id FROM users WHERE login_id = $1`, [login]);
  if (taken) return { error: "이미 쓰는 참여번호입니다." };
  const pw = generateTempPassword(12);
  const hash = await hashPassword(pw);
  await tx(async (db) => {
    const u = (await db.query<{ id: string }>(
      `INSERT INTO users (login_id, password_hash, display_name, must_reset_pw, is_demo)
       VALUES ($1,$2,$3,true,true) RETURNING id`, [login, hash, name])).rows[0];
    await db.query(`INSERT INTO memberships (user_id, org_id, role) VALUES ($1,$2,'student')`, [u.id, a.orgId]);
    await db.query(
      `INSERT INTO sj_participants (user_id, org_id, program_code, participant_no) VALUES ($1,$2,$3,$4)`,
      [u.id, a.orgId, prog.code, no]);
  });
  revalidatePath("/sejong/admin/participants");
  return { issued: { login, password: pw, name } };
}

export async function setParticipantStatus(formData: FormData): Promise<void> {
  const a = await requireSejong("admin");
  const uid = String(formData.get("user_id") ?? "");
  const status = String(formData.get("status") ?? "") === "disabled" ? "disabled" : "active";
  if (!/^\d+$/.test(uid)) return;
  await query(`UPDATE sj_participants SET status = $3 WHERE user_id = $1 AND org_id = $2`, [uid, a.orgId, status]);
  revalidatePath("/sejong/admin/participants");
}
