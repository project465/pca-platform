import { query, queryOne } from "@/lib/db";
import { namesOf } from "@/lib/i18n";

export type GroupHeader = {
  session_id: string;
  name: string;
  org_id: string;
  parent_org_id: string | null;
  opens_at: string;
  closes_at: string;
  release_mode: string;
  released_at: string | null;
  roster: number;
  submitted: number;
  scored: number;
  not_taken: number;
  free_seats: number;
};

export async function groupHeader(sessionId: string): Promise<GroupHeader | null> {
  return queryOne<GroupHeader>(
    `SELECT ts.id AS session_id, ts.name, ts.org_id, o.parent_id AS parent_org_id,
            ts.opens_at::text, ts.closes_at::text, ts.release_mode, ts.released_at::text,
            (SELECT count(*) FROM attempts a WHERE a.session_id = ts.id)::int AS roster,
            (SELECT count(*) FROM attempts a
              WHERE a.session_id = ts.id AND a.status IN ('submitted','scored'))::int AS submitted,
            (SELECT count(*) FROM attempts a
              WHERE a.session_id = ts.id AND a.status = 'scored')::int AS scored,
            (SELECT count(*) FROM attempts a
              WHERE a.session_id = ts.id AND a.status IN ('ready','in_progress'))::int AS not_taken,
            (SELECT count(*) FROM seats s
              WHERE s.contract_id = ts.contract_id AND s.user_id IS NULL)::int AS free_seats
       FROM test_sessions ts
       JOIN organizations o ON o.id = ts.org_id
      WHERE ts.id = $1`,
    [sessionId],
  );
}

export type TopJob = { job_id: string; name: string; count: number; avg: string };

export async function topJobSpread(sessionId: string, lang: string): Promise<TopJob[]> {
  const rows = await query<Omit<TopJob, "name">>(
    `SELECT f.job_id, count(*)::int AS count, to_char(avg(f.fit_score), 'FM990.0') AS avg
       FROM job_fit_scores f
       JOIN attempts a ON a.id = f.attempt_id
      WHERE a.session_id = $1 AND a.status = 'scored' AND f.rank_no = 1
      GROUP BY f.job_id
      ORDER BY count DESC, avg DESC`,
    [sessionId],
  );
  const names = await namesOf("job_clusters", rows.map((r) => r.job_id), lang);
  return rows.map((r) => ({ ...r, name: names.get(r.job_id) ?? r.job_id }));
}

export type CompetencyFill = {
  competency_id: string;
  name: string;
  type_label: string;
  asked: number;
  met: number;
  pct: number;
};

const TYPE_LABEL: Record<string, string> = {
  software: "소프트웨어",
  theory: "이론",
  tool: "도구",
  soft_skill: "소프트스킬",
};

/** 학생마다 자기 1순위 직무가 요구하는 역량을 채웠는지 세어, 역량별 충족률로 묶는다. */
export async function competencyFill(
  sessionId: string,
  lang: string,
): Promise<CompetencyFill[]> {
  const rows = await query<{
    competency_id: string;
    comp_type: string;
    asked: number;
    met: number;
  }>(
    `WITH top AS (
       SELECT a.id AS attempt_id, f.job_id
         FROM attempts a
         JOIN job_fit_scores f ON f.attempt_id = a.id AND f.rank_no = 1
        WHERE a.session_id = $1 AND a.status = 'scored'
     ), req AS (
       SELECT t.attempt_id, m.competency_id, m.required_level,
              COALESCE(l.held_level, 0) AS held
         FROM top t
         JOIN job_competency_map m ON m.job_id = t.job_id
         LEFT JOIN competency_levels l
                ON l.attempt_id = t.attempt_id AND l.competency_id = m.competency_id
     )
     SELECT r.competency_id, c.comp_type,
            count(*)::int AS asked,
            count(*) FILTER (WHERE r.held >= r.required_level)::int AS met
       FROM req r JOIN competencies c ON c.id = r.competency_id
      GROUP BY r.competency_id, c.comp_type
      ORDER BY (count(*) FILTER (WHERE r.held >= r.required_level))::numeric / count(*), c.comp_type`,
    [sessionId],
  );
  const names = await namesOf("competencies", rows.map((r) => r.competency_id), lang);
  return rows.map((r) => ({
    competency_id: r.competency_id,
    name: names.get(r.competency_id) ?? r.competency_id,
    type_label: TYPE_LABEL[r.comp_type] ?? r.comp_type,
    asked: r.asked,
    met: r.met,
    pct: r.asked === 0 ? 0 : Math.round((r.met / r.asked) * 100),
  }));
}

export type CourseNeed = {
  course_id: string;
  name: string;
  course_code: string;
  credit: number | null;
  term_hint: string | null;
  is_offered: boolean;
  need: number;
  fills: string[];
};

/** 부족한 역량을 메우는 과목을 필요 인원 순으로. 미개설 과목도 후보에 남긴다. */
export async function courseNeeds(
  sessionId: string,
  orgIds: string[],
  lang: string,
  limit = 5,
): Promise<CourseNeed[]> {
  const rows = await query<{
    course_id: string;
    course_code: string;
    credit: number | null;
    term_hint: string | null;
    is_offered: boolean;
    need: number;
    competency_ids: string[];
  }>(
    `WITH top AS (
       SELECT a.id AS attempt_id, f.job_id
         FROM attempts a
         JOIN job_fit_scores f ON f.attempt_id = a.id AND f.rank_no = 1
        WHERE a.session_id = $1 AND a.status = 'scored'
     ), short AS (
       SELECT t.attempt_id, m.competency_id
         FROM top t
         JOIN job_competency_map m ON m.job_id = t.job_id
         LEFT JOIN competency_levels l
                ON l.attempt_id = t.attempt_id AND l.competency_id = m.competency_id
        WHERE m.required_level > COALESCE(l.held_level, 0)
     )
     SELECT c.id AS course_id, c.course_code, c.credit, c.term_hint, c.is_offered,
            count(DISTINCT s.attempt_id)::int AS need,
            array_agg(DISTINCT ccm.competency_id::text) AS competency_ids
       FROM short s
       JOIN course_competency_map ccm ON ccm.competency_id = s.competency_id
       JOIN courses c ON c.id = ccm.course_id
      WHERE c.org_id = ANY($2::bigint[])
      GROUP BY c.id
      ORDER BY need DESC, c.course_code
      LIMIT $3`,
    [sessionId, orgIds, limit],
  );

  const [courseNames, compNames] = await Promise.all([
    namesOf("courses", rows.map((r) => r.course_id), lang),
    namesOf("competencies", rows.flatMap((r) => r.competency_ids), lang),
  ]);

  return rows.map((r) => ({
    course_id: r.course_id,
    name: courseNames.get(r.course_id) ?? r.course_code,
    course_code: r.course_code,
    credit: r.credit,
    term_hint: r.term_hint,
    is_offered: r.is_offered,
    need: r.need,
    fills: r.competency_ids.map((id) => compNames.get(id) ?? id),
  }));
}
