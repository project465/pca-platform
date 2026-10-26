import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";

/**
 * 앱 화면의 로그인 확인. 웹의 `requireUser()` 와 같되 **로그인하지 않았으면
 * 앱 첫 화면으로 보낸다**: 앱을 처음 연 사람이 웹 로그인 폼부터 보면 앱이
 * 웹 페이지를 띄운 것으로 읽힌다.
 */
export async function appUser() {
  const u = await currentUser().catch(() => null);
  if (!u) redirect("/m/welcome");
  if (u.mustResetPw) redirect("/password/change");
  return u;
}
