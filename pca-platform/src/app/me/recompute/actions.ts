"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { applyRecompute } from "@/lib/me-v3/recompute";

/**
 * 다시 계산한 것을 지금 값에 적는다.
 *
 * **사람이 누를 때만 돈다.** 저장하는 순간 자동으로 돌리지 않는 까닭은
 * 둘이다. 계산이 깨진 날 저장까지 막히지 않게 하려는 것이 하나이고,
 * 무엇이 달라지는지 먼저 보고 누르시게 하려는 것이 둘이다.
 */
export async function runRecompute(): Promise<void> {
  const user = await requireUser();
  await applyRecompute(user.id);
  revalidatePath("/me");
  revalidatePath("/me/recompute");
  revalidatePath("/me/gap");
}
