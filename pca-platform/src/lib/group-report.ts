import { query, queryOne } from "@/lib/db";

/**
 * 단체 리포트.
 *
 * 화면은 mockups/03_group_report.html 을 따른다. 학과 담당자가 보는 것이고,
 * 개인 결과지와 목적이 다르다 — 한 사람이 어디로 갈지가 아니라, 학과가
 * 무엇을 손봐야 하는지를 본다.
 *
 * 개인을 짚지 않는다. 집계만 보여주므로 누가 무엇이 부족한지는 드러나지
 * 않는다. 담당자에게도 개인 결과를 열어 줄 이유가 없다.
 *
 * 채점이 없으면 대부분의 절이 비는데, 그 사실을 감추지 않고 그대로 말한다.
 */

export type JobShare = { id: string; name: string; count: number; avg: number };
export type CompRate = { id: string; name: string; kind: string; met: number; total: number };
export type CourseNeed = {
  id: string; name: string; code: string; offered: boolean; need: number;
};

export type GroupReport = {
  sessionName: string;
  orgName: string;
  releasedAt: string | null;
  closesAt: string;
  enrolled: number;      // 이 기관에 등록된 학생
  started: number;       // 응시를 시작한 사람
  submitted: number;     // 제출한 사람
  seatsLeft: number;     // 남은 응시권
  scored: number;        // 채점된 응시
  jobs: JobShare[];
  comps: CompRate[];
  courses: CourseNeed[];
};

/** 담당자의 기관인지 확인하고 집계한다. 남의 회차는 null 이다 */
export async function groupReportFor(
  sessionId: string,
  orgIds: string[],
  lang: string,
): Promise<GroupReport | null> {
  if (orgIds.length === 0) return null;

  const head = await queryOne<{
    name: string; org_id: string; org_name: string | null; released_at: string | null;
    closes_at: string; major_id: string; contract_id: string;
  }>(
    `SELECT s.name, s.org_id::text AS org_id,
            COALESCE(
              (SELECT value FROM translations WHERE table_name='organizations'
                AND row_id=s.org_id AND field='name' AND lang=$3),
              (SELECT value FROM translations WHERE table_name='organizations'
                AND row_id=s.org_id AND field='name' AND lang='ko')
            ) AS org_name,
            to_char(s.released_at, 'YYYY.MM.DD') AS released_at,
            to_char(s.closes_at, 'YYYY.MM.DD') AS closes_at,
            i.major_id::text AS major_id, s.contract_id::text AS contract_id
       FROM test_sessions s
       JOIN instruments i ON i.id = s.instrument_id
      WHERE s.id = $1 AND s.org_id = ANY($2::bigint[])`,
    [sessionId, orgIds, lang],
  );
  if (!head) return null;

  const counts = await queryOne<{
    enrolled: string; started: string; submitted: string; scored: string; seats_left: string;
  }>(
    `SELECT
       (SELECT count(*) FROM memberships m
         WHERE m.org_id = $2 AND m.role = 'student')::text AS enrolled,
       (SELECT count(*) FROM attempts a WHERE a.session_id = $1)::text AS started,
       (SELECT count(*) FROM attempts a
         WHERE a.session_id = $1 AND a.status IN ('submitted','scored'))::text AS submitted,
       (SELECT count(*) FROM attempts a
         WHERE a.session_id = $1 AND a.status = 'scored')::text AS scored,
       (SELECT count(*) FROM seats s
         WHERE s.contract_id = $3 AND s.consumed_at IS NULL)::text AS seats_left`,
    [sessionId, head.org_id, head.contract_id],
  );

  /* 최적합 직무(1순위)로 학생을 나눈다 */
  const jobs = await query<{ id: string; name: string | null; n: string; avg: string }>(
    `SELECT j.id::text,
            COALESCE(
              (SELECT value FROM translations WHERE table_name='job_clusters'
                AND row_id=j.id AND field='name' AND lang=$2),
              (SELECT value FROM translations WHERE table_name='job_clusters'
                AND row_id=j.id AND field='name' AND lang='ko')
            ) AS name,
            count(*)::text AS n,
            round(avg(f.fit_score))::text AS avg
       FROM attempts a
       JOIN job_fit_scores f ON f.attempt_id = a.id AND f.rank_no = 1
       JOIN job_clusters j ON j.id = f.job_id
      WHERE a.session_id = $1 AND a.status IN ('submitted','scored')
      GROUP BY j.id
      ORDER BY count(*) DESC, j.id`,
    [sessionId, lang],
  );

  /* 각 학생이 자기 최적합 직무의 요구 수준을 채웠는지 세어 충족률을 낸다 */
  const comps = await query<{ id: string; name: string | null; kind: string; met: string; total: string }>(
    `WITH top AS (
       SELECT a.id AS attempt_id, f.job_id
         FROM attempts a
         JOIN job_fit_scores f ON f.attempt_id = a.id AND f.rank_no = 1
        WHERE a.session_id = $1 AND a.status IN ('submitted','scored')
     )
     SELECT c.id::text,
            COALESCE(
              (SELECT value FROM translations WHERE table_name='competencies'
                AND row_id=c.id AND field='name' AND lang=$2),
              (SELECT value FROM translations WHERE table_name='competencies'
                AND row_id=c.id AND field='name' AND lang='ko')
            ) AS name,
            c.comp_type AS kind,
            count(*) FILTER (WHERE COALESCE(l.held_level, 0) >= m.required_level)::text AS met,
            count(*)::text AS total
       FROM top t
       JOIN job_competency_map m ON m.job_id = t.job_id
       JOIN competencies c ON c.id = m.competency_id
       LEFT JOIN competency_levels l
         ON l.attempt_id = t.attempt_id AND l.competency_id = c.id
      GROUP BY c.id
      ORDER BY (count(*) FILTER (WHERE COALESCE(l.held_level,0) >= m.required_level))::numeric
               / NULLIF(count(*), 0), c.code`,
    [sessionId, lang],
  );

  /* 비어 있는 역량을 메우는 과목과, 그 과목이 필요한 사람 수 */
  const courses = await query<{
    id: string; name: string | null; code: string; offered: boolean; need: string;
  }>(
    `WITH top AS (
       SELECT a.id AS attempt_id, f.job_id
         FROM attempts a
         JOIN job_fit_scores f ON f.attempt_id = a.id AND f.rank_no = 1
        WHERE a.session_id = $1 AND a.status IN ('submitted','scored')
     ),
     short AS (
       SELECT t.attempt_id, m.competency_id
         FROM top t
         JOIN job_competency_map m ON m.job_id = t.job_id
         LEFT JOIN competency_levels l
           ON l.attempt_id = t.attempt_id AND l.competency_id = m.competency_id
        WHERE COALESCE(l.held_level, 0) < m.required_level
     )
     SELECT co.id::text,
            COALESCE(
              (SELECT value FROM translations WHERE table_name='courses'
                AND row_id=co.id AND field='name' AND lang=$4),
              (SELECT value FROM translations WHERE table_name='courses'
                AND row_id=co.id AND field='name' AND lang='ko')
            ) AS name,
            co.course_code AS code, co.is_offered AS offered,
            count(DISTINCT s.attempt_id)::text AS need
       FROM short s
       JOIN course_competency_map cm ON cm.competency_id = s.competency_id
       JOIN courses co ON co.id = cm.course_id
      WHERE co.org_id = $2 AND co.major_id = $3
      GROUP BY co.id
      ORDER BY count(DISTINCT s.attempt_id) DESC, co.course_code`,
    [sessionId, head.org_id, head.major_id, lang],
  );

  return {
    sessionName: head.name,
    orgName: head.org_name ?? "",
    releasedAt: head.released_at,
    closesAt: head.closes_at,
    enrolled: Number(counts?.enrolled ?? 0),
    started: Number(counts?.started ?? 0),
    submitted: Number(counts?.submitted ?? 0),
    scored: Number(counts?.scored ?? 0),
    seatsLeft: Number(counts?.seats_left ?? 0),
    jobs: jobs.map((j) => ({
      id: j.id, name: j.name ?? "", count: Number(j.n), avg: Number(j.avg),
    })),
    comps: comps.map((c) => ({
      id: c.id, name: c.name ?? "", kind: c.kind, met: Number(c.met), total: Number(c.total),
    })),
    courses: courses.map((c) => ({
      id: c.id, name: c.name ?? "", code: c.code, offered: c.offered, need: Number(c.need),
    })),
  };
}
