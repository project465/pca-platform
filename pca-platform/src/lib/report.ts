import { query, queryOne } from "@/lib/db";

/**
 * 결과지.
 *
 * 화면은 mockups/02_student_report.html 을 따른다. 여기서는 그 화면이
 * 필요로 하는 값을 모아 온다 — 직무 적합도, 요구 역량과 보유 수준의 차이,
 * 그 차이를 메우는 과목.
 *
 * 채점은 아직 없다. scoring_weights 가 비어 있고 산식이 정해지지 않았으므로
 * job_fit_scores·competency_levels 에 행이 생기지 않는다. 그래서 이 화면은
 * "점수가 있으면 그리고, 없으면 왜 없는지 말하는" 껍데기다. 산식이 정해져
 * 행이 채워지면 고칠 것 없이 그대로 그려진다.
 */

export type JobFit = { id: string; name: string; score: number; rank: number };
export type CompGap = {
  id: string; name: string; kind: string;
  required: number; held: number;
};
export type Course = {
  id: string; name: string; code: string; credit: number | null;
  term: string | null; covers: string[];
};

export type ReportState =
  | { state: "not_submitted" }
  | { state: "not_scored" }
  | { state: "not_released" }
  | { state: "ready"; data: ReportData };

export type ReportData = {
  studentName: string;
  sessionName: string;
  submittedAt: string | null;
  majorName: string;
  jobs: JobFit[];
  top: JobFit | null;
  gaps: CompGap[];
  courses: Course[];
};

/** 사람이 읽는 이름은 translations 에 있다. 요청 언어가 없으면 ko 로 떨어진다 */
const NAME = (t: string) => `
  COALESCE(
    (SELECT value FROM translations
      WHERE table_name = '${t}' AND row_id = x.id AND field = 'name' AND lang = $LANG),
    (SELECT value FROM translations
      WHERE table_name = '${t}' AND row_id = x.id AND field = 'name' AND lang = 'ko')
  )`;

export async function reportFor(
  attemptId: string,
  userId: string,
  lang: string,
): Promise<ReportState> {
  const head = await queryOne<{
    status: string; submitted_at: string | null; released: boolean;
    student: string; session_name: string; major_id: string; org_id: string;
  }>(
    `SELECT a.status,
            to_char(a.submitted_at, 'YYYY.MM.DD') AS submitted_at,
            (s.released_at IS NOT NULL OR s.release_mode = 'instant') AS released,
            u.display_name AS student, s.name AS session_name,
            i.major_id::text AS major_id, s.org_id::text AS org_id
       FROM attempts a
       JOIN test_sessions s ON s.id = a.session_id
       JOIN instruments i ON i.id = s.instrument_id
       JOIN users u ON u.id = a.user_id
      WHERE a.id = $1 AND a.user_id = $2`,
    [attemptId, userId],
  );
  if (!head) return { state: "not_submitted" };
  if (head.status !== "submitted" && head.status !== "scored") return { state: "not_submitted" };

  const jobs = await query<{ id: string; name: string | null; score: string; rank: string }>(
    `SELECT x.id::text, ${NAME("job_clusters").replace("$LANG", "$2")} AS name,
            f.fit_score::text AS score, f.rank_no::text AS rank
       FROM job_fit_scores f JOIN job_clusters x ON x.id = f.job_id
      WHERE f.attempt_id = $1
      ORDER BY f.rank_no`,
    [attemptId, lang],
  );
  if (jobs.length === 0) return { state: "not_scored" };
  if (!head.released) return { state: "not_released" };

  const fits: JobFit[] = jobs.map((j) => ({
    id: j.id, name: j.name ?? "", score: Number(j.score), rank: Number(j.rank),
  }));
  const top = fits[0] ?? null;

  /* 1순위 직무가 요구하는 역량과, 이 학생이 가진 수준 */
  const gaps = top
    ? await query<{ id: string; name: string | null; kind: string; required: string; held: string | null }>(
        `SELECT x.id::text, ${NAME("competencies").replace("$LANG", "$3")} AS name,
                x.comp_type AS kind,
                m.required_level::text AS required,
                l.held_level::text AS held
           FROM job_competency_map m
           JOIN competencies x ON x.id = m.competency_id
           LEFT JOIN competency_levels l
             ON l.attempt_id = $1 AND l.competency_id = x.id
          WHERE m.job_id = $2
          ORDER BY (m.required_level - COALESCE(l.held_level, 0)) DESC, x.code`,
        [attemptId, top.id, lang],
      )
    : [];

  /* 부족한 역량을 다루는, 이 대학에 실제로 개설된 과목 */
  const shortIds = gaps
    .filter((g) => Number(g.required) > Number(g.held ?? 0))
    .map((g) => g.id);

  const courses = shortIds.length
    ? await query<{ id: string; name: string | null; code: string; credit: number | null; term: string | null; covers: string[] }>(
        `SELECT x.id::text, ${NAME("courses").replace("$LANG", "$4")} AS name,
                x.course_code AS code, x.credit, x.term_hint AS term,
                array_agg(DISTINCT COALESCE(
                  (SELECT value FROM translations
                    WHERE table_name = 'competencies' AND row_id = cm.competency_id
                      AND field = 'name' AND lang = $4),
                  (SELECT value FROM translations
                    WHERE table_name = 'competencies' AND row_id = cm.competency_id
                      AND field = 'name' AND lang = 'ko')
                )) AS covers
           FROM courses x
           JOIN course_competency_map cm ON cm.course_id = x.id
          WHERE x.org_id = $1 AND x.major_id = $2 AND x.is_offered
            AND cm.competency_id = ANY($3::bigint[])
          GROUP BY x.id
          ORDER BY count(cm.competency_id) DESC, x.course_code`,
        [head.org_id, head.major_id, shortIds, lang],
      )
    : [];

  const majorName = await queryOne<{ name: string | null }>(
    `SELECT COALESCE(
       (SELECT value FROM translations WHERE table_name='majors' AND row_id=$1 AND field='name' AND lang=$2),
       (SELECT value FROM translations WHERE table_name='majors' AND row_id=$1 AND field='name' AND lang='ko')
     ) AS name`,
    [head.major_id, lang],
  );

  return {
    state: "ready",
    data: {
      studentName: head.student,
      sessionName: head.session_name,
      submittedAt: head.submitted_at,
      majorName: majorName?.name ?? "",
      jobs: fits,
      top,
      gaps: gaps.map((g) => ({
        id: g.id, name: g.name ?? "", kind: g.kind,
        required: Number(g.required), held: Number(g.held ?? 0),
      })),
      courses: courses.map((c) => ({
        id: c.id, name: c.name ?? "", code: c.code, credit: c.credit,
        term: c.term, covers: c.covers.filter(Boolean),
      })),
    },
  };
}

/** 역량 이름 옆에 붙는 분류 표시 */
export const KIND_LABEL: Record<string, string> = {
  software: "소프트웨어",
  theory: "이론",
  tool: "도구",
  soft_skill: "역량",
};
