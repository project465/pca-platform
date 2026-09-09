"use server";

import { redirect } from "next/navigation";
import { tx } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { passwordSchema, fieldErrors, type FieldErrors } from "@/lib/validation";
import { readLink } from "@/lib/join";
import { emailAllowed, loginIdAllowed, maskExample } from "@/lib/join-rules";
import { PRIVACY_VERSION } from "@/content/privacy";
import { z } from "zod";

export type JoinState = { errors?: FieldErrors; message?: string };

const schema = z
  .object({
    displayName: z.string().trim().min(1, "이름을 입력하세요.").max(100),
    loginId: z
      .string()
      .trim()
      .min(2, "학번을 입력하세요.")
      .max(50)
      .regex(/^[A-Za-z0-9_-]+$/, "학번은 영문·숫자·하이픈·밑줄만 쓸 수 있습니다."),
    /** 이메일은 링크가 도메인을 걸었을 때만 묻는다 */
    email: z.union([z.literal(""), z.string().trim().email("이메일 형식이 아닙니다.").max(200)]).optional(),
    password: passwordSchema,
    passwordConfirm: z.string(),
    /* 체크박스는 켜야만 값이 온다. 안 켜면 undefined 라 여기서 걸린다 */
    consent: z.literal("1", {
      errorMap: () => ({ message: "개인정보 수집·이용에 동의해야 등록할 수 있습니다." }),
    }),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "비밀번호가 서로 다릅니다.",
  });

/**
 * 전용 링크로 들어온 학생을 응시자로 등록한다.
 *
 * 열린 가입이 아니다. 담당자가 발급한 링크를 가진 사람만, 그 단체가 산
 * 응시권이 남아 있는 동안만 들어올 수 있다. 좌석을 실제로 하나 잡아
 * 두므로 링크가 새어 나가도 계약한 수를 넘겨 등록되지 않는다.
 */
export async function joinAction(
  token: string,
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const parsed = schema.safeParse({
    displayName: formData.get("displayName"),
    loginId: formData.get("loginId"),
    email: formData.get("email") ?? "",
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
    consent: formData.get("consent"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const link = await readLink(token);
  if (!link.ok) return { message: "지금은 이 링크로 등록할 수 없습니다." };

  /* 링크에 걸린 조건. 화면에서도 막지만 서버에서 다시 본다 —
     화면의 검사는 브라우저에만 있는 것이라 그대로 두면 우회된다 */
  if (!loginIdAllowed(v.loginId, link.loginIdMask)) {
    return {
      errors: {
        loginId: `학번 형태가 맞지 않습니다. ${maskExample(link.loginIdMask!)} 처럼 적어 주세요.`,
      },
    };
  }
  if (link.emailDomains.length > 0) {
    if (!v.email) {
      return { errors: { email: "이메일을 입력하세요." } };
    }
    if (!emailAllowed(v.email, link.emailDomains)) {
      return {
        errors: {
          email: `${link.emailDomains.map((d) => "@" + d).join(", ")} 주소만 등록할 수 있습니다.`,
        },
      };
    }
  }

  const passwordHash = await hashPassword(v.password);

  try {
    await tx(async (c) => {
      /* 링크를 잠근다. 두 사람이 마지막 한 자리를 동시에 노려도
         한 명만 통과한다 */
      const l = await c.query<{ max_uses: string | null; used_count: string }>(
        `SELECT max_uses::text AS max_uses, used_count::text AS used_count
           FROM org_links
          WHERE id = $1 AND revoked_at IS NULL
            AND (expires_at IS NULL OR expires_at > now())
          FOR UPDATE`,
        [link.linkId],
      );
      if (l.rowCount === 0) throw new Error("LINK_CLOSED");
      const max = l.rows[0].max_uses === null ? null : Number(l.rows[0].max_uses);
      if (max !== null && Number(l.rows[0].used_count) >= max) throw new Error("LINK_FULL");

      /* 남은 응시권 하나를 잡는다. SKIP LOCKED 라 동시에 들어와도
         서로 다른 좌석을 가져간다 */
      const seat = await c.query<{ id: string }>(
        `SELECT s.id
           FROM seats s
           JOIN contracts ct ON ct.id = s.contract_id
          WHERE ct.org_id = $1 AND ct.status = 'active'
            AND s.user_id IS NULL AND s.consumed_at IS NULL
          ORDER BY s.id
          FOR UPDATE OF s SKIP LOCKED
          LIMIT 1`,
        [link.orgId],
      );
      if (seat.rowCount === 0) throw new Error("NO_SEAT");

      const user = await c.query<{ id: string }>(
        `INSERT INTO users (login_id, email, password_hash, display_name, must_reset_pw)
         VALUES ($1, $2, $3, $4, false) RETURNING id`,
        [v.loginId, v.email || null, passwordHash, v.displayName],
      );
      const userId = user.rows[0].id;

      await c.query(
        `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, 'student')`,
        [userId, link.orgId],
      );
      /* 동의한 사실을 남긴다. 어느 판에 동의했는지가 함께 남아야
         방침이 바뀌었을 때 다시 받을 사람을 갈라낼 수 있다 */
      await c.query(
        `INSERT INTO consents (user_id, kind, version) VALUES ($1, 'privacy', $2)`,
        [userId, PRIVACY_VERSION],
      );
      await c.query(
        `UPDATE seats SET user_id = $1, assigned_at = now() WHERE id = $2`,
        [userId, seat.rows[0].id],
      );
      await c.query(
        `UPDATE org_links SET used_count = used_count + 1 WHERE id = $1`,
        [link.linkId],
      );
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("LINK_CLOSED")) return { message: "지금은 이 링크로 등록할 수 없습니다." };
    if (msg.includes("LINK_FULL")) return { message: "방금 정원이 찼습니다. 담당자에게 문의해 주세요." };
    if (msg.includes("NO_SEAT")) {
      return { message: "남은 응시권이 없습니다. 학과 담당자에게 문의해 주세요." };
    }
    if (msg.includes("users_login_id_key")) {
      return { errors: { loginId: "이미 등록된 학번입니다. 로그인 화면으로 가세요." } };
    }
    if (msg.includes("users_email_key")) {
      return { errors: { email: "이미 등록된 이메일입니다. 로그인 화면으로 가세요." } };
    }
    throw e;
  }

  redirect("/login?joined=1");
}
