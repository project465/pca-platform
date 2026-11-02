"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import { isPartner } from "@/lib/brand";
import { issueKey, revokeKey } from "@/lib/partner/link";
import { query } from "@/lib/db";

export type KeyState = { key?: string; err?: string; ok?: string };

/**
 * 제휴 키 만들기. **원래 키는 이 응답에 한 번만 실린다**(화면에 한 번 보이고 어디에도 남지 않는다).
 * 감사 기록에는 키 번호와 종류만 적는다.
 */
export async function issueKeyAction(_p: KeyState, form: FormData): Promise<KeyState> {
  const user = await requireRole(["superadmin"]);
  const partner = String(form.get("partner") ?? "");
  const env = String(form.get("env") ?? "") === "live" ? "live" : "test";
  if (!isPartner(partner)) return { err: "모르는 제휴입니다." };
  const k = await issueKey(partner, env, user.id);
  await audit({ actorId: Number(user.id), actorRole: user.role, action: "partner.key.issue", targetKind: "partner", targetId: partner, orgId: null, detail: { key_id: k.id, env } });
  revalidatePath("/admin/partners");
  return { key: k.key, ok: `${env === "live" ? "운영" : "시험"} 키를 만들었습니다. 지금 복사해 제휴 담당자에게 안전한 길로 전하세요. 이 화면을 벗어나면 다시 볼 수 없습니다.` };
}

export async function revokeKeyAction(form: FormData): Promise<void> {
  const user = await requireRole(["superadmin"]);
  const partner = String(form.get("partner") ?? "");
  const id = String(form.get("id") ?? "");
  if (!isPartner(partner) || !/^\d{1,18}$/.test(id)) return;
  await revokeKey(partner, id);
  await audit({ actorId: Number(user.id), actorRole: user.role, action: "partner.key.revoke", targetKind: "partner", targetId: partner, orgId: null, detail: { key_id: id } });
  revalidatePath("/admin/partners");
}

/** 받기 상태(off · test · live). live 는 대표 승인 뒤에만 켠다 — 화면이 한 번 더 묻는다 */
export async function setStatusAction(form: FormData): Promise<void> {
  const user = await requireRole(["superadmin"]);
  const partner = String(form.get("partner") ?? "");
  const status = String(form.get("status") ?? "");
  if (!isPartner(partner) || !["off", "test", "live"].includes(status)) return;
  await query(`UPDATE partner_configs SET status = $2, updated_at = now(), updated_by = $3 WHERE partner = $1`, [partner, status, user.id]);
  await audit({ actorId: Number(user.id), actorRole: user.role, action: "partner.status", targetKind: "partner", targetId: partner, orgId: null, detail: { status } });
  revalidatePath("/admin/partners");
}

/**
 * MAT 미리보기 계정(공개 전 시험). 아이디 또는 이메일로 넣는다. 넣고 빼는 일은 감사 기록에 남는다.
 * 공개(MAT_PUBLIC=true) 뒤에는 쓰이지 않는다.
 */
export async function addPreviewAction(_p: KeyState, form: FormData): Promise<KeyState> {
  const user = await requireRole(["superadmin"]);
  const who = String(form.get("who") ?? "").trim();
  const note = String(form.get("note") ?? "").trim().slice(0, 120) || null;
  if (!who) return { err: "아이디나 이메일을 적어 주세요." };
  const rows = await query<{ id: string }>(
    `SELECT id::text FROM users WHERE (lower(login_id) = lower($1) OR lower(email) = lower($1)) AND status = 'active' LIMIT 2`, [who]);
  if (rows.length !== 1) return { err: "그 아이디·이메일의 계정을 찾지 못했습니다." };
  await query(`INSERT INTO mat_preview_users (user_id, note, added_by) VALUES ($1, $2, $3)
               ON CONFLICT (user_id) DO UPDATE SET note = EXCLUDED.note`, [rows[0].id, note, user.id]);
  await audit({ actorId: Number(user.id), actorRole: user.role, action: "mat.preview.add", targetKind: "user", targetId: rows[0].id, orgId: null, detail: {} });
  revalidatePath("/admin/partners");
  return { ok: "미리보기 계정에 넣었습니다." };
}

export async function removePreviewAction(form: FormData): Promise<void> {
  const user = await requireRole(["superadmin"]);
  const id = String(form.get("id") ?? "");
  if (!/^\d{1,18}$/.test(id)) return;
  await query(`DELETE FROM mat_preview_users WHERE user_id = $1`, [id]);
  await audit({ actorId: Number(user.id), actorRole: user.role, action: "mat.preview.remove", targetKind: "user", targetId: id, orgId: null, detail: {} });
  revalidatePath("/admin/partners");
}
