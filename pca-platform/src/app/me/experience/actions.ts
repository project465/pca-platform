"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { addExperience, removeExperience } from "@/lib/me-v3/platform";
import { mark } from "@/lib/me-v3/workspace-events";

/**
 * 경험 하나를 저장한다.
 *
 * **고른 것만 받는다.** 기술영역과 판단축과 산출물은 보기에서 오고, 자유
 * 입력은 제목과 한 줄 메모뿐이다. 메모는 판정에 들어가지 않고 기한이 지나면
 * 지워진다.
 *
 * **저장만으로 Gap 이 바뀌지 않는다.** 다시 계산할 일을 `career_events` 에
 * 한 줄 쌓고, 그 줄을 처리하는 일은 다음 회차다. 화면이 그 사실을 적는다.
 */
export async function saveExperience(form: FormData): Promise<void> {
  const user = await requireUser();
  const title = String(form.get("title") ?? "").trim();
  const kind = String(form.get("kind") ?? "");
  if (!title || !kind) return;
  await addExperience(user.id, {
    kind, title,
    started_on: String(form.get("started_on") ?? "") || null,
    ended_on: String(form.get("ended_on") ?? "") || null,
    td_codes: form.getAll("td").map(String),
    axis_codes: form.getAll("axis").map(String),
    problems: form.getAll("problem").map(String),
    decisions: form.getAll("decision").map(String),
    artifacts: form.getAll("artifact").map(String),
    verifications: form.getAll("verification").map(String),
    used_where: form.getAll("used_where").map(String),
    note_text: String(form.get("note") ?? ""),
  });
  await mark("experience_added", user.id, { n: form.getAll("td").length });
  revalidatePath("/me");
  revalidatePath("/me/experience");
  redirect("/me/experience");
}

export async function dropExperience(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  if (!id) return;
  await removeExperience(user.id, id);
  revalidatePath("/me");
  revalidatePath("/me/experience");
}
