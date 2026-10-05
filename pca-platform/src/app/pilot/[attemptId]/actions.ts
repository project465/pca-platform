"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { attemptOf } from "@/lib/me-v2/attempt";
import { items, save } from "@/lib/pilot";

export type PilotState = { error?: string };

/**
 * 답을 적는다.
 *
 * **본인 응시인지 서버가 본다.** 폼이 보낸 응시 번호를 믿지 않는다.
 */
export async function savePilotAction(
  _prev: PilotState,
  form: FormData,
): Promise<PilotState> {
  const user = await requireUser();
  const attemptId = String(form.get("attempt") ?? "");
  const a = await attemptOf(attemptId, user.id);
  if (!a || !a.submitted_at) return { error: "답할 수 없는 응시입니다." };

  const all = await items();
  await save({
    attemptId, userId: user.id,
    answers: all.map((it) => ({
      code: it.code,
      value: it.kind === "scale" ? Number(form.get(`v-${it.code}`)) || null : null,
      text: it.kind === "text" ? String(form.get(`t-${it.code}`) ?? "") : null,
    })),
  });
  redirect(`/pilot/${attemptId}?done=1`);
}
