"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { myOrgIds } from "@/lib/org";
import { fieldErrors, sessionCreateSchema, type FieldErrors } from "@/lib/validation";

export type SessionState = { errors?: FieldErrors; message?: string };

export async function createSessionAction(
  _prev: SessionState,
  formData: FormData,
): Promise<SessionState> {
  const user = await requireRole(["org_admin"]);

  const parsed = sessionCreateSchema.safeParse({
    contractId: formData.get("contractId"),
    instrumentId: formData.get("instrumentId"),
    name: formData.get("name"),
    opensAt: formData.get("opensAt"),
    closesAt: formData.get("closesAt"),
    releaseMode: formData.get("releaseMode"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const s = parsed.data;

  if (s.closesAt <= s.opensAt) {
    return { errors: { closesAt: "종료가 시작보다 뒤여야 합니다." } };
  }

  // 담당자는 자기 학과의 계약으로만 회차를 만들 수 있다.
  // 폼에 없는 계약 id 를 보내는 것을 막는 자리다.
  const contract = await queryOne<{ org_id: string; ends_on: string }>(
    `SELECT org_id, ends_on::text FROM contracts
      WHERE id = $1 AND status = 'active' AND org_id = ANY($2::bigint[])`,
    [s.contractId, myOrgIds(user)],
  );
  if (!contract) return { errors: { contractId: "고를 수 없는 계약입니다." } };

  const tzName = process.env.MEETING_TIMEZONE || "Asia/Seoul";
  const rows = await query<{ id: string }>(
    `INSERT INTO test_sessions
       (org_id, contract_id, instrument_id, name, opens_at, closes_at, release_mode)
     VALUES ($1, $2, $3, $4,
             ($5::timestamp AT TIME ZONE $7),
             ($6::timestamp AT TIME ZONE $7),
             $8)
     RETURNING id`,
    [
      contract.org_id,
      s.contractId,
      s.instrumentId,
      s.name,
      s.opensAt.replace("T", " "),
      s.closesAt.replace("T", " "),
      tzName,
      s.releaseMode,
    ],
  );

  revalidatePath("/org");
  redirect(`/org/sessions/${rows[0].id}`);
}
