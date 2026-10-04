"use server";

import { requireUser } from "@/lib/session";
import { saveAnswers, submitV2 } from "@/lib/me-v2/attempt";

/**
 * 답 묶음을 저장한다.
 *
 * **주인 확인을 서버가 한다.** 화면이 보낸 응시 번호를 믿지 않고
 * `saveAnswers` 가 `user_id` 로 다시 거른다. 남의 응시 번호를 넣으면
 * `null` 이 돌아오고 아무것도 쓰이지 않는다.
 *
 * 돌려주는 것은 저장 상태뿐이다. **응답을 되돌려 보내지 않는다**: 화면이
 * 이미 들고 있고, 되돌려 보내면 느린 응답 하나가 사용자가 방금 고친 답을
 * 덮어쓴다.
 */
export async function saveAnswersAction(
  attemptId: string,
  answers: Record<string, unknown>,
): Promise<{ ok: boolean; saved: number }> {
  const user = await requireUser();
  const r = await saveAnswers(attemptId, user.id, answers);
  return r ? { ok: true, saved: r.saved } : { ok: false, saved: 0 };
}

/** 다 풀었으면 닫는다. 덜 풀었으면 서버가 거절한다. */
export async function submitAction(attemptId: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  return { ok: await submitV2(attemptId, user.id) };
}
