"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { InquiryError, markAnswered } from "@/lib/inquiry";

export type AnswerState = { message?: string; ok?: string };

export async function answerAction(
  _prev: AnswerState,
  formData: FormData,
): Promise<AnswerState> {
  const admin = await requireRole(["superadmin"]);

  try {
    await markAnswered(
      String(formData.get("inquiryId") ?? ""),
      admin.id,
      String(formData.get("memo") ?? "").trim() || null,
    );
  } catch (e) {
    if (e instanceof InquiryError) return { message: e.message };
    throw e;
  }

  revalidatePath("/admin/inquiries");
  return { ok: "처리했습니다." };
}
