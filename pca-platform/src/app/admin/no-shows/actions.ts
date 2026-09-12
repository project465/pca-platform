"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { NoShowError, resolveNoShow } from "@/lib/noshow";

export type ResolveState = { message?: string; ok?: string };

export async function resolveAction(
  _prev: ResolveState,
  formData: FormData,
): Promise<ResolveState> {
  const admin = await requireRole(["superadmin"]);
  const accept = String(formData.get("decision") ?? "") === "accept";

  try {
    await resolveNoShow({
      reportId: String(formData.get("reportId") ?? ""),
      adminId: admin.id,
      accept,
      note: String(formData.get("note") ?? "").trim() || null,
    });
  } catch (e) {
    if (e instanceof NoShowError) return { message: e.message };
    throw e;
  }

  revalidatePath("/admin/no-shows");
  revalidatePath("/admin/payouts");
  revalidatePath("/mentoring/requests");
  revalidatePath("/mentoring/mentor");
  return {
    ok: accept
      ? "인정 처리했습니다. 멘토 노쇼였다면 전액 환불이 나갑니다."
      : "기각 처리했습니다. 세션이 열린 것으로 돌아갑니다.",
  };
}
