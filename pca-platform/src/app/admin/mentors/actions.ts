"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { fieldErrors, mentorApproveSchema, type FieldErrors } from "@/lib/validation";

export type ApproveState = { errors?: FieldErrors; message?: string; ok?: string };

/**
 * 현직 인증 승인. 코멘토가 '인증된 현직자'를 앞세우는 것처럼 이 서비스도
 * 그 말을 쓰려면 무엇으로 확인했는지 남아 있어야 한다. 그래서 근거 없이는
 * 승인할 수 없게 했다 (schema.sql 의 mentors_active_needs_verify 와 같은 규칙).
 */
export async function approveMentorAction(
  _prev: ApproveState,
  formData: FormData,
): Promise<ApproveState> {
  const admin = await requireRole(["superadmin"]);

  const parsed = mentorApproveSchema.safeParse({
    mentorId: formData.get("mentorId"),
    verifyNote: formData.get("verifyNote"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const rows = await query<{ id: string }>(
    `UPDATE mentors
        SET status = 'active', verify_note = $2, approved_at = now(), approved_by = $3
      WHERE id = $1 AND status <> 'active'
      RETURNING id`,
    [parsed.data.mentorId, parsed.data.verifyNote, admin.id],
  );
  if (rows.length === 0) return { message: "이미 승인된 멘토입니다." };

  revalidatePath("/admin/mentors");
  revalidatePath("/mentoring");
  return { ok: "승인했습니다. 갤러리에 표시됩니다." };
}

/**
 * 중지. 이미 확정된 일정은 건드리지 않는다 — 약속을 취소하는 것은 별개의 일이고,
 * 사람에게 알려야 하는 일이다. 여기서는 새 신청만 막는다.
 */
export async function pauseMentorAction(
  _prev: ApproveState,
  formData: FormData,
): Promise<ApproveState> {
  await requireRole(["superadmin"]);

  const mentorId = String(formData.get("mentorId") ?? "");
  await query(`UPDATE mentors SET status = 'paused' WHERE id = $1`, [mentorId]);
  // 아직 신청이 안 들어온 시간대는 닫아 갤러리에서 신청이 더 들어오지 않게 한다.
  await query(
    `UPDATE mentor_slots SET status = 'closed'
      WHERE mentor_id = $1 AND status = 'open'`,
    [mentorId],
  );

  revalidatePath("/admin/mentors");
  revalidatePath("/mentoring");
  return { ok: "중지했습니다. 확정된 일정은 그대로 남아 있습니다." };
}
