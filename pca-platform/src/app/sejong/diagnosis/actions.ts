"use server";

import { redirect } from "next/navigation";
import { requireSejong } from "@/sejong/lib/session";
import { sejongContent } from "@/sejong/lib/content";
import { attemptOf, saveResponse, startAttempt, submitAttempt, responsesOf } from "@/sejong/lib/store";
import type { Profile } from "@/sejong/lib/analysis";

export async function startDiagnosis(formData: FormData): Promise<void> {
  const a = await requireSejong("participant");
  const { instrument } = sejongContent();
  const areas = formData.getAll("job_areas").map(String)
    .filter((c) => instrument.job_areas.some((j) => j.code === c)).slice(0, 3);
  if (areas.length === 0) redirect("/sejong/diagnosis?e=area");
  const audience = String(formData.get("audience") ?? "none");
  const range = String(formData.get("region_range") ?? "UNDECIDED");
  const skills = String(formData.get("skills") ?? "").split(/[,\n]/).map((s) => s.trim())
    .filter(Boolean).slice(0, 12).map((s) => s.slice(0, 40));
  const profile: Profile = {
    audience: instrument.audiences.options.some((o) => o.code === audience) && audience !== "none" ? audience : null,
    job_areas: areas,
    region_range: instrument.region_ranges.options.some((o) => o.code === range) ? range : "UNDECIDED",
    skills,
  };
  const id = await startAttempt({ userId: a.userId, orgId: a.orgId, programCode: a.programCode!, profile });
  redirect(`/sejong/diagnosis/${id}`);
}

export type SaveState = { ok: boolean; error?: string };

/** 문항 하나를 바로 저장한다. 창을 닫아도 이어서 할 수 있다 */
export async function saveAnswer(attemptId: string, itemCode: string, value: number): Promise<SaveState> {
  const a = await requireSejong("participant");
  const att = await attemptOf(attemptId, a.userId);
  if (!att) return { ok: false, error: "응시를 찾을 수 없습니다." };
  if (att.status !== "in_progress") return { ok: false, error: "이미 제출한 진단입니다." };
  const { instrument } = sejongContent();
  const known = instrument.sections.some((s) => s.items.some((i) => i.code === itemCode));
  if (!known || !Number.isInteger(value) || value < 0 || value > 3) return { ok: false, error: "잘못된 응답입니다." };
  await saveResponse(attemptId, itemCode, value);
  return { ok: true };
}

export async function submitDiagnosis(formData: FormData): Promise<void> {
  const a = await requireSejong("participant");
  const id = String(formData.get("attempt_id") ?? "");
  const att = await attemptOf(id, a.userId);
  if (!att) redirect("/sejong/me");
  const { instrument } = sejongContent();
  const total = instrument.sections.reduce((n, s) => n + s.items.length, 0);
  const got = Object.keys(await responsesOf(id)).length;
  if (att.status === "in_progress" && got < total) redirect(`/sejong/diagnosis/${id}?e=incomplete`);
  await submitAttempt(id, a.userId);
  redirect("/sejong/result?new=1");
}
