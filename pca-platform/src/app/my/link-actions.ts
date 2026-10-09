"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { isProvider } from "@/lib/auth-accounts";
import { enabledProviders } from "@/lib/auth-oauth";
import { LINK_COOKIE, sealIntent } from "@/lib/oauth-link-intent";

/**
 * 계정에 로그인 방법을 **붙이러 간다.**
 *
 * 나갈 때 봉한 쪽지를 쿠키로 들려 보내고, 돌아올 때 `signIn` 콜백이
 * 그것을 읽어 **지금 이 사람에게** 붙인다(`auth.ts`). 쪽지가 없으면
 * 평소대로 "누구인가" 를 묻는 길이라, 로그인한 사람이 눌렀는데 계정이
 * 바뀌는 일이 생기지 않는다.
 *
 * **POST 로만 연다.** 주소만 눌러도 쪽지가 심어지면 링크 미리보기가
 * 연결을 시작한다.
 *
 * **끊는 쪽은 만들지 않는다.** 마지막 하나를 끊으면 그 사람이 다시는
 * 못 들어오고, 그 상태를 되돌릴 길이 화면에 없다. 만들려면 "비밀번호가
 * 있거나 다른 방법이 하나 더 있을 때만" 같은 조건이 필요하고, 그 조건을
 * 틀리면 사람을 잠근다. 지금은 만들지 않는 쪽이 맞다.
 */
export async function linkProvider(form: FormData): Promise<void> {
  const user = await requireUser();
  const p = String(form.get("provider") ?? "").trim();
  if (!isProvider(p) || !enabledProviders().includes(p)) redirect("/my?link=off");

  const jar = await cookies();
  jar.set(LINK_COOKIE, sealIntent(user.id, p), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
  });
  await signIn(p, { redirectTo: "/my" });
}
