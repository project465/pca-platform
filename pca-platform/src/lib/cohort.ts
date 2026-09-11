/**
 * 단체 리포트 — 학과가 실제로 사는 물건.
 *
 * 개인 결과지를 500장 묶어 준다고 학과가 돈을 쓰지는 않는다. 학과가 사는
 * 것은 커리큘럼을 손볼 근거다. 그래서 이 리포트의 마지막 절은 항상
 * 같은 모양이어야 한다 —
 *
 *   487명 → GD&T 충족률 31% → 지역 공고의 67%가 요구 → 대상 372명
 *
 * 마지막 칸이 곧 견적서다. 소개 사이트 홈의 gap 절과 같은 그림이고,
 * 여기서는 예시가 아니라 그 학과의 실제 숫자다.
 *
 * 규칙 하나 — 5명 미만 칸은 숫자를 내지 않는다. 익명 집계가 개인 식별이
 * 되는 순간 학과 담당자가 특정 학생을 지목할 수 있고, 그러면 이 제품은
 * 못 쓴다.
 */
import { query, queryOne } from "./db";
import { MIN_CELL } from "./org";

export type Cell = { label: string; n: number; pct: number | null; hidden: boolean };

export type GapDemand = {
  code: string;
  name: string;
  required: number;
  /** 요구 수준을 채운 학생 비율 */
  metPct: number | null;
  /** 아직 못 채운 학생 수 — 교육 대상 */
  shortfall: number;
  hidden: boolean;
};

export type Cohort = {
  session: { id: string; name: string; orgName: string; releasedAt: string | null };
  n: number;
  scored: number;
  /** 5명 미만이면 아무 숫자도 내지 않는다 */
  suppressed: boolean;
  topJobs: Cell[];
  areas: { code: string; name: string; mean: number }[];
  traits: { code: string; name: string; mean: number }[];
  quality: { ok: number; check: number; invalid: number };
  demand: GapDemand[];
  evidenceCoverage: number;
};

const NAME = (t: string, alias: string, langParam: string) =>
  `COALESCE(
     (SELECT value FROM translations WHERE table_name = '${t}' AND row_id = ${alias}.id
       AND lang = ${langParam} AND field = 'name'),
     (SELECT value FROM translations WHERE table_name = '${t}' AND row_id = ${alias}.id
       AND lang = 'en' AND field = 'name'),
     (SELECT value FROM translations WHERE table_name = '${t}' AND row_id = ${alias}.id
       AND lang = 'ko' AND field = 'name'),
     ${alias}.code)`;

/** 칸이 작으면 숫자를 지우고 hidden 으로 표시한다. */
function cell(label: string, n: number, total: number): Cell {
  const hidden = n > 0 && n < MIN_CELL;
  return {
    label,
    n: hidden ? 0 : n,
    pct: hidden || total === 0 ? null : Math.round((n / total) * 1000) / 10,
    hidden,
  };
}

export async function buildCohort(sessionId: string, lang = "ko"): Promise<Cohort | null> {
  const head = await queryOne<{
    id: string;
    name: string;
    org_name: string;
    released_at: string | null;
    n: number;
    scored: number;
  }>(
    `SELECT ts.id, ts.name,
            COALESCE((SELECT value FROM translations WHERE table_name = 'organizations'
                       AND row_id = o.id AND lang = 'ko' AND field = 'name'), o.code) AS org_name,
            ts.released_at,
            (SELECT count(*)::int FROM attempts a WHERE a.session_id = ts.id) AS n,
            (SELECT count(*)::int FROM attempts a
              WHERE a.session_id = ts.id AND a.status = 'scored') AS scored
       FROM test_sessions ts
       LEFT JOIN organizations o ON o.id = ts.org_id
      WHERE ts.id = $1`,
    [sessionId],
  );
  if (!head) return null;

  const base = {
    session: {
      id: head.id,
      name: head.name,
      orgName: head.org_name,
      releasedAt: head.released_at,
    },
    n: head.n,
    scored: head.scored,
  };

  // 채점된 사람이 다섯 명도 안 되면 집계를 내지 않는다.
  if (head.scored < MIN_CELL) {
    return {
      ...base,
      suppressed: true,
      topJobs: [],
      areas: [],
      traits: [],
      quality: { ok: 0, check: 0, invalid: 0 },
      demand: [],
      evidenceCoverage: 0,
    };
  }

  const topJobs = await query<{ name: string; n: number }>(
    `SELECT ${NAME("job_clusters", "jc", "$2")} AS name, count(*)::int AS n
       FROM job_fit_scores f
       JOIN attempts a ON a.id = f.attempt_id
       JOIN job_clusters jc ON jc.id = f.job_id
      WHERE a.session_id = $1 AND a.status = 'scored' AND f.rank_no = 1
      GROUP BY jc.id, jc.code
      ORDER BY n DESC`,
    [sessionId, lang],
  );

  const areas = await query<{ code: string; name: string; mean: number }>(
    `SELECT s.area_code AS code, ${NAME("job_areas", "ja", "$2")} AS name,
            round(avg(s.scaled_score), 1)::float AS mean
       FROM area_scores s
       JOIN attempts a ON a.id = s.attempt_id
       JOIN job_areas ja ON ja.code = s.area_code
      WHERE a.session_id = $1 AND a.status = 'scored'
      GROUP BY s.area_code, ja.id, ja.code
      ORDER BY mean DESC`,
    [sessionId, lang],
  );

  const traits = await query<{ code: string; name: string; mean: number }>(
    `SELECT ax.code, ${NAME("indicator_axes", "ax", "$2")} AS name,
            round(avg(s.scaled_score), 1)::float AS mean
       FROM indicator_scores s
       JOIN indicators i ON i.id = s.indicator_id
       JOIN indicator_axes ax ON ax.code = i.axis_code AND ax.kind = 'trait'
       JOIN attempts a ON a.id = s.attempt_id
      WHERE a.session_id = $1 AND a.status = 'scored'
      GROUP BY ax.id, ax.code, ax.sort_no
      ORDER BY ax.sort_no`,
    [sessionId, lang],
  );

  const q = await queryOne<{ ok: number; check: number; invalid: number }>(
    `SELECT count(*) FILTER (WHERE q.flag = 'ok')::int AS ok,
            count(*) FILTER (WHERE q.flag = 'check')::int AS check,
            count(*) FILTER (WHERE q.flag = 'invalid')::int AS invalid
       FROM attempt_quality q
       JOIN attempts a ON a.id = q.attempt_id
      WHERE a.session_id = $1`,
    [sessionId],
  );

  /**
   * 교육 수요. 이 회차에서 1순위로 많이 나온 직무들이 요구하는 역량을 모아,
   * 요구 수준을 채운 학생 비율과 못 채운 인원을 센다. 못 채운 인원이 곧
   * 교육 대상이고, 그 숫자가 견적서의 마지막 칸이다.
   *
   * 증거가 없는 학생은 "못 채움" 으로 센다. 실제로 들었는데 안 올린 경우가
   * 섞이므로 화면에서 증거 입력률을 함께 보여준다 — 숫자를 부풀리지 않기
   * 위해서다.
   */
  const demand = await query<GapDemand>(
    `WITH scored AS (
       SELECT a.id, a.user_id FROM attempts a
        WHERE a.session_id = $1 AND a.status = 'scored'
     ), top_jobs AS (
       SELECT f.job_id, count(*)::int AS n
         FROM job_fit_scores f JOIN scored s ON s.id = f.attempt_id
        WHERE f.rank_no <= 3
        GROUP BY f.job_id
        ORDER BY n DESC LIMIT 5
     ), reqs AS (
       SELECT m.competency_id, max(m.required_level) AS required
         FROM job_competency_map m JOIN top_jobs t ON t.job_id = m.job_id
        WHERE m.criticality >= 2
        GROUP BY m.competency_id
     )
     SELECT c.code, ${NAME("competencies", "c", "$2")} AS name, r.required,
            round(100.0 * count(*) FILTER (
              WHERE COALESCE(l.held_level, 0) >= r.required) / count(*), 1)::float AS "metPct",
            count(*) FILTER (WHERE COALESCE(l.held_level, 0) < r.required)::int AS shortfall,
            false AS hidden
       FROM reqs r
       JOIN competencies c ON c.id = r.competency_id
       CROSS JOIN scored s
       LEFT JOIN learner_competency_levels l
              ON l.user_id = s.user_id AND l.competency_id = r.competency_id
      GROUP BY c.id, c.code, r.required
      ORDER BY shortfall DESC, r.required DESC, c.code
      LIMIT 12`,
    [sessionId, lang],
  );

  const cov = await queryOne<{ pct: number }>(
    `SELECT COALESCE(round(100.0 * count(*) FILTER (
              WHERE EXISTS (SELECT 1 FROM learner_evidence e WHERE e.user_id = a.user_id)
            ) / NULLIF(count(*), 0), 1), 0)::float AS pct
       FROM attempts a
      WHERE a.session_id = $1 AND a.status = 'scored'`,
    [sessionId],
  );

  return {
    ...base,
    suppressed: false,
    topJobs: topJobs.map((j) => cell(j.name, j.n, head.scored)),
    areas,
    traits,
    quality: q ?? { ok: 0, check: 0, invalid: 0 },
    demand: demand.map((d) => ({
      ...d,
      hidden: d.shortfall > 0 && d.shortfall < MIN_CELL,
      shortfall: d.shortfall > 0 && d.shortfall < MIN_CELL ? 0 : d.shortfall,
    })),
    evidenceCoverage: cov?.pct ?? 0,
  };
}
