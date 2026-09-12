"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { saveprices } from "@/lib/billing";
import { savePayoutSettings, saveRefundRules } from "@/lib/refund";

export type PriceState = { message?: string; ok?: string };

export async function savePricesAction(
  _prev: PriceState,
  formData: FormData,
): Promise<PriceState> {
  const admin = await requireRole(["superadmin"]);

  const rows: { minutes: number; amount: number }[] = [];
  for (const [key, value] of formData.entries()) {
    const m = /^p:(\d+)$/.exec(key);
    if (!m) continue;
    const amount = Number(String(value).trim() || "0");
    if (!Number.isInteger(amount) || amount < 0 || amount > 10_000_000) {
      return { message: "금액은 0 이상 1,000만 원 이하의 정수여야 합니다." };
    }
    rows.push({ minutes: Number(m[1]), amount });
  }
  if (rows.length === 0) return { message: "저장할 값이 없습니다." };

  await saveprices(rows, admin.id);
  revalidatePath("/admin/prices");
  return { ok: "정가표를 저장했습니다. 이후 신청부터 적용됩니다." };
}

export async function saveRefundAction(
  _prev: PriceState,
  formData: FormData,
): Promise<PriceState> {
  const admin = await requireRole(["superadmin"]);

  const rows: { hoursBefore: number; percent: number }[] = [];
  for (const [key, value] of formData.entries()) {
    const m = /^r:(\d+)$/.exec(key);
    if (!m) continue;
    const percent = Number(String(value).trim() || "0");
    if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
      return { message: "환불율은 0에서 100 사이의 정수여야 합니다." };
    }
    rows.push({ hoursBefore: Number(m[1]), percent });
  }

  await saveRefundRules(rows, admin.id);
  revalidatePath("/admin/prices");
  return { ok: "환불 규칙을 저장했습니다." };
}

export async function savePayoutAction(
  _prev: PriceState,
  formData: FormData,
): Promise<PriceState> {
  const admin = await requireRole(["superadmin"]);

  const fee = Number(String(formData.get("fee") ?? "").trim());
  const wh = Number(String(formData.get("withholding") ?? "").trim());
  if (!Number.isFinite(fee) || fee < 0 || fee > 100) return { message: "수수료율은 0~100 사이여야 합니다." };
  if (!Number.isFinite(wh) || wh < 0 || wh > 100) return { message: "원천징수율은 0~100 사이여야 합니다." };
  const hold = Number(String(formData.get("holdHours") ?? "").trim());
  if (!Number.isInteger(hold) || hold < 0 || hold > 720) {
    return { message: "정산 보류 시간은 0에서 720 사이의 정수여야 합니다." };
  }

  await savePayoutSettings(fee, wh, hold, admin.id);
  revalidatePath("/admin/prices");
  revalidatePath("/admin/payouts");
  return { ok: "정산 설정을 저장했습니다. 이후 끝나는 세션부터 적용됩니다." };
}
