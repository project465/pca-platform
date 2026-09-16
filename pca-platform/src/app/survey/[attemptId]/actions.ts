"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { saveSurvey, surveyDone, type SurveyPhase } from "@/lib/survey";

/** 한 문항. 누를 때마다 바로 적는다 — 검사 문항과 같은 규칙이다. */
export async function answerSurvey(
  attemptId: string,
  itemId: string,
  value: number,
): Promise<{ ok: boolean }> {
  const user = await requireRole(["student"]);
  return { ok: await saveSurvey(attemptId, user.id, itemId, value) };
}

/**
 * 다 답했으면 다음으로 보낸다.
 *
 * **서버에서 다시 센다.** 화면이 "다 답했다" 고 말하는 것만 믿으면,
 * 버튼을 직접 눌러 빈 채로 넘어갈 수 있다.
 */
export async function finishSurvey(attemptId: string, phase: SurveyPhase): Promise<never | { missing: true }> {
  await requireRole(["student"]);
  if (!(await surveyDone(attemptId, phase))) return { missing: true };
  redirect(phase === "before" ? `/test/${attemptId}` : `/report/${attemptId}`);
}
