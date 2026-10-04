/**
 * 개인 첫 화면이 읽는 것.
 *
 * 화면이 세 상태로 갈린다: 아직 안 봤다 · 보는 중이다 · 끝났다. 어느
 * 상태인지를 **화면이 추측하지 않도록** 여기서 정해 내보낸다.
 *
 * **여기서 점수를 만들지 않는다.** 이미 `job_fit_scores` 와
 * `skill_gap_items` 에 들어 있는 값을 이름만 붙여 읽는다. 등수도 다시
 * 매기지 않는다: `rank_no` 가 이미 정해 둔 순서다.
 */
import { query, queryOne } from "@/lib/db";
import { currentAttempt } from "@/lib/attempts";
import { reportLevel } from "@/lib/entitlement";

const NAME = (t: string, alias: string) =>
  `COALESCE(
     (SELECT value FROM translations
       WHERE table_name = '${t}' AND row_id = ${alias}.id AND lang = $2 AND field = 'name'),
     (SELECT value FROM translations
       WHERE table_name = '${t}' AND row_id = ${alias}.id AND lang = 'en' AND field = 'name'),
     ${alias}.code)`;

export type MyState =
  | { kind: "none"; seatReady: boolean }
  | {
      kind: "progress";
      attemptId: string;
      answered: number;
      total: number;
      percent: number;
      track: string | null;
      tier: string | null;
    }
  | {
      kind: "done";
      attemptId: string;
      tier: string | null;
      scoredAt: string | null;
      top: { code: string; name: string; tier: number }[];
      gap: { name: string; action: string | null } | null;
      evidence: { confirmed: number; areas: number };
    };

const num = (v: unknown) => Number(v ?? 0);

export async function myState(userId: string, lang: string): Promise<MyState> {
  /* 끝난 응시가 있으면 그것이 가장 쓸모 있는 상태다 */
  const done = await queryOne<{ id: string; scored_at: string | null }>(
    `SELECT id, to_char(scored_at, 'YYYY-MM-DD') AS scored_at
       FROM attempts WHERE user_id = $1 AND status = 'scored'
      ORDER BY id DESC LIMIT 1`,
    [userId],
  ).catch(() => null);

  if (done) {
    const top = await query<{ code: string; name: string; tier: number }>(
      `SELECT jc.code, ${NAME("job_clusters", "jc")} AS name,
              COALESCE(f.tier, f.rank_no)::int AS tier
         FROM job_fit_scores f JOIN job_clusters jc ON jc.id = f.job_id
        WHERE f.attempt_id = $1 ORDER BY f.rank_no LIMIT 3`,
      [done.id, lang],
    ).catch(() => []);

    const gap = await queryOne<{ name: string; action: string | null }>(
      `SELECT ${NAME("competencies", "c")} AS name, g.action_kind AS action
         FROM skill_gap_items g JOIN competencies c ON c.id = g.competency_id
        WHERE g.attempt_id = $1 ORDER BY g.rank_no LIMIT 1`,
      [done.id, lang],
    ).catch(() => null);

    const ev = await queryOne<{ confirmed: string; areas: string }>(
      `SELECT count(*)::text AS confirmed,
              count(DISTINCT competency_id)::text AS areas
         FROM learner_evidence WHERE user_id = $1`,
      [userId],
    ).catch(() => null);

    return {
      kind: "done",
      attemptId: done.id,
      tier: await reportLevel(done.id).catch(() => null),
      scoredAt: done.scored_at,
      top,
      gap: gap ?? null,
      evidence: { confirmed: num(ev?.confirmed), areas: num(ev?.areas) },
    };
  }

  /* 보는 중인 응시. `currentAttempt` 가 좌석까지 보고 고른다 */
  const cur = await currentAttempt(userId).catch(() => null);
  if (cur) {
    return {
      kind: "progress",
      attemptId: cur.id,
      answered: cur.answered,
      total: cur.total,
      /* 바닥이 0 이면 비율을 만들지 않는다. 여기서는 0 으로 둔다:
         문항이 하나도 없는 검사지는 응시 자체가 성립하지 않는다 */
      percent: cur.total > 0 ? Math.round((cur.answered / cur.total) * 100) : 0,
      track: cur.trackCode,
      tier: await reportLevel(cur.id).catch(() => null),
    };
  }

  /* 쓸 수 있는 좌석이 있는가. 있으면 '시작' 이고 없으면 '사거나 받기' 다 */
  const seat = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM seats s
      WHERE s.user_id = $1
        AND s.status NOT IN ('revoked', 'expired')
        AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.seat_id = s.id)`,
    [userId],
  ).catch(() => null);

  return { kind: "none", seatReady: num(seat?.n) > 0 };
}
