"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { saveResponse, submitAttempt } from "@/lib/attempts";
import { score } from "@/lib/scoring";
import { notifyReportReady } from "@/lib/outbox";

/** 보기 하나를 누를 때마다 부른다. 화면은 기다리지 않는다. */
export async function answer(
  attemptId: string,
  questionId: string,
  optionId: string,
  elapsedMs: number | null,
): Promise<{ answered: number }> {
  const user = await requireRole(["student"]);
  return saveResponse(attemptId, user.id, questionId, optionId, elapsedMs);
}

/** 제출. 빠진 문항이 있으면 그 번호를 돌려주고 멈춘다. */
export async function submit(attemptId: string): Promise<{ missing: number[] } | never> {
  const user = await requireRole(["student"]);
  const res = await submitAttempt(attemptId, user.id);
  if (!res.ok) return { missing: res.missing };

  // 채점은 제출 직후 서버에서 한 번. 점수는 산식이 만든다.
  await score(attemptId);

  // 제출한 사람은 이미 화면 앞에 있다. 이 메일은 그 사람이 아니라
  // **창을 닫고 간 사람**을 위한 것이다. 승인제 회차면 여기서 접히고,
  // 담당자가 공개를 누를 때 다시 불린다.
  await notifyReportReady(attemptId);
  revalidatePath(`/report/${attemptId}`);
  redirect(`/report/${attemptId}`);
}
