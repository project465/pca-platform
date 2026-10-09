"use server";

import { signIn } from "@/lib/auth";
import { isProvider } from "@/lib/auth-accounts";
import { enabledProviders } from "@/lib/auth-oauth";
import { safeNext } from "@/lib/safe-next";

/**
 * 공급자로 보낸다.
 *
 * **POST 로만 연다.** 주소만 눌러도 공급자로 넘어가면 링크 미리보기가
 * 로그인 흐름을 시작하고, 돌아올 자리를 화면이 아닌 링크가 정한다.
 *
 * **돌아올 자리를 걸러서 넘긴다.** `redirectTo` 에 바깥 주소가 들어가면
 * 로그인한 사람이 남의 사이트로 떨어지고, 그 사이트가 우리 화면처럼
 * 생겼으면 그 다음은 피싱이다(`safeNext`).
 *
 * **꽂히지 않은 공급자는 거절한다.** 폼이 보낼 수 있는 값은 글자 하나라
 * 고쳐 보낼 수 있고, 등록되지 않은 공급자로 `signIn` 을 부르면
 * 던져진다.
 */
export async function startOauth(form: FormData): Promise<void> {
  const p = String(form.get("provider") ?? "").trim();
  const to = safeNext(String(form.get("next") ?? ""), "/");
  if (!isProvider(p) || !enabledProviders().includes(p)) {
    const { redirect } = await import("next/navigation");
    redirect("/login?error=provider_off");
  }
  await signIn(p, { redirectTo: to });
}
