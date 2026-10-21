"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { tx } from "@/lib/db";
import { markTrackInterest } from "@/lib/me-v3/platform";
import { activeTrack, grantProTrialTx, proTrialClaimable } from "@/lib/track";
import { analyzePosting, setPostingState } from "@/lib/assistant/posting";
import { draftExperience } from "@/lib/assistant/draft";
import { setAiConsent, setEmailDigest } from "@/lib/assistant/settings";
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
