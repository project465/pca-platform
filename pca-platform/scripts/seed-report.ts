/**
 * 결과지 개발용 시드. 결과지 화면을 눈으로 보려면 채점된 응시가 하나 있어야 한다.
 *
 *   npm run db:seed              (먼저 — 기관·계정)
 *   npm run db:seed:mentoring    (직무 영역 10개가 여기서 들어간다)
 *   npm run db:seed:report
 *
 * 점수는 임의로 넣은 예시다. 채점 산식은 정해지지 않았고(CLAUDE.md), 이 시드는
 * 산식을 계산하지 않는다 — 결과지 화면이 저장된 점수를 그리는지 확인하는 용도다.
 * 여러 번 돌려도 같은 상태가 된다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { tx } from "../src/lib/db";

function loadEnv(file: string) {
  try {
    for (const line of readFileSync(resolve(process.cwd(), file), "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* 파일이 없으면 환경변수가 이미 있다고 본다 */
  }
}
loadEnv(".env.local");

/** 역량 — 기계공학 예시. 시안(mockups/02)에 나오는 것들이다. */
const COMPETENCIES: [string, string, string][] = [
  ["FEM", "theory", "유한요소법"],
  ["ANSYS", "software", "ANSYS"],
  ["SOLID_MECH", "theory", "재료역학"],
  ["THERMO", "theory", "열역학"],
  ["MATLAB", "software", "MATLAB"],
  ["GDNT", "theory", "기하공차"],
  ["PYTHON", "software", "Python"],
  ["SPC", "theory", "통계적 공정관리"],
  ["CAD", "software", "3D 모델링(CAD)"],
];

/** 직무가 요구하는 역량 수준. 단체 리포트가 집계할 것이 있으려면 직무 여럿에 붙어 있어야 한다 */
const REQUIRED: Record<string, Record<string, number>> = {
  PROD_OPS: { FEM: 5, ANSYS: 5, SOLID_MECH: 5, THERMO: 4, MATLAB: 3, GDNT: 4, PYTHON: 3, SPC: 2 },
  IT_DATA: { PYTHON: 5, MATLAB: 4, FEM: 2, SPC: 3, CAD: 2 },
  CONSULT: { SPC: 4, MATLAB: 3, PYTHON: 3, GDNT: 2 },
};
const HELD: Record<string, number> = {
  FEM: 3, ANSYS: 2, SOLID_MECH: 3, THERMO: 4, MATLAB: 3, GDNT: 1, PYTHON: 2, SPC: 2,
};

/** 과목 — 대학(HYU)에 달린다. 부족 역량을 메우는 것으로 이어 붙인다 */
const COURSES: [string, string, number, string, string[]][] = [
  ["ME401", "유한요소해석", 3, "4-1", ["FEM", "ANSYS"]],
  ["ME412", "전산유체역학", 3, "4-1", ["ANSYS", "PYTHON"]],
  ["ME302", "재료역학 2", 3, "3-2", ["SOLID_MECH"]],
  ["ME355", "정밀측정과 기하공차", 2, "3-2", ["GDNT"]],
];

/** 직무 적합도. 상위 다섯 개만 결과지에 띄운다 */
const FITS: [string, number][] = [
  ["PROD_OPS", 82],
  ["IT_DATA", 74],
  ["CONSULT", 61],
  ["BIZ_STRAT", 48],
  ["MKT_SALES", 35],
];

async function main() {
  await tx(async (c) => {
    const one = async <T,>(sql: string, params: unknown[] = []): Promise<T> => {
      const r = await c.query(sql, params);
      return r.rows[0] as T;
    };
    const setName = (table: string, id: string, ko: string) =>
      c.query(
        `INSERT INTO translations (table_name, row_id, lang, field, value)
         VALUES ($1, $2, 'ko', 'name', $3)
         ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value`,
        [table, id, ko],
      );

    const major = await one<{ id: string }>(
      `SELECT id FROM majors WHERE code = 'ALL'`,
    );
    if (!major) throw new Error("majors 가 비어 있습니다. npm run db:seed:mentoring 을 먼저 돌리세요.");
    await setName("majors", major.id, "전 계열");

    const dept = await one<{ id: string; parent_id: string }>(
      `SELECT id, parent_id FROM organizations WHERE code = 'HYU-ME'`,
    );
    const student = await one<{ id: string }>(
      `SELECT id FROM users WHERE login_id = '2021001234'`,
    );

    // 역량과 요구 수준
    const compId = new Map<string, string>();
    for (const [code, type, ko] of COMPETENCIES) {
      const r = await one<{ id: string }>(
        `INSERT INTO competencies (code, comp_type) VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type
         RETURNING id`,
        [code, type],
      );
      compId.set(code, r.id);
      await setName("competencies", r.id, ko);
    }

    const jobId = new Map<string, string>();
    const jobs = await c.query<{ id: string; code: string }>(
      `SELECT id, code FROM job_clusters WHERE major_id = $1`,
      [major.id],
    );
    for (const j of jobs.rows) jobId.set(j.code, j.id);

    for (const [job, needs] of Object.entries(REQUIRED)) {
      for (const [code, level] of Object.entries(needs)) {
        if (!compId.get(code) || !jobId.get(job)) continue;
        await c.query(
          `INSERT INTO job_competency_map (job_id, competency_id, required_level)
           VALUES ($1, $2, $3)
           ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level`,
          [jobId.get(job), compId.get(code), level],
        );
      }
    }

    // 과목
    for (const [code, ko, credit, term, fills] of COURSES) {
      const r = await one<{ id: string }>(
        `INSERT INTO courses (org_id, major_id, course_code, credit, term_hint)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (org_id, course_code) DO UPDATE SET credit = EXCLUDED.credit
         RETURNING id`,
        [dept.parent_id, major.id, code, credit, term],
      );
      await setName("courses", r.id, ko);
      for (const f of fills) {
        await c.query(
          `INSERT INTO course_competency_map (course_id, competency_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [r.id, compId.get(f)],
        );
      }
    }

    // 검사 도구 · 계약 · 회차 — 응시 한 건을 만들기 위한 최소한
    const instrument = await one<{ id: string }>(
      `INSERT INTO instruments (major_id, version, status, published_at)
       VALUES ($1, 'v1.0', 'published', now())
       ON CONFLICT (major_id, version) DO UPDATE SET status = 'published'
       RETURNING id`,
      [major.id],
    );

    let contract = await one<{ id: string } | undefined>(
      `SELECT id FROM contracts WHERE org_id = $1 AND title = '2026-1학기 시드 계약'`,
      [dept.id],
    );
    if (!contract) {
      contract = await one<{ id: string }>(
        `INSERT INTO contracts (org_id, title, starts_on, ends_on, seat_count)
         VALUES ($1, '2026-1학기 시드 계약', current_date, current_date + 365, 50)
         RETURNING id`,
        [dept.id],
      );
    }
    // 응시권은 계약을 만들 때 그 수만큼 만들어진다(운영사 화면과 같은 규칙).
    // 시드에서 빠뜨리면 회차는 있는데 명단을 못 올리는 상태가 된다.
    await c.query(
      `INSERT INTO seats (contract_id, expires_at)
       SELECT $1, (current_date + 366)::timestamptz
         FROM generate_series(1, 50 - (SELECT count(*) FROM seats WHERE contract_id = $1))`,
      [contract.id],
    );

    let session = await one<{ id: string } | undefined>(
      `SELECT id FROM test_sessions WHERE org_id = $1 AND name = '2026-1학기 기계공학과 3학년'`,
      [dept.id],
    );
    if (!session) {
      session = await one<{ id: string }>(
        `INSERT INTO test_sessions
           (org_id, contract_id, instrument_id, name, opens_at, closes_at, release_mode, released_at)
         VALUES ($1, $2, $3, '2026-1학기 기계공학과 3학년',
                 now() - interval '30 days', now() + interval '30 days', 'manual', now())
         RETURNING id`,
        [dept.id, contract.id, instrument.id],
      );
    }

    const attempt = await one<{ id: string }>(
      `INSERT INTO attempts (session_id, user_id, status, submitted_at, scored_at)
       VALUES ($1, $2, 'scored', now() - interval '3 days', now() - interval '3 days')
       ON CONFLICT (session_id, user_id) DO UPDATE
         SET status = 'scored', scored_at = now() - interval '3 days'
       RETURNING id`,
      [session.id, student.id],
    );

    // 채점 결과 — 예시 값이다. 산식으로 계산한 것이 아니다
    await c.query(`DELETE FROM job_fit_scores WHERE attempt_id = $1`, [attempt.id]);
    for (const [i, [code, score]] of FITS.entries()) {
      await c.query(
        `INSERT INTO job_fit_scores (attempt_id, job_id, fit_score, rank_no)
         VALUES ($1, $2, $3, $4)`,
        [attempt.id, jobId.get(code), score, i + 1],
      );
    }
    for (const [code, level] of Object.entries(HELD)) {
      await c.query(
        `INSERT INTO competency_levels (attempt_id, competency_id, held_level)
         VALUES ($1, $2, $3)
         ON CONFLICT (attempt_id, competency_id) DO UPDATE SET held_level = EXCLUDED.held_level`,
        [attempt.id, compId.get(code), level],
      );
    }

    console.log(`
결과지 시드 완료.

  학생        2021001234 (이학생)
  결과지      http://localhost:3000/my/report/${attempt.id}
  학생 홈     http://localhost:3000/my

  1순위 직무는 생산·운영관리 82점이고, 그 직무를 다루는 현직자가
  결과지 맨 아래와 각 게이지의 '현직자 n명' 링크로 이어집니다.

  점수는 예시 값입니다. 채점 산식은 아직 정해지지 않았습니다.
`);
  });
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
