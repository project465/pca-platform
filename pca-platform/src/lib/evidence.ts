/**
 * 증거 → 보유 레벨.
 *
 * 학생에게 "ANSYS 몇 레벨입니까" 를 묻지 않는다. 물으면 전부 3이라고 답한다.
 * 대신 들은 과목, 딴 자격증, 끝낸 프로젝트를 받아서 계산한다.
 *
 *   증거 한 줄 = 출처 배점 × 성적계수 × 출처 신뢰도
 *   역량 점수  = 그 줄들의 합 (상한 6.0)
 *   보유 레벨  = 사다리(level_ladder)로 변환
 *
 * 배점·신뢰도·성적계수·사다리가 전부 테이블에 있다. 학교마다 성적 체계가
 * 다르고 사다리는 검증 뒤에 반드시 조정되므로, 배포 없이 바꿀 수 있어야 한다.
 */
import { query, queryOne, tx } from "./db";
import { takesGrade } from "./evidence-shared";

export type EvidenceSource = {
  code: string;
  maxPoint: number;
  reliability: number;
  needsProof: boolean;
};

export type EvidenceRow = {
  id: string;
  competencyId: string;
  competencyName: string;
  sourceCode: string;
  refLabel: string | null;
  grade: string | null;
  rawPoint: number;
  verified: boolean;
  createdAt: string;
};

export type CompetencyRow = {
  id: string;
  code: string;
  name: string;
  layer: string | null;
  heldLevel: number | null;
  heldRaw: number | null;
  /** 1순위 직무가 이 역량에 요구하는 수준. 요구하지 않으면 null */
  required: number | null;
  criticality: number | null;
  evidenceCount: number;
};

export { takesGrade } from "./evidence-shared";

export async function evidenceSources(): Promise<EvidenceSource[]> {
  const rows = await query<{
    code: string;
    max_point: string;
    reliability: string;
    needs_proof: boolean;
  }>(`SELECT code, max_point, reliability, needs_proof FROM evidence_sources
       -- 배점 순으로 늘어놓으면 자격증이 맨 위에 와 기본값이 된다. 학생이 가장
       -- 먼저 넣을 수 있는 것은 이번 학기에 들은 과목이므로 그것을 앞에 둔다.
       ORDER BY array_position(
         ARRAY['COURSE','PROJECT','CERT','INTERN','NCS_UNIT','AWARD','SOFTWARE','SELF'], code),
         code`);
  return rows.map((r) => ({
    code: r.code,
    maxPoint: Number(r.max_point),
    reliability: Number(r.reliability),
    needsProof: r.needs_proof,
  }));
}

export async function grades(): Promise<{ grade: string; coefficient: number }[]> {
  const rows = await query<{ grade: string; coefficient: string }>(
    `SELECT grade, coefficient FROM grade_points ORDER BY sort_no`,
  );
  return rows.map((r) => ({ grade: r.grade, coefficient: Number(r.coefficient) }));
}

const NAME = (t: string, alias: string, langParam: string) =>
  `COALESCE(
     (SELECT value FROM translations WHERE table_name = '${t}' AND row_id = ${alias}.id
       AND lang = ${langParam} AND field = 'name'),
     (SELECT value FROM translations WHERE table_name = '${t}' AND row_id = ${alias}.id
       AND lang = 'en' AND field = 'name'),
     (SELECT value FROM translations WHERE table_name = '${t}' AND row_id = ${alias}.id
       AND lang = 'ko' AND field = 'name'),
     ${alias}.code)`;

/**
 * 이 학생에게 보여줄 역량 목록.
 *
 * 전공 역량 + 전공을 가리지 않는 공통 역량(major_id IS NULL)을 합친다.
 * 1순위 직무가 요구하는 것이 위로 오고, 그 다음이 요구 수준 순이다 —
 * 49개를 알파벳순으로 늘어놓으면 학생은 어디부터 채울지 모른다.
 */
export async function competencies(userId: string, lang = "ko"): Promise<CompetencyRow[]> {
  const topJob = await queryOne<{ code: string }>(
    `SELECT jc.code
       FROM job_fit_scores f
       JOIN job_clusters jc ON jc.id = f.job_id
       JOIN attempts a ON a.id = f.attempt_id
      WHERE a.user_id = $1 AND f.rank_no = 1
      ORDER BY a.scored_at DESC NULLS LAST LIMIT 1`,
    [userId],
  );

  return query<CompetencyRow>(
    `SELECT c.id, c.code, ${NAME("competencies", "c", "$2")} AS name, c.layer,
            l.held_level AS "heldLevel", l.held_raw::float AS "heldRaw",
            m.required_level AS required, m.criticality,
            (SELECT count(*)::int FROM learner_evidence e
              WHERE e.user_id = $1 AND e.competency_id = c.id) AS "evidenceCount"
       FROM competencies c
       LEFT JOIN learner_competency_levels l ON l.user_id = $1 AND l.competency_id = c.id
       LEFT JOIN job_competency_map m
              ON m.competency_id = c.id
             AND m.job_id = (SELECT id FROM job_clusters WHERE code = $3)
      WHERE c.major_id = (SELECT major_id FROM instruments WHERE status = 'published'
                           ORDER BY id DESC LIMIT 1)
         OR c.major_id IS NULL
      ORDER BY (m.required_level IS NULL), m.criticality DESC NULLS LAST,
               m.required_level DESC NULLS LAST, c.code`,
    [userId, lang, topJob?.code ?? ""],
  );
}

export async function evidenceOf(userId: string, lang = "ko"): Promise<EvidenceRow[]> {
  return query<EvidenceRow>(
    `SELECT e.id, e.competency_id AS "competencyId",
            ${NAME("competencies", "c", "$2")} AS "competencyName",
            e.source_code AS "sourceCode", e.ref_label AS "refLabel", e.grade,
            e.raw_point::float AS "rawPoint",
            (e.verified_at IS NOT NULL) AS verified, e.created_at AS "createdAt"
       FROM learner_evidence e
       JOIN competencies c ON c.id = e.competency_id
      WHERE e.user_id = $1
      ORDER BY e.created_at DESC`,
    [userId, lang],
  );
}

/** 증거 한 줄의 점수. 산식이 아니라 표를 읽어서 곱한다. */
async function pointOf(sourceCode: string, grade: string | null): Promise<number> {
  const src = await queryOne<{ max_point: string; reliability: string }>(
    `SELECT max_point, reliability FROM evidence_sources WHERE code = $1`,
    [sourceCode],
  );
  if (!src) throw new Error(`알 수 없는 증거 출처입니다: ${sourceCode}`);

  let coef = 1;
  if (takesGrade(sourceCode) && grade) {
    const g = await queryOne<{ coefficient: string }>(
      `SELECT coefficient FROM grade_points WHERE grade = $1`,
      [grade],
    );
    if (!g) throw new Error(`알 수 없는 성적입니다: ${grade}`);
    coef = Number(g.coefficient);
  } else if (takesGrade(sourceCode)) {
    // 성적을 안 적은 과목은 가장 낮게 잡는다. 비워서 이득을 보면 안 된다.
    coef = 0.35;
  }

  return Math.round(Number(src.max_point) * coef * Number(src.reliability) * 100) / 100;
}

export async function addEvidence(
  userId: string,
  input: { competencyId: string; sourceCode: string; refLabel: string; grade: string | null },
): Promise<void> {
  const label = input.refLabel.trim();
  if (!label) throw new Error("무엇으로 채웠는지 적어 주세요.");
  if (label.length > 120) throw new Error("이름이 너무 깁니다.");

  const owns = await queryOne<{ id: string }>(
    `SELECT id FROM competencies WHERE id = $1`,
    [input.competencyId],
  );
  if (!owns) throw new Error("역량을 찾을 수 없습니다.");

  const grade = takesGrade(input.sourceCode) ? input.grade : null;
  const raw = await pointOf(input.sourceCode, grade);

  await query(
    `INSERT INTO learner_evidence
       (user_id, competency_id, source_code, ref_kind, ref_label, grade, raw_point)
     VALUES ($1, $2, $3, lower($3), $4, $5, $6)`,
    [userId, input.competencyId, input.sourceCode, label, grade, raw],
  );
  await recomputeLevels(userId, input.competencyId);
}

export async function removeEvidence(userId: string, evidenceId: string): Promise<void> {
  const row = await queryOne<{ competency_id: string }>(
    `DELETE FROM learner_evidence WHERE id = $1 AND user_id = $2 RETURNING competency_id`,
    [evidenceId, userId],
  );
  if (row) await recomputeLevels(userId, row.competency_id);
}

/**
 * 증거 점수를 합쳐 레벨로 바꾼다. 역량 하나만 다시 계산할 수도 있고
 * (competencyId 를 주면) 그 학생 전부를 다시 계산할 수도 있다.
 */
export async function recomputeLevels(userId: string, competencyId?: string): Promise<void> {
  await tx(async (c) => {
    // 증거가 다 지워진 역량은 행을 남기지 않는다. 0레벨과 "모름" 은 다르다.
    await c.query(
      `DELETE FROM learner_competency_levels l
        WHERE l.user_id = $1
          AND ($2::bigint IS NULL OR l.competency_id = $2)
          AND NOT EXISTS (SELECT 1 FROM learner_evidence e
                           WHERE e.user_id = $1 AND e.competency_id = l.competency_id)`,
      [userId, competencyId ?? null],
    );

    await c.query(
      `INSERT INTO learner_competency_levels (user_id, competency_id, held_raw, held_level, computed_at)
       SELECT s.user_id, s.competency_id, s.raw,
              (SELECT held_level FROM level_ladder
                WHERE min_raw <= s.raw ORDER BY min_raw DESC LIMIT 1),
              now()
         FROM (
           SELECT e.user_id, e.competency_id,
                  LEAST(6.0, SUM(e.raw_point))::numeric(5,2) AS raw
             FROM learner_evidence e
            WHERE e.user_id = $1 AND ($2::bigint IS NULL OR e.competency_id = $2)
            GROUP BY e.user_id, e.competency_id
         ) s
       ON CONFLICT (user_id, competency_id) DO UPDATE
         SET held_raw = EXCLUDED.held_raw,
             held_level = EXCLUDED.held_level,
             computed_at = now()`,
      [userId, competencyId ?? null],
    );
  });
}
