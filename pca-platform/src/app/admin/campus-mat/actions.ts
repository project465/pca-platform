"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { closePool, createPool } from "@/lib/campus/mat";

export type PoolState = { ok?: string; err?: string };

/** 운영자가 계약을 받고 학교에 MAT 인원을 넣는다 */
export async function createPoolAction(
  _prev: PoolState, form: FormData,
): Promise<PoolState> {
  const user = await requireRole(["superadmin"]);
  const r = await createPool({
    universityCode: String(form.get("university") ?? ""),
    productCode: String(form.get("product") ?? ""),
    seats: Number(form.get("seats") ?? 0),
    grantUntil: String(form.get("grant_until") ?? ""),
    memo: String(form.get("memo") ?? ""),
  }, user.id);
  revalidatePath("/admin/campus-mat");
  return r.ok ? { ok: "인원을 넣었습니다. 학교 담당자 화면에 바로 보입니다." } : { err: r.why };
}

/** 묶음을 닫는다. 이미 연 학생의 기간은 그대로다 */
export async function closePoolAction(
  _prev: PoolState, form: FormData,
): Promise<PoolState> {
  const user = await requireRole(["superadmin"]);
  const ok = await closePool(String(form.get("id") ?? ""), user.id);
  revalidatePath("/admin/campus-mat");
  return ok ? { ok: "닫았습니다. 이미 연 학생은 기간이 끝날 때까지 그대로 씁니다." }
    : { err: "이미 닫혀 있습니다." };
}
