/**
 * 결과지 데이터.
 *
 * 이 파일은 숫자를 만들지 않는다. scoring.ts 가 이미 써 둔 점수를 읽어
 * 사람이 읽을 이름을 붙여 올 뿐이다. 화면에 보이는 82점과 DB 의 82점은
 * 반드시 같은 값이어야 한다 — 그래야 학과 담당자가 다시 계산해 볼 수 있다.
 *
 * 흥미와 실력을 섞지 않는다. 250문항이 재는 것은 "무엇을 하고 싶은가" 이고,
 * 역량 보유 수준은 증거(과목·자격·프로젝트)에서만 나온다. 증거가 없으면
 * 없다고 쓴다. 채워 넣지 않는다.
 */
import { query, queryOne } from "./db";

export type Named = { code: string; name: string; scaled: number };

export type ReportJob = {
  code: string;
  name: string;
  fit: number;
  a: number;
  p: number;
  band: [number, number];
  rank: number;
  areaName: string | null;
};

export type GapRow = {
  code: string;
  name: string;
  required: number;
  held: number | null;
  criticality: number;
};

export type Report = {
  attemptId: string;
  learner: { name: string; majorName: string | null; submittedAt: string | null };
  areas: Named[];
  traits: Named[];
  axes: Named[];
  jobs: ReportJob[];
  gaps: GapRow[];
  evidenceCount: number;
  quality: {
    bandWidth: number;
    flag: string;
    straightRun: number;
    fastRatio: number;
    attentionPass: number;
    attentionTotal: number;
  };
};

/**
 * translations 에서 이름을 끌어오는 조각.
 *
 * 요청한 언어 → 영어 → 한국어 → 코드 순으로 떨어진다. 이 사다리가 없으면
 * 튀르키예어 결과지에 "ME.AEROSPACE" 같은 코드가 그대로 찍힌다 — 번역이
 * 덜 된 것보다 코드가 보이는 쪽이 훨씬 나쁘다.
 */
const NAME = (t: string, alias: string) =>
  `COALESCE(
     (SELECT value FROM translations
       WHERE table_name = '${t}' AND row_id = ${alias}.id AND lang = $2 AND field = 'name'),
     (SELECT value FROM translations
       WHERE table_name = '${t}' AND row_id = ${alias}.id AND lang = 'en' AND field = 'name'),
     (SELECT value FROM translations
       WHERE table_name = '${t}' AND row_id = ${alias}.id AND lang = 'ko' AND field = 'name'),
     ${alias}.code)`;

/** 공개 승인 전이면 "pending". 없는 응시면 null. */
export async function buildReport(
  attemptId: string,
  userId: string,
  lang = "ko",
): Promise<Report | "pending" | null> {
  const head = await queryOne<{
    name: string;
    major_name: string | null;
    submitted_at: string | null;
    status: string;
    released: boolean;
  }>(
    `SELECT u.display_name AS name,
            COALESCE(
              (SELECT value FROM translations
                WHERE table_name = 'majors' AND row_id = m.id AND lang = $3 AND field = 'name'),
              (SELECT value FROM translations
                WHERE table_name = 'majors' AND row_id = m.id AND lang = 'en' AND field = 'name'),
              (SELECT value FROM translations
                WHERE table_name = 'majors' AND row_id = m.id AND lang = 'ko' AND field = 'name'),
              m.code) AS major_name,
            a.submitted_at, a.status,
            -- 학과 회차는 담당자가 공개를 승인해야 학생에게 보인다.
            -- instant 회차와 개인 결제(solo)는 승인 없이 바로 열린다.
            (ts.release_mode = 'instant' OR ts.released_at IS NOT NULL) AS released
       FROM attempts a
       JOIN users u ON u.id = a.user_id
       JOIN test_sessions ts ON ts.id = a.session_id
       JOIN instruments i ON i.id = ts.instrument_id
       LEFT JOIN majors m ON m.id = i.major_id
      WHERE a.id = $1 AND a.user_id = $2`,
    [attemptId, userId, lang],
  );
  if (!head || head.status !== "scored") return null;
  // 채점이 끝났어도 공개 전이면 학생에게 주지 않는다. 학과가 먼저 본다.
  if (!head.released) return "pending";

  const areas = await query<Named>(
    `SELECT s.area_code AS code, ${NAME("job_areas", "ja")} AS name, s.scaled_score::float AS scaled
       FROM area_scores s JOIN job_areas ja ON ja.code = s.area_code
      WHERE s.attempt_id = $1 ORDER BY s.rank_no`,
    [attemptId, lang],
  );

  const indicators = await query<Named & { kind: string }>(
    `SELECT ax.code, ${NAME("indicator_axes", "ax")} AS name,
            s.scaled_score::float AS scaled, ax.kind
       FROM indicator_scores s
       JOIN indicators i  ON i.id = s.indicator_id
       JOIN indicator_axes ax ON ax.code = i.axis_code
      WHERE s.attempt_id = $1
      ORDER BY ax.sort_no, ax.code`,
    [attemptId, lang],
  );
  const traits = indicators.filter((i) => i.kind === "trait");
  const axes = indicators.filter((i) => i.kind === "activity");

  const jobs = await query<ReportJob>(
    `SELECT jc.code, ${NAME("job_clusters", "jc")} AS name,
            f.fit_score::float AS fit, f.a_score::float AS a, f.p_score::float AS p,
            ARRAY[f.band_low::float, f.band_high::float] AS band,
            f.rank_no AS rank,
            (SELECT ${NAME("job_areas", "ja")} FROM job_cluster_areas jca
               JOIN job_areas ja ON ja.code = jca.area_code
              WHERE jca.job_id = jc.id ORDER BY jca.share DESC LIMIT 1) AS "areaName"
       FROM job_fit_scores f JOIN job_clusters jc ON jc.id = f.job_id
      WHERE f.attempt_id = $1 ORDER BY f.rank_no`,
    [attemptId, lang],
  );

  // 1순위 직무가 요구하는 역량. 보유 수준은 증거에서만 온다 — 없으면 null.
  const gaps = jobs.length
    ? await query<GapRow>(
        `SELECT c.code, ${NAME("competencies", "c")} AS name,
                m.required_level AS required, m.criticality,
                (SELECT l.held_level FROM learner_competency_levels l
                  WHERE l.user_id = $1 AND l.competency_id = c.id) AS held
           FROM job_competency_map m
           JOIN competencies c ON c.id = m.competency_id
           JOIN job_clusters jc ON jc.id = m.job_id
          WHERE jc.code = $3
          -- 증거 화면과 같은 순서여야 한다. 동점일 때 코드로 고정하지 않으면
          -- 두 화면의 1행이 서로 다른 역량을 가리킨다.
          ORDER BY m.criticality DESC, m.required_level DESC, c.code
          LIMIT 12`,
        // NAME() 이 언어를 $2 로 읽으므로 자리를 맞춘다.
        [userId, lang, jobs[0].code],
      )
    : [];

  const ev = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM learner_evidence WHERE user_id = $1`,
    [userId],
  );

  const q = await queryOne<{
    band_width: string;
    flag: string;
    straightline_run: number;
    fast_ratio: string;
    attention_pass: number;
    attention_total: number;
  }>(`SELECT * FROM attempt_quality WHERE attempt_id = $1`, [attemptId]);

  return {
    attemptId,
    learner: { name: head.name, majorName: head.major_name, submittedAt: head.submitted_at },
    areas,
    traits: traits.map(({ code, name, scaled }) => ({ code, name, scaled })),
    axes: axes.map(({ code, name, scaled }) => ({ code, name, scaled })),
    jobs,
    gaps,
    evidenceCount: ev?.n ?? 0,
    quality: {
      bandWidth: Number(q?.band_width ?? 12),
      flag: q?.flag ?? "ok",
      straightRun: q?.straightline_run ?? 0,
      fastRatio: Number(q?.fast_ratio ?? 0),
      attentionPass: q?.attention_pass ?? 0,
      attentionTotal: q?.attention_total ?? 0,
    },
  };
}
