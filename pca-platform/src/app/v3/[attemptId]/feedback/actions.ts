"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { attemptOf, latestResult } from "@/lib/me-v3/runtime/session";
import {
  feedbackItems, participantOf, saveFeedback,
} from "@/lib/me-v3/pilot/store";
import { mark } from "@/lib/me-v3/pilot/funnel";

/**
 * 파일럿 의견을 적는다.
 *
 * **빈칸을 억지로 채우게 하지 않는다.** 답하지 않은 문항은 그대로 두고 그
 * 수를 나중에 센다. 모두 필수로 만들면 아무 칸이나 눌러 넘기는 응답이
 * 섞이고, 그 응답은 없는 것만 못하다.
 *
 * **보기 값은 문항이 아는 것만 받는다.** 고르는 문항은 적어 둔 보기에서,
 * 할 일은 그 응시의 결과지에 실제로 적혀 있던 것에서만 받는다. 폼이 보낸
 * 글자를 그대로 적으면 그 칸이 자유입력이 되고, 집계에서 없는 보기가 선다.
 */
export async function submitFeedback(form: FormData): Promise<void> {
  const user = await requireUser();
  const attemptId = String(form.get("attemptId") ?? "");
  const a = await attemptOf(attemptId, user.id);
  if (!a) redirect("/my");
  const p = await participantOf(user.id);
  if (!p) redirect(`/v3/${attemptId}/result`);

  const m = await latestResult(attemptId);
  const actionIds = new Set((m?.actions ?? []).map((x) => x.id));

  let wrote = 0;
  for (const it of await feedbackItems(a.tier)) {
    const raw = String(form.get(it.code) ?? "").trim();
    if (!raw) continue;
    if (it.kind === "scale") {
      const v = Number(raw);
      if (Number.isInteger(v) && v >= 1 && v <= 5) {
        await saveFeedback(attemptId, it.code, v, null);
        wrote += 1;
      }
      continue;
    }
    if (it.kind === "text") {
      await saveFeedback(attemptId, it.code, null, raw.slice(0, 500));
      wrote += 1;
      continue;
    }
    const allow = it.kind === "action"
      ? actionIds
      : new Set((it.choices ?? []).map((c) => c.value));
    if (!allow.has(raw)) continue;
    /* 값 척도는 보기 값이 1~5 라 수로도 적어 둔다. 집계가 둘을 다 읽는다 */
    const asNum = /^[1-5]$/.test(raw) ? Number(raw) : null;
    await saveFeedback(attemptId, it.code, asNum, null, raw);
    wrote += 1;
  }

  if (wrote) {
    await mark("feedback_submitted", {
      userId: user.id, attemptId, participant: p.code, wave: p.wave, tier: a.tier,
    });
  }
  redirect(`/v3/${attemptId}/feedback?ok=1`);
}
