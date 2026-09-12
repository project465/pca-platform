import { query, queryOne } from "@/lib/db";
import { namesOf } from "@/lib/i18n";

/**
 * 학생 결과지에 들어가는 데이터.
 *
 * 화면은 `mockups/02_student_report.html` 이 확정 시안이다. 여기서는 그 시안이
 * 그리는 세 덩어리 — 직무 적합도 / 역량 갭 / 들을 과목 — 을 DB 에서 읽어온다.
 *
 * 채점 산식은 아직 정해지지 않았다 (CLAUDE.md). 이 파일은 산식을 계산하지 않고
 * 이미 저장된 점수(job_fit_scores, competency_levels)를 읽기만 한다.
 * 그래서 산식이 정해져도 이 파일은 바뀌지 않는다.
 */

export type AttemptHeader = {
  attempt_id: string;
  status: string;
  user_id: string;
  display_name: string;
  org_id: string;
  parent_org_id: string | null;
  session_id: string;
  session_name: string;
  released_at: string | null;
  release_mode: string;
  submitted_at: string | null;
  scored_at: string | null;
  major_id: string;
};

export async function attemptHeader(attemptId: string): Promise<AttemptHeader | null> {
  return queryOne<AttemptHeader>(
    `SELECT a.id AS attempt_id, a.status, a.user_id, u.display_name,
            ts.org_id, o.parent_id AS parent_org_id,
            ts.id AS session_id, ts.name AS session_name,
            ts.released_at::text, ts.release_mode,
            a.submitted_at::text, a.scored_at::text,
            i.major_id
       FROM attempts a
       JOIN users u          ON u.id = a.user_id
       JOIN test_sessions ts ON ts.id = a.session_id
       JOIN organizations o  ON o.id = ts.org_id
       JOIN instruments i    ON i.id = ts.instrument_id
      WHERE a.id = $1`,
    [attemptId],
  );
}

/** 결과가 학생에게 공개됐는가. 담당자 승인(released_at) 전에는 학생이 볼 수 없다. */
export function isReleased(h: AttemptHeader): boolean {
  if (h.status !== "scored") return false;
  return h.release_mode === "instant" || h.released_at !== null;
}

export type JobFit = {
  job_id: string;
  code: string;
  fit_score: string;
  rank_no: number;
  name: string;
  /** 이 직무 영역에 지금 신청할 수 있는 현직자 수 */
  mentor_count: number;
};

/**
 * 직무 적합도. 시안의 게이지 목록이 이 배열을 그대로 그린다.
 * 멘토 수를 같이 세는 이유는, 결과지에서 바로 현직자에게 갈 수 있어야 하기 때문이다.
 * 멘토가 없는 직무에 "현직자 보기"를 띄우면 빈 화면으로 보내게 된다.
 */
export async function jobFits(attemptId: string, lang: string): Promise<JobFit[]> {
  const rows = await query<Omit<JobFit, "name">>(
    `SELECT f.job_id, j.code, f.fit_score::text, f.rank_no,
            (SELECT count(*)
               FROM mentor_job_clusters mjc
               JOIN mentors m ON m.id = mjc.mentor_id AND m.status = 'active'
              WHERE mjc.job_id = f.job_id
                AND EXISTS (SELECT 1 FROM mentor_slots s
                             WHERE s.mentor_id = m.id AND s.status = 'open'
                               AND s.starts_at > now() + interval '1 hour')
            )::int AS mentor_count
       FROM job_fit_scores f
       JOIN job_clusters j ON j.id = f.job_id
      WHERE f.attempt_id = $1
      ORDER BY f.rank_no`,
    [attemptId],
  );

  const names = await namesOf("job_clusters", rows.map((r) => r.job_id), lang);
  return rows.map((r) => ({ ...r, name: names.get(r.job_id) ?? r.code }));
}

export type CompetencyGap = {
  competency_id: string;
  code: string;
  comp_type: string;
  required_level: number;
  held_level: number;
  name: string;
  type_label: string;
};

const TYPE_LABEL: Record<string, string> = {
  software: "소프트웨어",
  theory: "이론",
  tool: "도구",
  soft_skill: "소프트스킬",
};

/**
 * 1순위 직무가 요구하는 역량과 학생의 보유 수준.
 * 시안의 빗금(부족분) = required_level - held_level 이다.
 */
export async function competencyGaps(
  attemptId: string,
  jobId: string,
  lang: string,
): Promise<CompetencyGap[]> {
  const rows = await query<Omit<CompetencyGap, "name" | "type_label">>(
    `SELECT m.competency_id, c.code, c.comp_type, m.required_level,
            COALESCE(l.held_level, 0) AS held_level
       FROM job_competency_map m
       JOIN competencies c ON c.id = m.competency_id
       LEFT JOIN competency_levels l
              ON l.competency_id = m.competency_id AND l.attempt_id = $1
      WHERE m.job_id = $2
      ORDER BY (m.required_level - COALESCE(l.held_level, 0)) DESC, c.code`,
    [attemptId, jobId],
  );

  const names = await namesOf("competencies", rows.map((r) => r.competency_id), lang);
  return rows.map((r) => ({
    ...r,
    name: names.get(r.competency_id) ?? r.code,
    type_label: TYPE_LABEL[r.comp_type] ?? r.comp_type,
  }));
}

export type CourseRx = {
  course_id: string;
  course_code: string;
  credit: number | null;
  term_hint: string | null;
  name: string;
  /** 이 과목이 메워주는 부족 역량 이름들 */
  fills: string[];
};

/**
 * 들을 과목. 부족한 역량을 많이 메우는 순서로 고른다.
 * 과목은 대학(organizations)에 달려 있으므로 학과와 그 상위 대학 둘 다 본다.
 */
export async function courseRx(
  attemptId: string,
  jobId: string,
  orgIds: string[],
  lang: string,
  limit = 3,
): Promise<CourseRx[]> {
  const rows = await query<{
    course_id: string;
    course_code: string;
    credit: number | null;
    term_hint: string | null;
    competency_ids: string[];
  }>(
    `WITH short AS (
       SELECT m.competency_id
         FROM job_competency_map m
         LEFT JOIN competency_levels l
                ON l.competency_id = m.competency_id AND l.attempt_id = $1
        WHERE m.job_id = $2
          AND m.required_level > COALESCE(l.held_level, 0)
     )
     SELECT c.id AS course_id, c.course_code, c.credit, c.term_hint,
            array_agg(ccm.competency_id::text ORDER BY ccm.competency_id) AS competency_ids
       FROM courses c
       JOIN course_competency_map ccm ON ccm.course_id = c.id
       JOIN short s ON s.competency_id = ccm.competency_id
      WHERE c.org_id = ANY($3::bigint[]) AND c.is_offered
      GROUP BY c.id
      ORDER BY count(*) DESC, c.course_code
      LIMIT $4`,
    [attemptId, jobId, orgIds, limit],
  );

  const allIds = rows.flatMap((r) => r.competency_ids);
  const courseNames = await namesOf("courses", rows.map((r) => r.course_id), lang);
  const compNames = await namesOf("competencies", allIds, lang);

  return rows.map((r) => ({
    course_id: r.course_id,
    course_code: r.course_code,
    credit: r.credit,
    term_hint: r.term_hint,
    name: courseNames.get(r.course_id) ?? r.course_code,
    fills: r.competency_ids.map((id) => compNames.get(id) ?? id),
  }));
}

/** 학생 홈에 띄우는 목록. 공개된 결과지와 아직 응시하지 않은 회차를 한 번에 읽는다. */
export type MyAttempt = {
  attempt_id: string;
  status: string;
  session_name: string;
  opens_at: string;
  closes_at: string;
  released: boolean;
  top_job_id: string | null;
  top_job_name: string | null;
  top_score: string | null;
};

export async function myAttempts(userId: string, lang: string): Promise<MyAttempt[]> {
  const rows = await query<Omit<MyAttempt, "top_job_name">>(
    `SELECT a.id AS attempt_id, a.status, ts.name AS session_name,
            ts.opens_at::text, ts.closes_at::text,
            (a.status = 'scored'
              AND (ts.release_mode = 'instant' OR ts.released_at IS NOT NULL)) AS released,
            f.job_id AS top_job_id, f.fit_score::text AS top_score
       FROM attempts a
       JOIN test_sessions ts ON ts.id = a.session_id
       LEFT JOIN job_fit_scores f ON f.attempt_id = a.id AND f.rank_no = 1
      WHERE a.user_id = $1
      ORDER BY ts.opens_at DESC`,
    [userId],
  );

  const names = await namesOf(
    "job_clusters",
    rows.map((r) => r.top_job_id).filter((v): v is string => v !== null),
    lang,
  );
  return rows.map((r) => ({
    ...r,
    top_job_name: r.top_job_id ? (names.get(r.top_job_id) ?? null) : null,
  }));
}
