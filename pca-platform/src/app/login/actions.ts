"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { safeNext } from "@/lib/session";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "아이디와 비밀번호를 모두 입력하세요." };
  }

  try {
    await signIn("credentials", { identifier, password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      // 아이디가 없는 것인지 비밀번호가 틀린 것인지 구분해 알려주지 않는다.
      return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
    }
    throw e;
  }

  // 보던 화면이 있으면 그리로 돌려보낸다. 없으면 역할과 must_reset_pw 에 따라
  // "/" 가 알아서 갈 곳을 정한다.
  redirect(safeNext(String(formData.get("next") ?? "") || undefined));
}
