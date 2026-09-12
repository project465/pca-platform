import { query, queryOne, tx } from "@/lib/db";
import type { PoolClient } from "pg";

export class ScoringError extends Error {}

export type WeightCoverage = {
  instrument_id: string;
  indicators: number;
  jobs: number;
  filled: number;
};

export async function weightCoverage(instrumentId: string): Promise<WeightCoverage> {
  const row = await queryOne<WeightCoverage>(
    `SELECT i.id AS instrument_id,
            (SELECT count(*) FROM indicators n WHERE n.instrument_id = i.id)::int AS indicators,
            (SELECT count(*) FROM job_clusters j WHERE j.major_id = i.major_id)::int AS jobs,
            (SELECT count(*) FROM scoring_weights w
              WHERE w.instrument_id = i.id AND w.weight > 0)::int AS filled
       FROM instruments i WHERE i.id = $1`,
    [instrumentId],
  );
  if (!row) throw new ScoringError("검사 도구를 찾을 수 없습니다.");
  return row;
}

/**
 * 지표 점수 → 직무 적합도 → 역량 보유 수준 순서로 채운다.
 * 가중치가 하나도 없으면 직무 적합도를 낼 수 없으므로 시작하지 않는다.
 */
async function scoreOne(c: PoolClient, attemptId: string, instrumentId: string) {
  await c.query(
    `WITH picked AS (
       SELECT q.indicator_id, q.is_reversed, o.score,
              (SELECT min(score) FROM question_options x WHERE x.question_id = q.id) AS lo,
              (SELECT max(score) FROM question_options x WHERE x.question_id = q.id) AS hi
         FROM responses r
         JOIN questions q        ON q.id = r.question_id
         JOIN question_options o ON o.id = r.option_id
        WHERE r.attempt_id = $1 AND q.indicator_id IS NOT NULL
     ), per AS (
       SELECT indicator_id,
              sum(CASE WHEN is_reversed THEN lo + hi - score ELSE score END) AS raw,
              sum(lo) AS lo_sum, sum(hi) AS hi_sum
         FROM picked GROUP BY indicator_id
     )
     INSERT INTO indicator_scores (attempt_id, indicator_id, raw_score, scaled_score)
     SELECT $1, indicator_id, raw,
            CASE WHEN hi_sum > lo_sum
                 THEN round((raw - lo_sum) / (hi_sum - lo_sum) * 100, 1)
                 ELSE 0 END
       FROM per
     ON CONFLICT (attempt_id, indicator_id)
     DO UPDATE SET raw_score = EXCLUDED.raw_score, scaled_score = EXCLUDED.scaled_score`,
    [attemptId],
  );

  // 순위가 바뀌므로 지우고 다시 넣는다.
  await c.query(`DELETE FROM job_fit_scores WHERE attempt_id = $1`, [attemptId]);
  const fit = await c.query(
    `WITH fit AS (
       SELECT w.job_id,
              sum(s.scaled_score * w.weight) / sum(w.weight) AS score
         FROM indicator_scores s
         JOIN scoring_weights w
           ON w.indicator_id = s.indicator_id AND w.instrument_id = $2 AND w.weight > 0
        WHERE s.attempt_id = $1
        GROUP BY w.job_id
     )
     INSERT INTO job_fit_scores (attempt_id, job_id, fit_score, rank_no)
     SELECT $1, job_id, round(score, 1),
            row_number() OVER (ORDER BY score DESC, job_id)
       FROM fit WHERE score IS NOT NULL`,
    [attemptId, instrumentId],
  );
  if (fit.rowCount === 0) {
    throw new ScoringError("가중치가 없어 직무 적합도를 낼 수 없습니다.");
  }

  // 역량을 직접 묻는 문항은 선택 순번을 0~5 로 옮긴다. 같은 역량을 여러 번 물었으면 높은 쪽.
  await c.query(
    `WITH lv AS (
       SELECT q.competency_id, o.order_no,
              (SELECT count(*) FROM question_options x WHERE x.question_id = q.id) AS n
         FROM responses r
         JOIN questions q        ON q.id = r.question_id
         JOIN question_options o ON o.id = r.option_id
        WHERE r.attempt_id = $1 AND q.competency_id IS NOT NULL
     )
     INSERT INTO competency_levels (attempt_id, competency_id, held_level)
     SELECT $1, competency_id,
            max(CASE WHEN n > 1 THEN round((order_no - 1)::numeric / (n - 1) * 5) ELSE 0 END)
       FROM lv GROUP BY competency_id
     ON CONFLICT (attempt_id, competency_id)
     DO UPDATE SET held_level = EXCLUDED.held_level`,
    [attemptId],
  );

  await c.query(
    `UPDATE attempts SET status = 'scored', scored_at = now() WHERE id = $1`,
    [attemptId],
  );
}

export async function scoreAttempt(attemptId: string): Promise<void> {
  const a = await queryOne<{ status: string; instrument_id: string; answers: number }>(
    `SELECT a.status, ts.instrument_id,
            (SELECT count(*) FROM responses r
              WHERE r.attempt_id = a.id AND r.option_id IS NOT NULL)::int AS answers
       FROM attempts a JOIN test_sessions ts ON ts.id = a.session_id
      WHERE a.id = $1`,
    [attemptId],
  );
  if (!a) throw new ScoringError("응시를 찾을 수 없습니다.");
  if (a.status !== "submitted" && a.status !== "scored") {
    throw new ScoringError("제출된 응시만 채점할 수 있습니다.");
  }
  if (a.answers === 0) throw new ScoringError("응답이 없습니다.");

  const cover = await weightCoverage(a.instrument_id);
  if (cover.filled === 0) {
    throw new ScoringError("이 검사 도구의 채점 가중치가 비어 있습니다. 운영사가 먼저 채워야 합니다.");
  }

  await tx((c) => scoreOne(c, attemptId, a.instrument_id));
}

export async function scoreSession(sessionId: string): Promise<{ scored: number }> {
  const rows = await query<{ id: string }>(
    `SELECT a.id FROM attempts a
      WHERE a.session_id = $1 AND a.status = 'submitted'
      ORDER BY a.id`,
    [sessionId],
  );
  for (const r of rows) await scoreAttempt(r.id);
  return { scored: rows.length };
}

export type WeightCell = { indicatorId: string; jobId: string; weight: number };

export async function saveWeights(instrumentId: string, cells: WeightCell[]): Promise<void> {
  await tx(async (c) => {
    for (const cell of cells) {
      await c.query(
        `INSERT INTO scoring_weights (instrument_id, indicator_id, job_id, weight)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (instrument_id, indicator_id, job_id)
         DO UPDATE SET weight = EXCLUDED.weight`,
        [instrumentId, cell.indicatorId, cell.jobId, cell.weight],
      );
    }
  });
}

export async function currentWeights(instrumentId: string): Promise<Map<string, number>> {
  const rows = await query<{ indicator_id: string; job_id: string; weight: string }>(
    `SELECT indicator_id, job_id, weight::text FROM scoring_weights WHERE instrument_id = $1`,
    [instrumentId],
  );
  return new Map(rows.map((r) => [`${r.indicator_id}:${r.job_id}`, Number(r.weight)]));
}
