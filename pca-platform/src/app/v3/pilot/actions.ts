"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { requireUser } from "@/lib/session";

/**
 * 파일럿 참가 등록.
 *
 * 받는 것 넷뿐이다: 전공명 · 전공계열 · 지금 상태 · 가고 싶은 쪽. 학위는
 * 응시가 이미 들고 있고, 이름과 학교와 학번은 **받지 않는다.** 분석에
 * 쓰이지 않는 칸을 받아 두면 보관할 이유가 생기고, 보관하면 지울 일이
 * 생긴다.
 *
 * 전공명은 준식별자다. 학위·계열과 함께 놓으면 사람이 좁혀져서, 받는
 * 자리에서 바로 **보존 기한**을 박는다. 기한은 분석을 끝낼 수 있는
 * 길이로 정한다(90일).
 */
const KEEP_DAYS = 90;

/** 가명. 사람 이름도 학번도 아니고, 헷갈리는 글자는 빼 둔다 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function freshCode(): Promise<string> {
  for (let i = 0; i < 40; i += 1) {
    let x = "";
    for (let j = 0; j < 5; j += 1) x += ALPHABET[randomInt(ALPHABET.length)];
    const had = await queryOne<{ code: string }>(
      `SELECT code FROM v3_pilot_participants WHERE code = $1`, [`V3-${x}`]);
    if (!had) return `V3-${x}`;
  }
  throw new Error("가명을 만들지 못했습니다");
}

const FIELDS = ["STEM", "HUMANITIES_SOCIAL", "BUSINESS", "OTHER_INTERDISCIPLINARY"];
const STATUS = ["enrolled", "on_leave", "graduated", "employed", "job_seeking", "other"];
const STAGES = ["bachelor", "master", "phd", "postdoc"];

export async function joinPilot(form: FormData): Promise<void> {
  const user = await requireUser();
  const pick = (k: string, allow: string[]) => {
    const v = String(form.get(k) ?? "");
    return allow.includes(v) ? v : null;
  };
  const stage = pick("education_stage", STAGES);
  if (!stage) redirect("/v3/pilot?e=stage");
  /* 자유입력은 길이를 자른다. 긴 글이 오면 적을 자리를 잘못 쓴 것이다 */
  const major = String(form.get("major_name") ?? "").trim().slice(0, 80) || null;
  const interest = String(form.get("career_interest") ?? "").trim().slice(0, 120) || null;

  const cohort = "V3_PILOT_1";
  const had = await queryOne<{ id: string }>(
    `SELECT id::text FROM v3_pilot_participants WHERE user_id = $1 AND cohort = $2`,
    [user.id, cohort]);

  if (had) {
    await query(
      `UPDATE v3_pilot_participants
          SET education_stage = $2, major_name = $3, major_field = $4,
              current_status = $5, career_interest = $6
        WHERE id = $1`,
      [had.id, stage, major, pick("major_field", FIELDS), pick("current_status", STATUS), interest]);
  } else {
    await query(
      `INSERT INTO v3_pilot_participants
         (user_id, code, cohort, education_stage, major_name, major_field,
          current_status, career_interest, purge_after)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, (now() + ($9 || ' days')::interval)::date)`,
      [user.id, await freshCode(), cohort, stage, major,
        pick("major_field", FIELDS), pick("current_status", STATUS), interest,
        String(KEEP_DAYS)]);
  }
  redirect("/v3/pilot?ok=1");
}
