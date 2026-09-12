"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { openFreeOrder } from "@/lib/orders";
import { lastScoredAttempt } from "@/lib/attempts";

export type FreeState = { error?: string };

/**
 * 무료 진단을 연다.
 *
 * GET 으로 열지 않는다. 주소만 눌러도 주문이 생기면 링크 미리보기나
 * 크롤러가 학생 계정에 주문을 만들어 버린다. 그래서 버튼(POST)만 문이다.
 */
export async function openFreeAction(_prev: FreeState, _formData: FormData): Promise<FreeState> {
  const user = await requireUser();
  try {
    await openFreeOrder(user.id);
  } catch {
    return { error: "fail" };
  }
  // 이미 다 풀어 채점까지 끝냈으면 그 결과지로 간다. 무료는 한 번이므로
  // 여기서 /test 로 보내면 "좌석이 없습니다" 를 보게 된다.
  const done = await lastScoredAttempt(user.id);
  if (done) redirect(`/report/${done}`);

  // 좌석이 생겼으면 /test 가 응시로 바꾼다. 풀던 것이 있으면 이어 준다 —
  // openFreeOrder 가 주문을 하나로 묶어 두기 때문이다.
  redirect("/test");
}
