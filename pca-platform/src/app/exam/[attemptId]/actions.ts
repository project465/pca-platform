"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { ExamError, saveResponse, startAttempt, submitAttempt } from "@/lib/exam";

/**
 * 응시 중 서버로 가는 것은 셋뿐이다 — 시작, 응답 한 개 저장, 제출.
 * 문항 이동은 서버를 부르지 않는다.
 */

/**
 * 저장 실패에는 두 종류가 있다.
 *  · 다시 보내면 되는 것 — 연결이 끊겼다, 서버가 잠깐 죽었다
 *  · 다시 보내도 소용없는 것 — 응시 기간이 끝났다, 이미 제출했다, 남의 응답이다
 * 뒤쪽을 무한히 재시도하면 화면은 영원히 "다시 시도합니다"만 보여준다.
 */
export type SaveOutcome =
  | { ok: true; answered: number }
  | { ok: false; message: string; retryable: boolean };

export async function saveAnswerAction(input: {
  attemptId: string;
  questionId: string;
  optionId: string;
}): Promise<SaveOutcome> {
  const user = await requireUser();
  try {
    const { answered } = await saveResponse({ ...input, userId: user.id });
    return { ok: true, answered };
  } catch (e) {
    if (e instanceof ExamError) return { ok: false, message: e.message, retryable: false };
    // 그 밖의 오류(연결·일시적 장애)는 화면이 다시 보내도록 둔다.
    return { ok: false, message: "저장하지 못했습니다.", retryable: true };
  }
}

export async function startAction(attemptId: string): Promise<SaveOutcome> {
  const user = await requireUser();
  try {
    await startAttempt(attemptId, user.id);
    revalidatePath(`/exam/${attemptId}`);
    return { ok: true, answered: 0 };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof ExamError ? e.message : "시작하지 못했습니다.",
      retryable: false,
    };
  }
}

export type SubmitOutcome =
  | { ok: true; submittedAt: string }
  | { ok: false; message: string };

export async function submitAction(attemptId: string): Promise<SubmitOutcome> {
  const user = await requireUser();
  try {
    const { submittedAt } = await submitAttempt({ attemptId, userId: user.id });
    // 응시 화면은 다시 그리지 않는다. 여기서 revalidate 하면 서버가 '이미 제출한
    // 응시입니다' 화면으로 갈아치워, 방금 제출한 사람이 완료 화면을 못 본다.
    // 다음에 이 주소를 열면 그때 제출 완료 화면이 나온다.
    revalidatePath("/my");
    return { ok: true, submittedAt };
  } catch (e) {
    if (e instanceof ExamError) return { ok: false, message: e.message };
    return { ok: false, message: "제출하지 못했습니다. 다시 시도해 주세요." };
  }
}
