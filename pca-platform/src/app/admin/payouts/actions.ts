"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { buildPayouts, markPayoutPaid, PayoutError } from "@/lib/payout";

export type PayoutState = { message?: string; ok?: string };

export async function buildAction(): Promise<PayoutState> {
  await requireRole(["superadmin"]);
  const { made, skipped } = await buildPayouts();
  if (skipped) return { message: skipped };
  revalidatePath("/admin/payouts");
  return { ok: made === 0 ? "새로 잡을 정산이 없습니다." : `정산 ${made}건을 잡았습니다.` };
}

export async function payAction(
  _prev: PayoutState,
  formData: FormData,
): Promise<PayoutState> {
  await requireRole(["superadmin"]);
  const id = String(formData.get("payoutId") ?? "");
  const memo = String(formData.get("memo") ?? "").trim() || null;

  try {
    await markPayoutPaid(id, memo);
  } catch (e) {
    if (e instanceof PayoutError) return { message: e.message };
    throw e;
  }
  revalidatePath("/admin/payouts");
  return { ok: "지급 처리했습니다." };
}
