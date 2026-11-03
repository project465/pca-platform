"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import {
  addExperience, removeExperience, updateExperience,
} from "@/lib/me-v3/platform";
import { autoRecompute } from "@/lib/me-v3/recompute";
import { mark } from "@/lib/me-v3/workspace-events";
import { opFail, ref } from "@/lib/oplog";
import { markDraftUsed } from "@/lib/assistant/draft";
import { canUseMat } from "@/lib/mat-access";
import { readUpload, uploadFailKo, UPLOAD_MONTHLY_CAP, type UploadResult } from "@/lib/assistant/upload";
import { setFileConsent } from "@/lib/assistant/settings";

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
/**
 * 고른 연도와 월을 한 값으로 합친다.
 *
 * **합치는 자리를 하나로 둔다.** `MonthPick` 이 `<name>_y` 와 `<name>_m`
 * 둘로 보내고, 저장되는 꼴은 `addExperience` 의 `asDate()` 가 정한다
 * (`2025-03` → `2025-03-01`). 쪽마다 합치면 폼을 하나 더 만드는 사람이
 * 같은 자리에서 또 걸린다.
 *
 * **한쪽만 고른 것은 받지 않는다.** 연도만 고르고 월을 비운 값을 `2025-01`
 * 로 메우면 그 사람이 고르지 않은 달이 기록에 남는다.
 *
 * **전에 보낸 꼴도 그대로 받는다.** `started_on=2025-03` 한 칸으로 보내는
 * 자리가 남아 있어도 값의 뜻이 바뀌지 않는다.
 */
function monthOf(form: FormData, name: string): string | null {
  const raw = String(form.get(name) ?? "").trim();
  if (raw) return raw;
  const y = String(form.get(`${name}_y`) ?? "").trim();
  const m = String(form.get(`${name}_m`) ?? "").trim();
  if (!/^\d{4}$/.test(y) || !/^\d{1,2}$/.test(m)) return null;
  const mm = Number(m);
  if (mm < 1 || mm > 12) return null;
  return `${y}-${String(mm).padStart(2, "0")}`;
}

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
      started_on: monthOf(form, "started_on"),
      /* **`아직 진행 중` 은 끝난 달을 비운다.** 비어 있는 것이 전부터
         `아직 안 끝났다`를 뜻하므로(`ended_on IS NULL`), 칸을 하나 더
         만들지 않고 같은 값으로 들어간다. DB 스키마가 그대로다 */
      ended_on: form.get("ongoing") ? null : monthOf(form, "ended_on"),
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
  /* MAT 초안에서 왔으면 그 메모를 비운다. 남겨 둘 이유가 끝났다 */
  const draft = String(form.get("draft") ?? "");
  if (draft) await markDraftUsed(user.id, draft);
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

/**
 * 적어 둔 경험을 고친다(규격 §9).
 *
 * **저장하는 자리와 같은 폼을 읽는다.** 칸 이름이 하나라도 갈리면 고치러
 * 들어온 사람이 **고르지 않은 값을 지운 채로** 저장한다.
 *
 * **저장 실패와 반영 실패를 가른다.** 앞엣사람은 고친 것을 잃었으므로
 * 다시 눌러야 하고, 뒤엣사람은 다시 적을 일이 없다.
 */
export async function editExperience(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const kind = String(form.get("kind") ?? "");
  if (!id) redirect("/me/experience");
  if (!title || !kind) redirect(`/me/experience/${id}/edit?e=form`);
  let ok = false;
  try {
    ok = await updateExperience(user.id, id, {
      kind, title,
      started_on: monthOf(form, "started_on"),
      ended_on: form.get("ongoing") ? null : monthOf(form, "ended_on"),
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
      operation: "experience.edit", ref: ref("user", user.id),
      step: "update", category: "db",
    }, e);
    ok = false;
  }
  /* **없는 기록을 고쳤다고 적지 않는다.** `user_id` 로 걸러 한 줄도 안
     고쳐졌으면 그것은 남의 번호이거나 지워진 기록이다 */
  if (!ok) redirect(`/me/experience/${id}/edit?e=save`);
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
  revalidatePath("/me/state");
  revalidatePath("/me/next");
  /* 고친 뒤에도 **달라지는 것을 먼저 보여 준다**: 고친 사람이 바로 알고
     싶은 것은 `그래서 무엇이 달라지나` 다 */
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

export type UploadState = {
  ok: boolean;
  msg: string;
  drafts: { id: string; title: string }[];
  used: number;
  cap: number;
} | null;

/**
 * 올린 파일 하나를 읽어 경험 초안으로 옮긴다.
 *
 * **열려 있는지는 서버가 본다.** MAT 기간이 끝난 사람이 폼을 직접 보내도
 * 여기서 돌아간다. 동의 칸을 켜고 보내면 그때 동의를 적는다: 화면이 켜
 * 두지 않으므로 사람이 누른 것이다.
 */
export async function uploadForDraft(_prev: UploadState, form: FormData): Promise<UploadState> {
  const user = await requireUser();
  const base = { drafts: [], cap: UPLOAD_MONTHLY_CAP };
  /* 기간권이 없어도 한 번은 읽어 본다(`mat-access.ts`) */
  const can = await canUseMat(user.id, "upload");
  if (!can.ok) {
    return { ok: false, msg: can.why === "needtest"
      ? "파일 읽기는 무료 검사를 마친 뒤에 열립니다."
      : "무료로 읽어 볼 수 있는 파일 1건을 쓰셨습니다. MAT 기간권을 고르시면 한 달 10건까지 읽어 드립니다.", used: 0, ...base };
  }
  if (String(form.get("consent") ?? "") === "1") await setFileConsent(user.id, true);
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, msg: "올릴 파일을 골라 주세요.", used: 0, ...base };
  }
  let r: UploadResult;
  try {
    r = await readUpload(user.id, Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    opFail({ operation: "assistant.upload", ref: ref("user", user.id), step: "read", category: "db" }, e);
    return { ok: false, msg: uploadFailKo("error"), used: 0, ...base };
  }
  if (!r.ok) return { ok: false, msg: uploadFailKo(r.reason), used: r.used, ...base };
  revalidatePath("/me/experience/new");
  return {
    ok: true,
    msg: r.reused
      ? "전에 올리신 파일이라 그때 옮겨 둔 것을 다시 보여 드립니다. 이번 달 건수에 세지 않았습니다."
      : `${r.drafts.length}가지를 옮겨 두었습니다. 하나씩 열어 맞지 않는 칸을 끄고 저장해 주세요.`,
    drafts: r.drafts.map((d) => ({ id: d.id, title: d.title })),
    used: r.used, cap: UPLOAD_MONTHLY_CAP,
  };
}
