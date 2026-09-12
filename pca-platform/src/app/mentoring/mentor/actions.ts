"use server";

import { revalidatePath } from "next/cache";
import { query, tx } from "@/lib/db";
import { makeHandle } from "@/lib/anon";
import { requireUser } from "@/lib/session";
import { AccountError, saveAccount } from "@/lib/payout-account";
import {
  acceptRequest,
  declineRequest,
  mentorForUser,
  MentoringError,
} from "@/lib/mentoring";
import {
  fieldErrors,
  mentorProfileSchema,
  slotOpenSchema,
  type FieldErrors,
} from "@/lib/validation";

export type MentorState = { errors?: FieldErrors; message?: string; ok?: string };

/**
 * 프로필 등록·수정. 처음 만들면 status='pending' 이고, 운영사가 현직 인증을
 * 확인해 승인할 때까지 갤러리에 나오지 않는다.
 *
 * 이미 승인된 프로필을 고쳐도 승인 상태는 유지한다. 소개 문구를 다듬을 때마다
 * 다시 심사를 받게 하면 아무도 고치지 않는다. 연차·회사 규모처럼 인증과 직결된
 * 항목을 바꾸면 그때는 다시 pending 으로 내린다.
 */
export async function saveProfileAction(
  _prev: MentorState,
  formData: FormData,
): Promise<MentorState> {
  const user = await requireUser();

  const parsed = mentorProfileSchema.safeParse({
    alias: formData.get("alias"),
    years: formData.get("years"),
    degree: formData.get("degree"),
    fieldTrack: formData.get("fieldTrack"),
    careerPath: formData.get("careerPath"),
    companyScale: formData.get("companyScale"),
    region: formData.get("region") ?? "",
    headline: formData.get("headline"),
    bio: formData.get("bio") ?? "",
    sessionMinutes: formData.get("sessionMinutes"),
    jobIds: formData.getAll("jobIds").map(String),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const p = parsed.data;

  const existing = await mentorForUser(user.id);

  await tx(async (c) => {
    let mentorId: string;

    if (!existing) {
      // handle 충돌은 드물지만 나긴 한다. 몇 번 다시 뽑아본다.
      let handle = makeHandle();
      for (let i = 0; i < 5; i++) {
        const dup = await c.query(`SELECT 1 FROM mentors WHERE handle = $1`, [handle]);
        if (dup.rowCount === 0) break;
        handle = makeHandle();
      }
      const r = await c.query<{ id: string }>(
        `INSERT INTO mentors
           (user_id, handle, alias, years, degree, field_track, career_path,
            company_scale, region, headline, bio, session_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          user.id,
          handle,
          p.alias,
          p.years,
          p.degree,
          p.fieldTrack,
          p.careerPath,
          p.companyScale,
          p.region || null,
          p.headline,
          p.bio || null,
          p.sessionMinutes,
        ],
      );
      mentorId = r.rows[0].id;
    } else {
      // 인증과 직결된 항목(학위·연차·소속 규모·진로 경로)이 바뀌면 다시 심사한다
      const identityChanged =
        existing.years !== p.years ||
        existing.company_scale !== p.companyScale ||
        existing.degree !== p.degree ||
        existing.career_path !== p.careerPath;

      const r = await c.query<{ id: string }>(
        `UPDATE mentors
            SET alias = $2, years = $3, company_scale = $4, region = $5,
                headline = $6, bio = $7, session_minutes = $8,
                degree = $10, field_track = $11, career_path = $12,
                status = CASE WHEN $9 AND status = 'active' THEN 'pending' ELSE status END,
                verify_note = CASE WHEN $9 THEN NULL ELSE verify_note END,
                approved_at = CASE WHEN $9 THEN NULL ELSE approved_at END
          WHERE user_id = $1
          RETURNING id`,
        [
          user.id,
          p.alias,
          p.years,
          p.companyScale,
          p.region || null,
          p.headline,
          p.bio || null,
          p.sessionMinutes,
          identityChanged,
          p.degree,
          p.fieldTrack,
          p.careerPath,
        ],
      );
      mentorId = r.rows[0].id;
    }

    await c.query(`DELETE FROM mentor_job_clusters WHERE mentor_id = $1`, [mentorId]);
    for (const jobId of p.jobIds) {
      await c.query(
        `INSERT INTO mentor_job_clusters (mentor_id, job_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [mentorId, jobId],
      );
    }
  });

  revalidatePath("/mentoring/mentor");
  revalidatePath("/mentoring");
  return { ok: existing ? "프로필을 저장했습니다." : "프로필을 만들었습니다. 승인 뒤 갤러리에 표시됩니다." };
}

/** 시간대 열기. datetime-local 은 시간대 표기가 없으므로 서비스 기준 시간대로 해석한다. */
export async function openSlotAction(
  _prev: MentorState,
  formData: FormData,
): Promise<MentorState> {
  const user = await requireUser();
  const mentor = await mentorForUser(user.id);
  if (!mentor) return { message: "먼저 프로필을 만들어 주세요." };

  const parsed = slotOpenSchema.safeParse({ startsAt: formData.get("startsAt") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const tzName = process.env.MEETING_TIMEZONE || "Asia/Seoul";
  const rows = await query<{ id: string }>(
    // 문자열을 서비스 기준 시간대로 읽어 timestamptz 로 저장한다.
    // 서버가 어느 지역에 떠 있어도 같은 시각이 된다.
    `INSERT INTO mentor_slots (mentor_id, starts_at)
     VALUES ($1, ($2::timestamp AT TIME ZONE $3))
     ON CONFLICT (mentor_id, starts_at) DO NOTHING
     RETURNING id`,
    [mentor.id, parsed.data.startsAt.replace("T", " "), tzName],
  );
  if (rows.length === 0) return { message: "이미 열어둔 시간대입니다." };

  revalidatePath("/mentoring/mentor");
  revalidatePath(`/mentoring/${mentor.handle}`);
  return { ok: "시간대를 열었습니다." };
}

export async function closeSlotAction(
  _prev: MentorState,
  formData: FormData,
): Promise<MentorState> {
  const user = await requireUser();
  const mentor = await mentorForUser(user.id);
  if (!mentor) return { message: "멘토 프로필이 없습니다." };

  // 신청이 들어온(held·booked) 시간대는 여기서 닫을 수 없다. 거절이나 취소를 거쳐야 한다.
  const rows = await query<{ id: string }>(
    `UPDATE mentor_slots SET status = 'closed'
      WHERE id = $1 AND mentor_id = $2 AND status = 'open'
      RETURNING id`,
    [String(formData.get("slotId") ?? ""), mentor.id],
  );
  if (rows.length === 0) return { message: "이미 신청이 들어온 시간대입니다." };

  revalidatePath("/mentoring/mentor");
  revalidatePath(`/mentoring/${mentor.handle}`);
  return { ok: "시간대를 닫았습니다." };
}

/** 승낙. 줌 회의 생성과 안내 발송이 여기서 한 번에 일어난다 (lib/mentoring.ts). */
export async function acceptAction(
  _prev: MentorState,
  formData: FormData,
): Promise<MentorState> {
  const user = await requireUser();
  try {
    await acceptRequest({
      requestId: String(formData.get("requestId") ?? ""),
      mentorUserId: user.id,
    });
  } catch (e) {
    if (e instanceof MentoringError) return { message: e.message };
    throw e;
  }

  revalidatePath("/mentoring/mentor");
  revalidatePath("/mentoring/requests");
  return { ok: "승낙했습니다. 줌 회의를 만들고 양쪽에 일정을 보냈습니다." };
}

export async function declineAction(
  _prev: MentorState,
  formData: FormData,
): Promise<MentorState> {
  const user = await requireUser();
  const reason = String(formData.get("reason") ?? "").trim();

  try {
    await declineRequest({
      requestId: String(formData.get("requestId") ?? ""),
      mentorUserId: user.id,
      reason: reason ? reason.slice(0, 300) : null,
    });
  } catch (e) {
    if (e instanceof MentoringError) return { message: e.message };
    throw e;
  }

  revalidatePath("/mentoring/mentor");
  revalidatePath("/mentoring/requests");
  return { ok: "거절했습니다. 그 시간대는 다시 열렸습니다." };
}

/**
 * 지급 계좌. 프로필과 분리해 저장한다 — 소개 문구를 고치다가 계좌가 지워지면 안 되고,
 * 계좌를 바꿨다고 다시 심사를 받을 이유도 없다.
 */
export async function saveAccountAction(
  _prev: MentorState,
  formData: FormData,
): Promise<MentorState> {
  const user = await requireUser();
  const mentor = await mentorForUser(user.id);
  if (!mentor) return { message: "멘토 프로필을 먼저 만들어주세요." };

  try {
    await saveAccount({
      mentorId: mentor.id,
      bank: String(formData.get("bank") ?? ""),
      accountNo: String(formData.get("accountNo") ?? ""),
      holder: String(formData.get("holder") ?? ""),
      rrn: String(formData.get("rrn") ?? ""),
    });
  } catch (e) {
    if (e instanceof AccountError) return { message: e.message };
    throw e;
  }

  revalidatePath("/mentoring/mentor");
  revalidatePath("/admin/payouts");
  return { ok: "지급 계좌를 저장했습니다." };
}
