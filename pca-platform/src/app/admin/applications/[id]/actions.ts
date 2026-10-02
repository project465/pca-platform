"use server";

import { tx } from "@/lib/db";
import { setTranslation } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import { createResetToken, generateTempPassword, hashPassword } from "@/lib/password";
import { sendMail } from "@/lib/mail";
import { approvedMail, langOfSite } from "@/lib/mail-templates";
import { approveSchema, joinUrl, newLinkToken, resetUrl } from "@/lib/applications";
import { fieldErrors, type FieldErrors } from "@/lib/validation";

/** 담당자 비밀번호 설정 링크가 열려 있는 시간 */
const SETUP_TTL_HOURS = 72;

/**
 * 승인 결과.
 *
 * 임시 비밀번호를 만들어 보여주지 않는다. 메일은 남고 전달되므로 비밀번호가
 * 오래 떠돌게 되고, 화면에 한 번만 보이는 값은 운영자가 놓치면 그대로
 * 잃어버린다. 대신 한 번 쓰면 닫히는 설정 링크를 보낸다.
 *
 * 설정 링크는 DB 에 해시만 남으므로 이 화면에서만 볼 수 있다. 메일이
 * 나갔으면 그것으로 충분하고, 못 나갔을 때 손으로 옮기라고 함께 띄운다.
 */
export type ApproveState = {
  errors?: FieldErrors;
  message?: string;
  issued?: {
    orgId: string;
    joinUrl: string;
    adminEmail: string;
    setupUrl: string;
    setupHours: number;
    seatCount: number;
    billing: "prepaid" | "per_use";
    /** 링크가 받는 인원 상한. null 이면 열려 있다 */
    linkMax: number | null;
    /** 메일이 실제로 나갔는지. 안 나갔으면 화면의 안내문을 사람이 옮겨야 한다 */
    mail: { ok: true; via: string } | { ok: false; error: string };
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
    billing: formData.get("billing") ?? "prepaid",
    unitPrice: formData.get("unitPrice") ?? "",
    useCap: formData.get("useCap") ?? "",
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const v = parsed.data;

  if (v.orgType === "department" && !v.parentId) {
    return { errors: { parentId: "학과는 소속 대학을 골라야 합니다." } };
  }
  if (v.endsOn < v.startsOn) {
    return { errors: { endsOn: "종료일이 시작일보다 앞설 수 없습니다." } };
  }

  /* 계정에는 아무도 모르는 값을 넣는다. 담당자는 설정 링크로 자기 비밀번호를
     정하므로 이 값은 쓰이지 않고, 어디에도 보여주지 않는다 */
  const passwordHash = await hashPassword(generateTempPassword(32));
  const token = newLinkToken();
  const setup = createResetToken();

  let orgId: string;
  let site = "global";
  try {
    orgId = await tx(async (c) => {
      /* 이미 처리된 신청을 두 번 승인하지 않는다. 같은 신청서를 두 사람이
         동시에 열어 두고 각자 누르는 상황을 막는 잠금이기도 하다 */
      const app = await c.query<{ id: string; status: string; site: string }>(
        `SELECT id, status, site FROM org_applications
          WHERE id = $1 FOR UPDATE`,
        [applicationId],
      );
      site = app.rows[0]?.site ?? "global";
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

      /* 비밀번호 설정 링크. issued_by 가 채워져 있으면 본인 요청이 아니라
         운영자가 발급한 것이다 (schema.sql 10번 주석) */
      await c.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, issued_by, expires_at)
         VALUES ($1, $2, $3, now() + ($4 || ' hours')::interval)`,
        [user.rows[0].id, setup.tokenHash, me.id, String(SETUP_TTL_HOURS)],
      );

      const perUse = v.billing === "per_use";
      const contract = await c.query<{ id: string }>(
        `INSERT INTO contracts
           (org_id, title, starts_on, ends_on, billing, seat_count, unit_price, currency, use_cap)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'KRW', $8) RETURNING id`,
        [
          newOrgId, v.contractTitle, v.startsOn, v.endsOn, v.billing,
          /* 건당 계약에는 미리 사 두는 좌석이 없다. CHECK 때문에 선불만 > 0 */
          perUse ? 0 : v.seatCount,
          perUse ? (v.unitPrice as number) : null,
          perUse && typeof v.useCap === "number" ? v.useCap : null,
        ],
      );

      /* 선불이면 응시권을 seat_count 만큼 미리 만들어 둔다. 한 줄씩 넣지
         않고 generate_series 로 한 번에 넣는다.
         건당이면 만들 것이 없다 — 나간 건수가 billing_events 에 쌓인다 */
      if (!perUse) {
        await c.query(
          `INSERT INTO seats (contract_id, expires_at)
           SELECT $1, $2::date + interval '1 day'
             FROM generate_series(1, $3)`,
          [contract.rows[0].id, v.endsOn, v.seatCount],
        );
      }

      /* 링크가 몇 명까지 받는가.
         선불은 산 좌석 수만큼. 건당은 상한이 있으면 그만큼, 없으면 열어 둔다 */
      const linkMax = perUse
        ? (typeof v.useCap === "number" ? v.useCap : null)
        : v.seatCount;
      await c.query(
        `INSERT INTO org_links (org_id, token, label, max_uses, expires_at, created_by)
         VALUES ($1, $2, $3, $4, $5::date + interval '1 day', $6)`,
        [newOrgId, token, v.linkLabel, linkMax, v.endsOn, me.id],
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
  const links = {
    joinUrl: joinUrl(token),
    setupUrl: resetUrl(setup.token),
  };

  /* 메일은 트랜잭션 밖에서 보낸다. 발송이 늦거나 실패해도 이미 만들어진
     기관·링크가 되돌아가서는 안 되기 때문이다 */
  const mail = await sendMail(
    approvedMail(langOfSite(site), {
      to: v.adminEmail,
      orgName: v.nameKo,
      joinUrl: links.joinUrl,
      setupUrl: links.setupUrl,
      setupHours: SETUP_TTL_HOURS,
      seatCount: v.seatCount,
      billing: v.billing,
      linkMax:
        v.billing === "per_use"
          ? (typeof v.useCap === "number" ? v.useCap : null)
          : v.seatCount,
    }),
  );

  return {
    issued: {
      orgId,
      joinUrl: links.joinUrl,
      adminEmail: v.adminEmail,
      setupUrl: links.setupUrl,
      setupHours: SETUP_TTL_HOURS,
      seatCount: v.seatCount,
      billing: v.billing,
      linkMax:
        v.billing === "per_use"
          ? (typeof v.useCap === "number" ? v.useCap : null)
          : v.seatCount,
      mail: mail.ok ? { ok: true, via: mail.via } : { ok: false, error: mail.error },
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
