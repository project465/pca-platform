/**
 * 퍼널의 앞 걸음을 DB 상태에서 메운다.
 *
 * **응시 화면을 건드리지 않는다.** `assessment_started` 와 `*_completed` 를
 * 적으려면 응시 화면이나 그 서버 동작에 한 줄이 들어가야 하는데, 그 자리는
 * `ME_V3_ASSESSMENT_UI_V1` 로 굳어 있다. 그 둘은 **이미 DB 에 적혀 있다**:
 * 첫 응답이 찍힌 때가 시작이고 `submitted_at` 이 끝이다. 없는 사실을 새로
 * 만드는 것이 아니라 있는 사실을 퍼널 표로 옮긴다.
 *
 * **여러 번 돌려도 같은 자리에 선다.** `mark()` 가 응시마다 한 번만 적는다.
 */
import { query } from "@/lib/db";
import { completedStep, mark } from "./funnel";

export async function syncFunnel(): Promise<{ started: number; completed: number }> {
  const rows = await query<{
    attempt_id: string; user_id: string; code: string; wave: number;
    tier: string; answered: number; submitted: string | null;
  }>(
    `SELECT a.id::text AS attempt_id, a.user_id::text, p.code, p.wave, a.tier,
            (SELECT count(*) FROM v3_responses r WHERE r.attempt_id = a.id)::int AS answered,
            a.submitted_at::text AS submitted
       FROM v3_attempts a
       JOIN v3_pilot_participants p ON p.user_id = a.user_id`);

  let started = 0, completed = 0;
  for (const r of rows) {
    const who = {
      userId: r.user_id, attemptId: r.attempt_id,
      participant: r.code, wave: r.wave, tier: r.tier,
    };
    if (r.answered > 0) { await mark("assessment_started", who); started += 1; }
    if (r.submitted) { await mark(completedStep(r.tier), who); completed += 1; }
  }
  return { started, completed };
}
