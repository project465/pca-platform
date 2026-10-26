"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { queryOne, tx } from "@/lib/db";
import { activeCore, experiencesOf, importActions, markTrackInterest } from "@/lib/me-v3/platform";
import { openActions } from "@/lib/me-v3/open-actions";
import { mark } from "@/lib/me-v3/workspace-events";
import { activeTrack, grantProTrialTx, proTrialClaimable } from "@/lib/track";
import { analyzePosting, livePostingOf, setPostingState } from "@/lib/assistant/posting";
import { smallTasks, taskBody } from "@/lib/assistant/prep";
import { draftExperience } from "@/lib/assistant/draft";
import { setAiConsent, setEmailDigest, setFileConsent } from "@/lib/assistant/settings";
import { markNudgesRead } from "@/lib/assistant/nudges";
import { opFail, ref } from "@/lib/oplog";

/**
 * 준비 중인 기능이 켜지면 알려 달라는 표시.
 *
 * **결제가 아니다.** 어느 기능을 기다리는 사람이 있는지 세는 것이고, 그
 * 수로 켜는 차례를 정한다.
 */
export async function toggleInterest(form: FormData): Promise<void> {
  const user = await requireUser();
  const feature = String(form.get("feature") ?? "");
  const on = String(form.get("on") ?? "") === "1";
  if (!feature) return;
  await markTrackInterest(user.id, feature, on);
  revalidatePath("/me/track");
  revalidatePath("/me");
}

/**
 * PRO 결과지를 이 기능이 생기기 전에 사신 분의 첫 한 달.
 *
 * **받을 수 있는지는 서버가 다시 본다.** 단추가 서 있었다는 것이 받을
 * 자격이 아니다. 두 번 눌러도 한 번만 붙는다(`entitlements_track_trial_uniq`).
 */
export async function claimTrial(): Promise<void> {
  const user = await requireUser();
  if (await proTrialClaimable(user.id)) {
    await tx((c) => grantProTrialTx(c, user.id));
  }
  revalidatePath("/me/track");
  revalidatePath("/me");
  redirect("/me/track?trial=1");
}

/**
 * **열려 있는지는 서버가 본다.** 화면이 폼을 꺼 두는 것은 안내이고, 기간이
 * 끝난 사람이 폼을 직접 보내도 여기서 돌아간다.
 */
async function requireTrack(): Promise<{ id: string }> {
  const user = await requireUser();
  if (!(await activeTrack(user.id)).on) redirect("/me/track?e=off");
  return user;
}

/** 붙여 넣은 공고 하나를 읽고 결과 쪽으로 보낸다 */
export async function addPosting(form: FormData): Promise<void> {
  const user = await requireTrack();
  const text = String(form.get("text") ?? "").trim();
  const label = String(form.get("label") ?? "").trim() || "이름 없는 공고";
  const deadline = String(form.get("deadline") ?? "").trim();
  if (text.length < 30) redirect("/me/track?e=short#posting");
  let id = "";
  try {
    id = (await analyzePosting(user.id, {
      label, text, deadline: /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : null,
    })).id;
  } catch (e) {
    opFail({ operation: "assistant.posting", ref: ref("user", user.id), step: "save", category: "db" }, e);
  }
  if (!id) redirect("/me/track?e=posting#posting");
  revalidatePath("/me/track");
  redirect(`/me/track/posting/${id}`);
}

export async function changePostingState(form: FormData): Promise<void> {
  const user = await requireTrack();
  const id = String(form.get("id") ?? "");
  await setPostingState(user.id, id, String(form.get("state") ?? ""));
  revalidatePath("/me/track");
  redirect(`/me/track/posting/${id}`);
}

/**
 * 공고 화면의 `이번 주에 할 수 있는 작은 일` 을 할 일 목록에 담는다.
 *
 * **줄은 서버가 다시 만든다.** 화면이 보낸 문장을 담지 않고, 그 공고의
 * 분석과 지금 적어 둔 경험으로 같은 함수(`smallTasks`)를 다시 부른다.
 * 두 번 눌러도 늘지 않는다(`importActions` 가 영역과 문장으로 본다).
 *
 * **결과지의 할 일을 밀어내지 않는다.** 담아 둔 줄이 하나도 없는 사람에게는
 * 할 일 쪽이 결과가 낸 할 일을 그대로 보여 주는데(`open-actions.ts`), 공고
 * 줄만 담으면 그 순간 결과의 할 일이 화면에서 사라진다. 그래서 그때는
 * 결과의 할 일을 먼저 담는다(`moveAction` 과 같은 규칙).
 */
export async function takePostingTasks(form: FormData): Promise<void> {
  const user = await requireTrack();
  const id = String(form.get("id") ?? "");
  /* 화면과 같은 값(지금 상태로 다시 단 것)으로 줄을 만든다 */
  const p = await livePostingOf(user.id, id);
  if (!p) redirect("/me/track");
  const core = await activeCore(user.id);
  /* 다른 전공으로 읽은 공고면 영역 코드가 이 전공의 것이 아니다 */
  const own = await queryOne<{ core_code: string }>(
    `SELECT core_code FROM assistant_postings WHERE user_id = $1 AND id = $2`, [user.id, id]);
  if (own?.core_code !== core) redirect(`/me/track/posting/${id}?taken=x#tasks`);
  const tasks = smallTasks(core, p.analysis.items, await experiencesOf(user.id, core));
  const open = await openActions(user.id);
  if (open.fromResult && open.rows.length) {
    await importActions(user.id, open.rows.map((r) => ({
      td: r.td_code, axis: r.axis_code, body: r.body, horizon: r.horizon })));
  }
  const n = await importActions(user.id, tasks.map((t) => ({
    td: t.domain, axis: t.axis, body: taskBody(t, p.label), horizon: 30,
  })), "manual");
  await mark("action_saved", user.id, { from: "posting", n });
  revalidatePath("/me/next");
  revalidatePath("/me");
  redirect(`/me/track/posting/${id}?taken=${n}#tasks`);
}

/** 메모를 경험 추가 폼의 보기로 옮기고, 그 폼을 켜 둔 채로 연다 */
export async function makeDraft(form: FormData): Promise<void> {
  const user = await requireTrack();
  const note = String(form.get("note") ?? "").trim();
  if (note.length < 10) redirect("/me/track?e=memo#draft");
  let id = "";
  try {
    id = (await draftExperience(user.id, note)).id;
  } catch (e) {
    opFail({ operation: "assistant.draft", ref: ref("user", user.id), step: "save", category: "db" }, e);
  }
  if (!id) redirect("/me/track?e=draft#draft");
  redirect(`/me/experience/new?draft=${id}`);
}

export async function changeConsent(form: FormData): Promise<void> {
  const user = await requireUser();
  await setAiConsent(user.id, String(form.get("on") ?? "") === "1");
  revalidatePath("/me/track");
  redirect("/me/track#settings");
}

/** 파일 읽기 동의. 끄면 그 뒤로 올린 파일을 읽지 않는다 */
export async function changeFileConsent(form: FormData): Promise<void> {
  const user = await requireUser();
  await setFileConsent(user.id, String(form.get("on") ?? "") === "1");
  revalidatePath("/me/track");
  redirect("/me/track#settings");
}

export async function changeDigest(form: FormData): Promise<void> {
  const user = await requireUser();
  await setEmailDigest(user.id, String(form.get("on") ?? "") === "1");
  revalidatePath("/me/track");
  redirect("/me/track#settings");
}

export async function readAllNudges(): Promise<void> {
  const user = await requireUser();
  await markNudgesRead(user.id);
  revalidatePath("/me/track");
  revalidatePath("/me");
  redirect("/me/track");
}
