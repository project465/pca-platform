"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { tx } from "@/lib/db";
import { setTranslation } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import { fieldErrors, orgCreateSchema, type FieldErrors } from "@/lib/validation";

export type OrgState = { errors?: FieldErrors; message?: string };

export async function createOrgAction(
  _prev: OrgState,
  formData: FormData,
): Promise<OrgState> {
  await requireRole(["superadmin"]);

  const parsed = orgCreateSchema.safeParse({
    code: formData.get("code"),
    country: formData.get("country"),
    orgType: formData.get("orgType"),
    parentId: formData.get("parentId") ?? "",
    nameKo: formData.get("nameKo"),
    nameEn: formData.get("nameEn") ?? "",
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const input = parsed.data;

  if (input.orgType === "department" && !input.parentId) {
    return { errors: { parentId: "학과는 소속 대학을 골라야 합니다." } };
  }

  try {
    await tx(async (c) => {
      const res = await c.query<{ id: string }>(
        `INSERT INTO organizations (code, country, org_type, parent_id)
         VALUES ($1, upper($2), $3, $4)
         RETURNING id`,
        [
          input.code,
          input.country,
          input.orgType,
          input.parentId ? input.parentId : null,
        ],
      );
      const id = res.rows[0].id;

      // 기관명은 컬럼이 아니라 translations 의 행으로 들어간다 (설계 원칙 2).
      await setTranslation(c, "organizations", id, "ko", "name", input.nameKo);
      if (input.nameEn) {
        await setTranslation(c, "organizations", id, "en", "name", input.nameEn);
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("organizations_code_key")) {
      return { errors: { code: "이미 쓰고 있는 코드입니다." } };
    }
    throw e;
  }

  revalidatePath("/admin/organizations");
  redirect("/admin/organizations");
}
