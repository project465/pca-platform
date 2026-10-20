"use server";

import { revalidatePath } from "next/cache";
import { requireSejong } from "@/sejong/lib/session";
import { setConsent } from "@/sejong/lib/access";

/** 본인만 바꾼다. 줄을 고치지 않고 새 줄을 더한다: 언제 동의하고 언제 철회했는지가 남는다 */
export async function setConsentAction(formData: FormData): Promise<void> {
  const a = await requireSejong("participant");
  const granted = String(formData.get("granted") ?? "") === "1";
  await setConsent(a.userId, a.orgId, granted);
  revalidatePath("/sejong/me");
}
