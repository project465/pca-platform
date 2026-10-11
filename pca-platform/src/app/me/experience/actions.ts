"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { addExperience, removeExperience } from "@/lib/me-v3/platform";
import { autoRecompute } from "@/lib/me-v3/recompute";
import { mark } from "@/lib/me-v3/workspace-events";
import { opFail, ref } from "@/lib/oplog";

/**
 * 경험 하나를 저장한다.
 *
 * **고른 것만 받는다.** 기술영역과 판단축과 산출물은 보기에서 오고, 자유
 * 입력은 제목과 한 줄 메모뿐이다. 메모는 판정에 들어가지 않고 기한이 지나면
 * 지워진다.
 *
 * **저장이 끝나면 저절로 반영한다.** 누르는 단추를 하나 더 두지 않는다.
 * 다만 **차례는 그대로다**: 저장이 먼저 끝나고, 그 뒤에 다시 계산한다.
 * 계산이 틀어져도 적어 주신 기록은 그대로 남고 `career_events` 의 그 줄이
 * `failed` 로 서서 다음에 다시 집힌다. 그래서 다시 적으실 일이 없다.
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
  /* **저장이 성공한 뒤에만 돈다**(규격 §2). 그리고 **저장을 되돌리지
     않는다**: 여기서 무엇이 틀어져도 위에서 적은 기록은 그대로 있다.
     그래서 던지지 않고 상태만 들고 나간다 */
  const auto = await autoRecompute(user.id).catch((e) => {
    opFail({
      operation: "experience.autoRecompute", ref: ref("user", user.id),
      step: "apply", category: "db",
    }, e);
    return { state: "failed" as const };
  });
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
  revalidatePath("/me/state");
  revalidatePath("/me/next");
  redirect(`/me/recompute?new=${id}&r=${auto.state}`);
}

export async function dropExperience(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  if (!id) return;
  await removeExperience(user.id, id);
  /* 지운 자리도 저절로 다시 센다. **내려가지는 않는다**: 검사에서 확인된
     축의 근거는 검사 응답이지 이 기록이 아니다(`recompute.ts` 머리말) */
  await autoRecompute(user.id).catch((e) => {
    opFail({
      operation: "experience.autoRecompute", ref: ref("user", user.id),
      step: "apply", category: "db",
    }, e);
  });
  revalidatePath("/me");
  revalidatePath("/me/experience");
  revalidatePath("/me/state");
  revalidatePath("/me/next");
}
