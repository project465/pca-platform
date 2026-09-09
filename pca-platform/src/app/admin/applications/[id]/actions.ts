"use server";

import { tx } from "@/lib/db";
import { setTranslation } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { approveSchema, joinUrl, newLinkToken } from "@/lib/applications";
import { fieldErrors, type FieldErrors } from "@/lib/validation";

/**
 * 승인 결과. 임시 비밀번호는 이 화면에서 한 번만 보여준다 — DB 에는 해시만
 * 남으므로 나중에 다시 꺼낼 수 없다. 전용 링크는 org_links 에 원문이 있어
 * 기관 화면에서 언제든 다시 볼 수 있다.
 */
export type ApproveState = {
  errors?: FieldErrors;
  message?: string;
  issued?: {
    orgId: string;
    joinUrl: string;
    adminEmail: string;
    tempPassword: string;
  };
};

export async function approveAction(
  applicationId: string,
  _prev: ApproveState,
  formData: FormData,
): Promise<ApproveState> {
  const me = await requireRole(["superadmin"]);

  const parsed = approveSchema.safeParse({
    country: formData.get("country"),
    code: formData.get("code"),
    orgType: formData.get("orgType"),
    parentId: formData.get("parentId") ?? "",
    nameKo: formData.get("nameKo"),
    nameEn: formData.get("nameEn") ?? "",
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
    contractTitle: formData.get("contractTitle"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn"),
    seatCount: formData.get("seatCount"),
    linkLabel: formData.get("linkLabel"),
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const v = parsed.data;

  if (v.orgType === "department" && !v.parentId) {
    return { errors: { parentId: "학과는 소속 대학을 골라야 합니다." } };
  }
  if (v.endsOn < v.startsOn) {
    return { errors: { endsOn: "종료일이 시작일보다 앞설 수 없습니다." } };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const token = newLinkToken();

  let orgId: string;
  try {
    orgId = await tx(async (c) => {
      /* 이미 처리된 신청을 두 번 승인하지 않는다. 같은 신청서를 두 사람이
         동시에 열어 두고 각자 누르는 상황을 막는 잠금이기도 하다 */
      const app = await c.query<{ id: string; status: string }>(
        `SELECT id, status FROM org_applications
          WHERE id = $1 FOR UPDATE`,
        [applicationId],
      );
      if (app.rowCount === 0) throw new Error("APP_NOT_FOUND");
      if (app.rows[0].status !== "received") throw new Error("APP_NOT_OPEN");

      const org = await c.query<{ id: string }>(
        `INSERT INTO organizations (code, country, org_type, parent_id)
         VALUES ($1, upper($2), $3, $4) RETURNING id`,
        [v.code, v.country, v.orgType, v.parentId || null],
      );
      const newOrgId = org.rows[0].id;

      // 기관명은 컬럼이 아니라 translations 의 행이다 (설계 원칙 2)
      await setTranslation(c, "organizations", newOrgId, "ko", "name", v.nameKo);
      if (v.nameEn) {
        await setTranslation(c, "organizations", newOrgId, "en", "name", v.nameEn);
      }

      /* 담당자 계정. 학생이든 담당자든 로그인 주체는 users 하나다 (설계 원칙 1) */
      const user = await c.query<{ id: string }>(
        `INSERT INTO users (email, password_hash, display_name, must_reset_pw)
         VALUES ($1, $2, $3, true) RETURNING id`,
        [v.adminEmail, passwordHash, v.adminName],
      );
      await c.query(
        `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, 'org_admin')`,
        [user.rows[0].id, newOrgId],
      );

      const contract = await c.query<{ id: string }>(
        `INSERT INTO contracts (org_id, title, starts_on, ends_on, seat_count)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [newOrgId, v.contractTitle, v.startsOn, v.endsOn, v.seatCount],
      );

      /* 응시권은 계약을 만들 때 seat_count 만큼 미리 만들어 둔다.
         한 줄씩 넣지 않고 generate_series 로 한 번에 넣는다 */
      await c.query(
        `INSERT INTO seats (contract_id, expires_at)
         SELECT $1, $2::date + interval '1 day'
           FROM generate_series(1, $3)`,
        [contract.rows[0].id, v.endsOn, v.seatCount],
      );

      await c.query(
        `INSERT INTO org_links (org_id, token, label, max_uses, expires_at, created_by)
         VALUES ($1, $2, $3, $4, $5::date + interval '1 day', $6)`,
        [newOrgId, token, v.linkLabel, v.seatCount, v.endsOn, me.id],
      );

      await c.query(
        `UPDATE org_applications
            SET status = 'approved', org_id = $1, reviewed_by = $2, reviewed_at = now()
          WHERE id = $3`,
        [newOrgId, me.id, applicationId],
      );

      return newOrgId;
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("APP_NOT_FOUND")) return { message: "신청서를 찾을 수 없습니다." };
    if (msg.includes("APP_NOT_OPEN")) return { message: "이미 처리된 신청서입니다." };
    if (msg.includes("organizations_code_key")) {
      return { errors: { code: "이미 쓰고 있는 코드입니다." } };
    }
    if (msg.includes("users_email_key")) {
      return { errors: { adminEmail: "이미 쓰고 있는 이메일입니다." } };
    }
    throw e;
  }

  /* 여기서 revalidatePath 를 부르면 안 된다. 지금 이 화면이 서버에서 다시
     그려지면서 승인 결과가 사라지는데, 임시 비밀번호는 이 화면에서만 볼 수
     있으므로 그대로 잃어버린다. 목록과 기관 화면은 force-dynamic 이라
     들어갈 때마다 새로 읽으므로 따로 무효화할 필요도 없다. */
  return {
    issued: {
      orgId,
      joinUrl: joinUrl(token),
      adminEmail: v.adminEmail,
      tempPassword,
    },
  };
}

export async function rejectAction(applicationId: string, formData: FormData) {
  const me = await requireRole(["superadmin"]);
  const memo = String(formData.get("memo") ?? "").trim().slice(0, 2000);

  await tx(async (c) => {
    const r = await c.query(
      `UPDATE org_applications
          SET status = 'rejected', reviewed_by = $1, reviewed_at = now(), review_memo = $2
        WHERE id = $3 AND status = 'received'`,
      [me.id, memo || null, applicationId],
    );
    if (r.rowCount === 0) throw new Error("이미 처리된 신청서입니다.");
  });
}
