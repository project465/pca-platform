"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { saveprices } from "@/lib/billing";

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
