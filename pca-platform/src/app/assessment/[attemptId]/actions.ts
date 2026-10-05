"use server";

import { requireUser } from "@/lib/session";
import { progressFor, saveAnswers, submitV2 } from "@/lib/me-v2/attempt";

/** 화면에 돌려주는 진행 상태. **서버가 센 값**이다. */
export type ProgressReply = {
  answered: number;
  total: number;
  sections: { key: string; answered: number; total: number }[];
};

/**
 * 답 묶음을 저장한다.
 *
 * **주인 확인을 서버가 한다.** 화면이 보낸 응시 번호를 믿지 않고
 * `saveAnswers` 가 `user_id` 로 다시 거른다. 남의 응시 번호를 넣으면
 * `null` 이 돌아오고 아무것도 쓰이지 않는다.
 *
 * **응답을 되돌려 보내지 않는다**: 화면이 이미 들고 있고, 되돌려 보내면
 * 느린 응답 하나가 사용자가 방금 고친 답을 덮어쓴다. 대신 **몇 문항이
 * 서버에 들어왔는지**를 함께 돌려준다. 화면이 들고 있는 수와 이 수가
 * 갈리는 순간이 곧 유실이고, 갈린 것을 모르면 끝까지 모른다.
 */
export async function saveAnswersAction(
  attemptId: string,
  answers: Record<string, unknown>,
): Promise<{ ok: boolean; saved: number; progress?: ProgressReply }> {
  const user = await requireUser();
  const r = await saveAnswers(attemptId, user.id, answers);
  if (!r) return { ok: false, saved: 0 };
  const p = await progressFor(attemptId, user.id);
  return {
    ok: true,
    saved: r.saved,
    progress: p ? { answered: p.answered, total: p.total, sections: p.sections } : undefined,
  };
}

/** 지금 서버가 들고 있는 진행 상태만 묻는다. 아무것도 쓰지 않는다. */
export async function progressAction(attemptId: string): Promise<ProgressReply | null> {
  const user = await requireUser();
  const p = await progressFor(attemptId, user.id);
  return p ? { answered: p.answered, total: p.total, sections: p.sections } : null;
}

/**
 * 다 풀었으면 닫는다. 덜 풀었으면 서버가 거절한다.
 *
 * **거절한 까닭과 남은 자리를 같이 돌려준다.** 전에는 거짓 하나만
 * 돌려주고 화면이 조용히 아무것도 안 했다: 누른 사람은 단추가 고장 난
 * 줄 알고 같은 자리에서 멈춘다.
 */
export async function submitAction(
  attemptId: string,
): Promise<{ ok: boolean; reason?: string; progress?: ProgressReply }> {
  const user = await requireUser();
  const r = await submitV2(attemptId, user.id);
  if (r.ok) return { ok: true };
  return {
    ok: false,
    reason: r.reason,
    progress: r.progress
      ? { answered: r.progress.answered, total: r.progress.total, sections: r.progress.sections }
      : undefined,
  };
}
