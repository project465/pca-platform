import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { homePathFor } from "@/lib/roles";

export default async function Root() {
  const user = await currentUser();
  // 로그인 화면이 아니라 문 고르는 화면으로 보낸다. 처음 온 사람은
  // 계정이 없고, 계정이 없는 사람에게 로그인 폼만 보여주면 길이 막힌다.
  if (!user) redirect("/start");
  if (user.mustResetPw) redirect("/password/change");
  redirect(homePathFor(user.role));
}
