"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { upgradeTier } from "@/lib/me-v3/runtime/session";
import { upgradeTarget } from "@/lib/me-v3/upgrade";

/**
 * 산 등급으로 지난 응시를 넓힌다.
 *
 * **폼이 보낼 수 있는 것은 없다.** 어느 응시를 어느 등급으로 넓히는지는
 * 서버가 이용권에서 다시 찾는다: 응시 번호나 등급을 받으면 주소를 고쳐 남의
 * 응시나 사지 않은 등급을 여는 길이 생긴다.
 */
export async function upgradeAction(): Promise<void> {
  const user = await requireUser();
  const t = await upgradeTarget(user.id);
  if (!t) redirect("/me");
  const a = await upgradeTier(t.attemptId, user.id, t.to, t.entitlementId);
  redirect(`/v3/${a.id}`);
}
