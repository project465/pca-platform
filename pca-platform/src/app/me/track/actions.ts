"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { markTrackInterest } from "@/lib/me-v3/platform";

/**
 * 켜지면 알려 달라는 표시.
 *
 * **결제가 아니다.** 여기서 하는 일은 어느 기능을 기다리는 사람이 있는지
 * 세는 것이고, 그 수로 켜는 차례를 정한다. 구독 결제는 이 회차의 범위가
 * 아니다.
 */
export async function toggleInterest(form: FormData): Promise<void> {
  const user = await requireUser();
  const feature = String(form.get("feature") ?? "");
  const on = String(form.get("on") ?? "") === "1";
  if (!feature) return;
  await markTrackInterest(user.id, feature, on);
  revalidatePath("/me/track");
  revalidatePath("/me");
}
