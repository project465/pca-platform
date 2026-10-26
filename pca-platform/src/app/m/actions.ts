"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { markNudgesRead } from "@/lib/assistant/nudges";
import { setEmailDigest } from "@/lib/assistant/settings";
import { moveAction } from "../me/next/actions";

/**
 * 앱 화면의 단추가 부르는 일. **새 판단을 하지 않는다**: 웹 작업공간이
 * 부르는 함수를 그대로 부르고, 끝난 뒤 돌아갈 자리만 앱 쪽으로 바꾼다.
 * 웹 쪽 함수는 `/me/...` 로 보내기 때문에 그대로 쓰면 앱에서 웹으로 넘어간다.
 */

/** 할 일 한 줄의 상태를 바꾼다(`moveAction` 그대로) */
export async function appMoveAction(form: FormData): Promise<void> {
  await moveAction(form);
  revalidatePath("/m");
  revalidatePath("/m/todo");
  const back = String(form.get("back") ?? "");
  redirect(back === "/m" ? "/m" : "/m/todo");
}

export async function appReadAll(): Promise<void> {
  const user = await requireUser();
  await markNudgesRead(user.id);
  revalidatePath("/m");
  revalidatePath("/m/alerts");
  redirect("/m/alerts");
}

export async function appDigest(form: FormData): Promise<void> {
  const user = await requireUser();
  await setEmailDigest(user.id, String(form.get("on") ?? "") === "1");
  revalidatePath("/m/profile");
  redirect("/m/profile#settings");
}
