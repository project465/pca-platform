"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { queryOne } from "@/lib/db";
import { ref, swallow } from "@/lib/oplog";
import { hashPassword } from "@/lib/password";
import { signIn } from "@/lib/auth";
import { fieldErrors, signupSchema, type FieldErrors } from "@/lib/validation";
import { enqueue } from "@/lib/outbox";
import { resolveLang } from "@/lib/locale-server";
import { record as consentRecord } from "@/lib/consent";
import { sendVerification } from "@/lib/verify-email";
import { publicBase } from "@/lib/urls";
import { headers } from "next/headers";

export type SignupState = { errors?: FieldErrors; message?: string };

/**
 * 개인 가입. 가입하면 곧바로 로그인시켜 원래 가려던 곳으로 보낸다.
 * 결제하러 온 사람에게 "가입됐습니다. 다시 로그인하세요" 는 이탈이다.
 */
export async function signupAction(_prev: SignupState, form: FormData): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    email: form.get("email"),
    name: form.get("name"),
    password: form.get("password"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { email, name, password } = parsed.data;

  const taken = await queryOne<{ id: string }>(
    `SELECT id FROM users WHERE lower(email) = $1`,
    [email],
  );
  if (taken) {
    return { errors: { email: "이미 가입된 이메일입니다. 로그인해 주세요." } };
  }

  const hash = await hashPassword(password);
  const created = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, must_reset_pw, status)
     VALUES ($1, $2, $3, false, 'active')
     RETURNING id`,
    [email, name, hash],
  );

  /**
   * 동의를 적는다. **가입과 같은 요청에서 적는다**: 다음 화면으로
   * 넘기고 거기서 받으면, 그 사이에 창을 닫은 사람이 동의 없이 계정을
   * 가진 상태로 남는다.
   *
   * **필수가 빠지면 가입을 되돌린다.** 화면의 `required` 는 안내이고,
   * 막는 것은 여기다(개발자 도구로 지울 수 있는 것은 막는 것이 아니다).
   */
  const lang2 = (await resolveLang().catch(() => "ko")) === "en" ? "en" : "ko";
  if (created) {
    const agreed = form.getAll("consent").map(String).filter(Boolean);
    const saved = await consentRecord({
      userId: created.id, locale: lang2, siteId: null, agreedIds: agreed,
    });
    if (!saved.ok) {
      /* **되돌리기가 실패하면 그것이 더 큰 일이다.** 동의 없는 계정이
         남는다. 조용히 넘기면 아무도 모르므로 반드시 남긴다 */
      await queryOne(`DELETE FROM users WHERE id = $1`, [created.id])
        .catch(swallow({
          operation: "signup.rollback", ref: ref("user", created.id),
          step: "delete", category: "db",
          detail: "동의 저장이 실패해 계정을 되돌리는 중",
        }));
      return { message: saved.reason };
    }
  }

  // 인사 한 줄을 대기열에 적는다. 메일 서버를 여기서 기다리지 않는다.
  // 기다리면 메일이 느린 날 가입 버튼이 느려진다.
  await enqueue({
    kind: "signup",
    userId: created?.id ?? null,
    toAddr: email,
    dedupeKey: created ? `signup:${created.id}` : undefined,
    /* **가입한 화면의 언어로 보낸다.** 응시보다 먼저 나가는 메일이라
       응시의 언어를 볼 수 없다. 여기서 적지 않으면 영어로 가입한
       사람에게 한국어 인사가 간다 */
    locale: lang2,
  });

  /* 주소가 닿는지 확인하는 링크를 보낸다. **가입을 막지 않는다**:
     못 보냈으면 지원 화면에 다시 보내는 단추가 선다 */
  if (created) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto")
      ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
    /* 확인 링크도 정규 주소로 나간다. 같은 까닭이다 */
    const base = (await publicBase(lang2 === "en" ? "GLOBAL" : "KR").catch(() => null))
      ?? `${proto}://${host}`;
    await sendVerification(created.id, base).catch(() => null);
  }

  try {
    await signIn("credentials", { identifier: email, password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) return { message: "가입은 됐습니다. 로그인해 주세요." };
    throw e;
  }

  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/me");
}
