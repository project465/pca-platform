"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { anonymizeUser } from "@/lib/erasure";
import { UI, isLang, type Lang } from "@/lib/locale";

export type EraseState = { error?: string };

/**
 * 본인 탈퇴.
 *
 * 되돌릴 수 없으므로 확인 단어를 한 번 받는다. 체크박스 하나로 끝내면
 * 실수로 누른 사람과 정말 나가려는 사람을 구별할 수 없다.
 */
export async function eraseMe(_prev: EraseState, form: FormData): Promise<EraseState> {
  const user = await requireUser();
  const lang: Lang = isLang(String(form.get("lang"))) ? (String(form.get("lang")) as Lang) : "ko";
  const typed = String(form.get("confirm") ?? "").trim();

  if (typed !== UI.erConfirmWord[lang]) {
    return { error: UI.erMismatch[lang] };
  }

  await anonymizeUser(user.id, { requestedBy: "self", reason: "withdraw" });
  // 세션을 먼저 끊는다. 익명화된 계정으로 화면이 다시 그려지면 안 된다.
  await signOut({ redirect: false });
  redirect("/start");
}
