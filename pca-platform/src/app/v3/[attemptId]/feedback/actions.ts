"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { attemptOf } from "@/lib/me-v3/runtime/session";
import { feedbackItems, participantOf, saveFeedback } from "@/lib/me-v3/pilot/store";

/**
 * 파일럿 피드백을 적는다.
 *
 * **빈칸을 억지로 채우게 하지 않는다.** 답하지 않은 문항은 그대로 두고,
 * 그 수를 나중에 센다. 모두 필수로 만들면 아무 칸이나 눌러 넘기는 응답이
 * 섞이고, 그 응답은 없는 것만 못하다.
 */
export async function submitFeedback(form: FormData): Promise<void> {
  const user = await requireUser();
  const attemptId = String(form.get("attemptId") ?? "");
  const a = await attemptOf(attemptId, user.id);
  if (!a) redirect("/my");
  if (!(await participantOf(user.id))) redirect(`/v3/${attemptId}/result`);

  for (const it of await feedbackItems(a.tier)) {
    const raw = String(form.get(it.code) ?? "").trim();
    if (!raw) continue;
    if (it.kind === "scale") {
      const n = Number(raw);
      if (Number.isInteger(n) && n >= 1 && n <= 5) {
        await saveFeedback(attemptId, it.code, n, null);
      }
    } else {
      await saveFeedback(attemptId, it.code, null, raw.slice(0, 500));
    }
  }
  redirect(`/v3/${attemptId}/feedback?ok=1`);
}
