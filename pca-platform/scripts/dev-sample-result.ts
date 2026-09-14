/**
 * 결과지 화면을 눈으로 확인하기 위한 가짜 점수.
 *
 *   npx tsx scripts/dev-sample-result.ts
 *
 * **채점 결과가 아니다.** 채점 산식이 아직 정해지지 않아 job_fit_scores 와
 * competency_levels 가 비어 있고, 그러면 결과지 화면이 "채점을 기다리고
 * 있습니다" 에서 더 나아가지 않는다. 화면이 값을 제대로 그리는지 보려면
 * 값이 있어야 하므로 여기서 넣는다.
 *
 * 시드(scripts/seed.ts)에 넣지 않고 따로 둔 이유가 이것이다 — 개발용
 * 데이터베이스를 채울 때 딸려 들어가면, 언젠가 이 숫자를 실제 채점 결과로
 * 착각하게 된다. 산식이 정해지면 이 파일은 지운다.
 *
 * 숫자와 매핑은 mockups/02_student_report.html 의 예시를 따랐다.
 *
 * --students N 을 주면 단체 리포트를 볼 수 있게 가짜 응시자 N 명을 더 만든다.
 * 한 명뿐이면 분포도 충족률도 볼 것이 없기 때문이다. 이 사람들도 실제
 * 응시자가 아니다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PoolClient } from "pg";
import { tx } from "../src/lib/db";

function loadEnv(file: string) {
  try {
    for (const line of readFileSync(resolve(process.cwd(), file), "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch { /* 환경변수가 이미 있다고 본다 */ }
}
loadEnv(".env.local");

const JOBS = [
  { code: "ANALYSIS", name: "구조·유동 해석", score: 82 },
  { code: "DESIGN", name: "기계설계", score: 74 },
  { code: "RND", name: "연구개발", score: 61 },
  { code: "PROD", name: "생산기술", score: 48 },
  { code: "QA", name: "품질보증", score: 35 },
];

/** 1순위 직무가 요구하는 역량과, 이 학생이 가진 것으로 친 수준 */
const COMPS = [
  { code: "FEM", name: "유한요소법", type: "theory", required: 5, held: 3 },
  { code: "ANSYS", name: "ANSYS", type: "software", required: 5, held: 2 },
  { code: "SOLID", name: "재료역학", type: "theory", required: 5, held: 3 },
  { code: "THERMO", name: "열역학", type: "theory", required: 4, held: 4 },
  { code: "MATLAB", name: "MATLAB", type: "software", required: 3, held: 3 },
  { code: "GDT", name: "기하공차", type: "theory", required: 2, held: 1 },
];

const COURSES = [
  { code: "ME401", name: "유한요소해석", credit: 3, term: "4-1", covers: ["FEM", "ANSYS"] },
  { code: "ME412", name: "전산유체역학", credit: 3, term: "4-1", covers: ["ANSYS"] },
  { code: "ME302", name: "재료역학 2", credit: 3, term: "3-2", covers: ["SOLID"] },
];

async function put(c: PoolClient, table: string, rowId: string, value: string) {
  await c.query(
    `INSERT INTO translations (table_name, row_id, lang, field, value)
     VALUES ($1, $2, 'ko', 'name', $3)
     ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value`,
    [table, rowId, value],
  );
}

/** 사람마다 조금씩 다르게. 같은 자리에 같은 값이 나오도록 규칙적으로 흔든다 */
function shift(base: number, i: number, spread: number): number {
  const wave = Math.sin(i * 2.399) * spread;
  return Math.max(0, Math.min(100, Math.round(base + wave)));
}

async function main() {
  const extra = (() => {
    const i = process.argv.indexOf("--students");
    return i >= 0 ? Math.max(0, Number(process.argv[i + 1]) || 0) : 0;
  })();

  const n = await tx(async (c) => {
    const attempt = await c.query<{ id: string; major_id: string; org_id: string }>(
      `SELECT a.id, i.major_id, s.org_id
         FROM attempts a
         JOIN test_sessions s ON s.id = a.session_id
         JOIN instruments i ON i.id = s.instrument_id
        WHERE a.status IN ('submitted','scored')
        ORDER BY a.submitted_at DESC NULLS LAST, a.id DESC
        LIMIT 1`,
    );
    if (attempt.rowCount === 0) throw new Error("제출된 응시가 없습니다. 먼저 검사를 끝내세요.");
    const { id: attemptId, major_id: majorId, org_id: orgId } = attempt.rows[0];

    const jobId = new Map<string, string>();
    for (const [i, j] of JOBS.entries()) {
      const r = await c.query<{ id: string }>(
        `INSERT INTO job_clusters (major_id, code, sort_no) VALUES ($1, $2, $3)
         ON CONFLICT (major_id, code) DO UPDATE SET sort_no = EXCLUDED.sort_no RETURNING id`,
        [majorId, j.code, i],
      );
      jobId.set(j.code, r.rows[0].id);
      await put(c, "job_clusters", r.rows[0].id, j.name);
    }

    const compId = new Map<string, string>();
    for (const k of COMPS) {
      const r = await c.query<{ id: string }>(
        `INSERT INTO competencies (code, comp_type) VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET comp_type = EXCLUDED.comp_type RETURNING id`,
        [k.code, k.type],
      );
      compId.set(k.code, r.rows[0].id);
      await put(c, "competencies", r.rows[0].id, k.name);
    }

    const topJob = jobId.get(JOBS[0].code)!;
    for (const k of COMPS) {
      await c.query(
        `INSERT INTO job_competency_map (job_id, competency_id, required_level)
         VALUES ($1, $2, $3)
         ON CONFLICT (job_id, competency_id) DO UPDATE SET required_level = EXCLUDED.required_level`,
        [topJob, compId.get(k.code), k.required],
      );
    }

    for (const co of COURSES) {
      const r = await c.query<{ id: string }>(
        `INSERT INTO courses (org_id, major_id, course_code, credit, term_hint)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (org_id, course_code) DO UPDATE SET credit = EXCLUDED.credit RETURNING id`,
        [orgId, majorId, co.code, co.credit, co.term],
      );
      await put(c, "courses", r.rows[0].id, co.name);
      for (const cv of co.covers) {
        await c.query(
          `INSERT INTO course_competency_map (course_id, competency_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [r.rows[0].id, compId.get(cv)],
        );
      }
    }

    await c.query(`DELETE FROM job_fit_scores WHERE attempt_id = $1`, [attemptId]);
    for (const [i, j] of JOBS.entries()) {
      await c.query(
        `INSERT INTO job_fit_scores (attempt_id, job_id, fit_score, rank_no) VALUES ($1, $2, $3, $4)`,
        [attemptId, jobId.get(j.code), j.score, i + 1],
      );
    }

    await c.query(`DELETE FROM competency_levels WHERE attempt_id = $1`, [attemptId]);
    for (const k of COMPS) {
      await c.query(
        `INSERT INTO competency_levels (attempt_id, competency_id, held_level) VALUES ($1, $2, $3)`,
        [attemptId, compId.get(k.code), k.held],
      );
    }

    await c.query(`UPDATE attempts SET status = 'scored', scored_at = now() WHERE id = $1`, [attemptId]);

    /* 단체 리포트를 볼 수 있게 가짜 응시자를 더 만든다.
       이 사람들은 실제 응시자가 아니다 — 화면을 채우기 위한 것이다. */
    if (extra > 0) {
      const sess = await c.query<{ id: string; contract_id: string; org_id: string }>(
        `SELECT s.id, s.contract_id, s.org_id
           FROM attempts a JOIN test_sessions s ON s.id = a.session_id
          WHERE a.id = $1`,
        [attemptId],
      );
      const { id: sessionId, org_id: sOrgId } = sess.rows[0];

      for (let i = 0; i < extra; i++) {
        const loginId = `demo-${String(i + 1).padStart(3, "0")}`;
        const u = await c.query<{ id: string }>(
          `INSERT INTO users (login_id, password_hash, display_name, must_reset_pw)
           VALUES ($1, 'x', $2, false)
           ON CONFLICT (login_id) DO UPDATE SET display_name = EXCLUDED.display_name
           RETURNING id`,
          [loginId, `예시응시자${i + 1}`],
        );
        const uid = u.rows[0].id;
        await c.query(
          `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, 'student')
           ON CONFLICT (user_id, org_id, role) DO NOTHING`,
          [uid, sOrgId],
        );
        const at = await c.query<{ id: string }>(
          `INSERT INTO attempts (session_id, user_id, status, submitted_at, scored_at)
           VALUES ($1, $2, 'scored', now(), now())
           ON CONFLICT (session_id, user_id)
           DO UPDATE SET status = 'scored' RETURNING id`,
          [sessionId, uid],
        );
        const aid = at.rows[0].id;

        /* 사람마다 1순위 직무가 갈리게 한다.
           점수만 흔들면 기준 점수 차이(82 … 35)가 커서 늘 같은 직무가 1등이
           되므로, 이 사람의 차례인 직무에 웃돈을 얹어 위로 올린다. */
        const rot = i % JOBS.length;
        await c.query(`DELETE FROM job_fit_scores WHERE attempt_id = $1`, [aid]);
        const topBase = Math.max(...JOBS.map((x) => x.score));
        const ranked = JOBS.map((j, k) => ({
          code: j.code,
          // 이 사람 차례인 직무만 맨 위 점수보다 조금 위로 올린다. 크게 얹으면
          // 100 에 붙어 버려 평균이 전부 100 으로 보인다
          score: shift(k === rot ? topBase + 4 : j.score, i + k, 7),
        })).sort((a, b) => b.score - a.score);
        const order = ranked;
        for (const [k, j] of order.entries()) {
          await c.query(
            `INSERT INTO job_fit_scores (attempt_id, job_id, fit_score, rank_no)
             VALUES ($1, $2, $3, $4)`,
            [aid, jobId.get(j.code), j.score, k + 1],
          );
        }

        await c.query(`DELETE FROM competency_levels WHERE attempt_id = $1`, [aid]);
        for (const [k, cm] of COMPS.entries()) {
          // 충족·미충족이 갈리도록 요구 수준 언저리에서 오르내리게 한다
          const held = Math.max(0, Math.min(5, cm.required - 2 + ((i * 3 + k * 5) % 4)));
          await c.query(
            `INSERT INTO competency_levels (attempt_id, competency_id, held_level)
             VALUES ($1, $2, $3)`,
            [aid, compId.get(cm.code), held],
          );
        }
      }
    }

    return attemptId;
  });

  console.log(`가짜 점수를 넣었습니다 — attempt ${n}`);
  console.log("채점 결과가 아닙니다. 결과지 화면을 눈으로 보기 위한 값입니다.");
}

main().then(
  () => process.exit(0),
  (e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); },
);
