"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { startAttempt } from "@/lib/exam";

/** 응시 시작·이어하기. 자격은 startAttempt 안에서 소속으로 다시 확인한다 */
export async function startAction(sessionId: string) {
  const user = await requireRole(["student"]);
  let attemptId: string;
  try {
    attemptId = await startAttempt(user.id, sessionId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("NOT_ELIGIBLE")) redirect("/my?error=eligibility");
    if (msg.includes("USE_CAP_REACHED")) redirect("/my?error=cap");
    throw e;
  }
  redirect(`/test/${attemptId}`);
}
