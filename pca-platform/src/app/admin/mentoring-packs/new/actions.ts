"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { createPack } from "@/lib/pack";
import { packCreateSchema, fieldErrors, type FieldErrors } from "@/lib/validation";

export type PackState = { errors?: FieldErrors; message?: string };

/**
 * 이용권 발급. 산 개수만큼 행을 미리 만든다 (db/schema.sql 19번).
 * 몇 장 남았는지를 계산이 아니라 행 개수로 답하기 위해서다.
 */
export async function createPackAction(
  _prev: PackState,
  formData: FormData,
): Promise<PackState> {
  const user = await requireRole(["superadmin"]);

  const parsed = packCreateSchema.safeParse({
    orgId: formData.get("orgId"),
    title: formData.get("title"),
    unitPrice: formData.get("unitPrice"),
    count: formData.get("count"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn"),
    memo: formData.get("memo") ?? "",
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const p = parsed.data;

  if (p.endsOn < p.startsOn) {
    return { errors: { endsOn: "종료일이 시작일보다 앞설 수 없습니다." } };
  }

  await createPack({
    orgId: p.orgId,
    title: p.title,
    unitPrice: p.unitPrice,
    count: p.count,
    startsOn: p.startsOn,
    endsOn: p.endsOn,
    memo: p.memo || null,
    actorId: user.id,
  });

  revalidatePath("/admin/mentoring-packs");
  redirect("/admin/mentoring-packs");
}
