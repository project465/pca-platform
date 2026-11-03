"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { latestResult } from "@/lib/me-v3/platform";
import { coreOf } from "@/lib/me-v3/result/model";
import { savePrepAnswer } from "@/lib/me-v3/prep";

/**
 * 지원서·면접 답을 저장한다.
 *
 * **전공은 화면이 보내지 않는다.** 가장 최근 결과가 정한다: 폼이 그 값을
 * 보낼 수 있으면 남의 전공 자리에 답이 쌓이는 길이 생긴다.
 */
export async function savePrep(form: FormData): Promise<void> {
  const user = await requireUser();
  const model = await latestResult(user.id);
  if (!model) redirect("/me/prep");
  const kind = String(form.get("kind") ?? "") === "interview" ? "interview" : "essay";
  const key = String(form.get("key") ?? "").trim();
  if (!key) redirect("/me/prep");
  await savePrepAnswer(user.id, {
    core: coreOf(model), kind, key,
    prompt: String(form.get("prompt") ?? ""),
    answer: String(form.get("answer") ?? ""),
  });
  revalidatePath("/me/prep");
  const anchor = `p-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  redirect(`/me/prep?saved=${encodeURIComponent(key)}#${anchor}`);
}
