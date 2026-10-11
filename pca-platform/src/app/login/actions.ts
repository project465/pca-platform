"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { clientIpFrom, loginGate } from "@/lib/login-throttle";

export type LoginState = { error?: string };

/**
 * 기다리라는 말을 분으로 적는다.
 *
 * `잠시 뒤에` 로만 적으면 기다리는 사람이 30초인지 15분인지 몰라 새로
 * 고치기를 되풀이한다. 남은 시간은 **아이디가 있든 없든 같은 규칙으로**
 * 정해지므로 이 수가 계정의 존재를 알려 주지 않는다.
 */
function waitKo(sec: number): string {
  if (sec <= 90) return "약 1분";
  return `약 ${Math.ceil(sec / 60)}분`;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "아이디와 비밀번호를 모두 입력하세요." };
  }

  /**
   * **막는 자리는 `authorize()` 이고 여기는 말을 고르는 자리다**(설계
   * 원칙 10). 같은 모듈에 묻기 때문에 둘의 판단이 갈리지 않는다.
   *
   * 여기서 한 번 더 묻는 까닭은, 막힌 사람에게 `아이디 또는 비밀번호가
   * 올바르지 않습니다` 를 내주면 **제 비밀번호를 의심해 더 찍게** 되기
   * 때문이다. 이 줄이 없어도 막히는 것은 그대로다.
   */
  const gate = loginGate(clientIpFrom(await headers()), identifier);
  if (!gate.ok) {
    return {
      error: `로그인 시도가 너무 많습니다. ${waitKo(gate.retryAfterSec)} 뒤에 다시 시도해주세요.`,
    };
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

  // 원래 가려던 곳이 있으면 그리로. 없으면 "/" 가 역할을 보고 정한다.
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}
