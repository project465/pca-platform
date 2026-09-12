"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { retryRefund } from "@/lib/billing";
import { PayError } from "@/lib/pay";

export type RetryState = { message?: string; ok?: string };

export async function retryAction(
  _prev: RetryState,
  formData: FormData,
): Promise<RetryState> {
  await requireRole(["superadmin"]);

  try {
    await retryRefund(String(formData.get("paymentId") ?? ""));
  } catch (e) {
    if (e instanceof PayError) return { message: e.message };
    throw e;
  }

  revalidatePath("/admin/refunds");
  revalidatePath("/mentoring/requests");
  return { ok: "환불이 처리됐습니다." };
}
