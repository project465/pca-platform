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
