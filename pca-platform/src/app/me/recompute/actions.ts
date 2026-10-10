"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { applyRecompute } from "@/lib/me-v3/recompute";
import { mark } from "@/lib/me-v3/workspace-events";

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
  await mark("current_state_updated", user.id);
  revalidatePath("/me");
  revalidatePath("/me/recompute");
  revalidatePath("/me/state");
  revalidatePath("/me/next");
  revalidatePath("/me/gap");
  /* **반영한 사람을 반영 화면에 세워 두지 않는다**(규격 §17). 누른 뒤에
     볼 것은 달라진 지금 상태이고, 그 자리에서 다음 할 일이 이어진다.
     여기 남겨 두면 `반영할 거리가 없습니다` 만 읽고 길이 끊긴다 */
  redirect("/me/state?r=1");
}
