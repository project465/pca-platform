"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { tx } from "@/lib/db";
import { markTrackInterest } from "@/lib/me-v3/platform";
import { grantProTrialTx, proTrialClaimable } from "@/lib/track";

/**
 * 준비 중인 기능이 켜지면 알려 달라는 표시.
 *
 * **결제가 아니다.** 어느 기능을 기다리는 사람이 있는지 세는 것이고, 그
 * 수로 켜는 차례를 정한다.
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

/**
 * PRO 결과지를 이 기능이 생기기 전에 사신 분의 첫 한 달.
 *
 * **받을 수 있는지는 서버가 다시 본다.** 단추가 서 있었다는 것이 받을
 * 자격이 아니다. 두 번 눌러도 한 번만 붙는다(`entitlements_track_trial_uniq`).
 */
export async function claimTrial(): Promise<void> {
  const user = await requireUser();
  if (await proTrialClaimable(user.id)) {
    await tx((c) => grantProTrialTx(c, user.id));
  }
  revalidatePath("/me/track");
  revalidatePath("/me");
  redirect("/me/track?trial=1");
}
