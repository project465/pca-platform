"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { currentAttempt } from "@/lib/me-v3/runtime/session";
import { mark } from "@/lib/me-v3/workspace-events";

/**
 * 풀던 검사로 이어서 들어간다.
 *
 * **단추 하나를 위해 서버 동작을 둔 까닭.** `눌렀는가` 를 세려면 누르는
 * 자리에서 세야 하는데, `Link` 로 두면 Next 가 화면에 들어온 링크를 미리
 * 불러오면서 **누르지 않은 사람까지 세어진다**(결과 PDF 가 저절로
 * 만들어지던 것과 같은 자리다). GET 길을 두는 방식도 같은 탈을 낸다.
 *
 * **어느 응시로 가는지는 서버가 정한다.** 폼이 응시 번호를 보낼 수 있게
 * 두면 남의 번호를 적어 보낼 길이 생긴다.
 */
export async function continueAssessment(): Promise<void> {
  const user = await requireUser();
  const open = await currentAttempt(user.id);
  if (!open) redirect("/cores");
  await mark("assessment_continue_clicked", user.id, { tier: open.tier });
  redirect(`/v3/${open.id}`);
}
