"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { query, queryOne } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { signIn } from "@/lib/auth";
import { fieldErrors, signupSchema, type FieldErrors } from "@/lib/validation";

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
  await query(
    `INSERT INTO users (email, display_name, password_hash, must_reset_pw, status)
     VALUES ($1, $2, $3, false, 'active')`,
    [email, name, hash],
  );

  try {
    await signIn("credentials", { identifier: email, password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) return { message: "가입은 됐습니다. 로그인해 주세요." };
    throw e;
  }

  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/my");
}
