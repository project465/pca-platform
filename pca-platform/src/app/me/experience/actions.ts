"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { addExperience, removeExperience } from "@/lib/me-v3/platform";
import { mark } from "@/lib/me-v3/workspace-events";
import { opFail, ref } from "@/lib/oplog";

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
  /* **조용히 돌아서지 않는다**(규격 §39). 전에는 비어 있으면 그대로
     `return` 이었고, 누른 사람은 아무 일도 일어나지 않는 단추를 봤다 */
  if (!title || !kind) redirect("/me/experience/new?e=form");
  /* **저장 실패와 반영 실패를 가른다**(규격 §19). 저장이 거절된 사람은
     적은 글을 잃었으므로 그 화면에서 다시 눌러야 하고, 저장은 됐는데
     계산이 안 된 사람은 **다시 적을 일이 없다.** 한 문장으로 적으면 뒤쪽
     사람이 자기 기록이 사라진 줄 알고 처음부터 다시 적는다.

     **까닭을 버리지 않는다.** 화면에는 무엇을 할 수 있는지만 적고, 왜
     틀어졌는지는 고치는 사람이 읽는 자리에 한 줄 남긴다 */
  let id = "";
  try {
    id = await addExperience(user.id, {
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
  } catch (e) {
    opFail({
      operation: "experience.add", ref: ref("user", user.id),
      step: "insert", category: "db",
    }, e);
    /* `redirect()` 는 던져서 움직이므로 **이 try 밖에서 부른다** */
    id = "";
  }
  if (!id) redirect("/me/experience/new?e=save");
  await mark("experience_added", user.id, { n: form.getAll("td").length });
  revalidatePath("/me");
  revalidatePath("/me/experience");
  revalidatePath("/me/recompute");
  /* **저장한 다음 자리는 목록이 아니다**(규격 §5). 적은 사람이 바로
     알고 싶은 것은 `그래서 무엇이 달라지나` 이고, 목록으로 보내면 그
     물음에 답하는 화면을 스스로 찾아가야 한다. 달라지는 것이 없으면
     그 화면이 그 사실을 적는다.

     **방금 적은 경험의 번호를 들고 간다.** 다음 화면이 `이번 경험에서
     새로 연결된 것` 을 적어야 하는데, 번호가 없으면 쌓인 경험 전부가
     한 묶음으로 보이고 적은 사람이 **자기가 방금 적은 것이 무엇을
     움직였는지**를 가려낼 수 없다 */
  redirect(`/me/recompute?new=${id}`);
}

export async function dropExperience(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  if (!id) return;
  await removeExperience(user.id, id);
  revalidatePath("/me");
  revalidatePath("/me/experience");
}
