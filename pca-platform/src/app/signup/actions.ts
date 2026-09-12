"use server";

import { query } from "@/lib/db";
import { signup, SignupError } from "@/lib/signup";
import { fieldErrors, signupSchema, type FieldErrors } from "@/lib/validation";

export type SignupState = {
  errors?: FieldErrors;
  message?: string;
  done?: string;
  /** 오류로 되돌아올 때 채워 넣을 값. 비밀번호는 돌려주지 않는다 */
  values?: { email: string; name: string; terms: boolean };
};

export async function signupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const values = {
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    terms: formData.get("terms") === "on",
  };

  const parsed = signupSchema.safeParse({
    email: values.email,
    name: values.name,
    password: formData.get("password"),
    confirm: formData.get("confirm"),
    terms: formData.get("terms") ?? "",
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  let made;
  try {
    made = await signup({
      email: parsed.data.email,
      name: parsed.data.name,
      password: parsed.data.password,
    });
  } catch (e) {
    if (e instanceof SignupError) return { message: e.message, values };
    throw e;
  }

  // 확인 메일은 알림 큐로 나간다. 발송기가 없으면 큐에 쌓인 채로 남는다.
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const link = `${base}/verify/${made.token}`;
  await query(
    `INSERT INTO notifications
       (recipient_id, channel, kind, dedupe_key, subject, body)
     VALUES ($1, 'email', 'verify', $2, $3, $4)`,
    [
      made.userId,
      `verify:${made.userId}`,
      "[현멘] 이메일을 확인해 주세요",
      `아래 링크를 열면 가입이 끝납니다. 3일 안에 열어주세요.\n\n  ${link}\n`,
    ],
  );

  return { done: parsed.data.email };
}
