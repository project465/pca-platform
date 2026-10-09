"use server";

import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { participantOf } from "@/lib/me-v3/pilot/store";

/**
 * 파일럿 참가자가 적는 넷.
 *
 * 받는 것은 전공명 · 전공계열 · 지금 상태 · 겪은 정도 · 가고 싶은 쪽뿐이다.
 * 학위는 응시가 이미 들고 있고, **이름과 학교와 학번과 연락처는 받지
 * 않는다.** 분석에 쓰이지 않는 칸을 받아 두면 보관할 이유가 생기고,
 * 보관하면 지울 일이 생긴다.
 *
 * **여기서 받은 것은 Core 판정에 들어가지 않는다.** 섞임을 보려고 받는
 * 분석용 칸이다.
 */
const FIELDS = ["STEM", "HUMANITIES_SOCIAL", "BUSINESS", "OTHER_INTERDISCIPLINARY"];
const STATUS = ["enrolled", "on_leave", "graduated", "employed", "job_seeking", "other"];
const STAGES = ["bachelor", "master", "phd", "postdoc"];
const LEVELS = ["none", "coursework", "lab", "internship", "industry"];

export async function saveProfile(form: FormData): Promise<void> {
  const user = await requireUser();
  const p = await participantOf(user.id);
  /* 초대를 지나지 않은 사람은 여기서 만들지 않는다. 링크가 자리를 만든다 */
  if (!p) redirect("/v3/pilot?e=invite");

  const pick = (k: string, allow: string[]) => {
    const v = String(form.get(k) ?? "");
    return allow.includes(v) ? v : null;
  };
  const stage = pick("education_stage", STAGES);
  if (!stage) redirect("/v3/pilot?e=stage");
  /* 자유입력은 길이를 자른다. 긴 글이 오면 적을 자리를 잘못 쓴 것이다 */
  const major = String(form.get("major_name") ?? "").trim().slice(0, 80) || null;
  const interest = String(form.get("career_interest") ?? "").trim().slice(0, 120) || null;

  await query(
    `UPDATE v3_pilot_participants
        SET education_stage = $2, major_name = $3, major_field = $4,
            current_status = $5, career_interest = $6, experience_level = $7,
            interest_area = $8
      WHERE id = $1`,
    [p.id, stage, major, pick("major_field", FIELDS), pick("current_status", STATUS),
      interest, pick("experience_level", LEVELS),
      String(form.get("interest_area") ?? "").trim().slice(0, 40) || null]);
  redirect("/v3/pilot?ok=1");
}

/** 적어 주신 것을 지금 지운다. 그만두는 길을 단추 하나로 둔다 */
export async function leavePilot(): Promise<void> {
  const user = await requireUser();
  const p = await participantOf(user.id);
  if (!p) redirect("/me");
  await query(
    `UPDATE v3_pilot_feedback f SET text = NULL
       FROM v3_attempts a
      WHERE a.id = f.attempt_id AND a.user_id = $1 AND f.text IS NOT NULL`,
    [user.id]);
  await query(
    `UPDATE v3_pilot_participants
        SET major_name = NULL, career_interest = NULL, purged_at = now()
      WHERE id = $1`, [p.id]);
  redirect("/v3/pilot?left=1");
}

/** 그 사람의 가장 최근 응시. 이어서 할 자리를 적어 주려고 본다 */
export async function latestAttemptOf(userId: string): Promise<
  { id: string; tier: string; status: string } | null
> {
  return queryOne<{ id: string; tier: string; status: string }>(
    `SELECT id::text, tier, status FROM v3_attempts
      WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1`, [userId]);
}
