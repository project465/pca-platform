/**
 * 고교학점제 과목표를 적재한다.
 *
 *   npm run metri:subjects
 *
 * data/metri/hs_subjects_kr.json 이 원본이고, 이 스크립트는 그것을 스키마에
 * 옮길 뿐이다. 과목을 고칠 일이 생기면 JSON 을 고치고 다시 돌린다.
 *
 * 문항 은행과 달리 이 표는 "버전을 올려 보존" 하지 않는다. 교육과정이 바뀌면
 * 과거 학생의 처방도 함께 바뀌어야 맞기 때문이다 — 2028년에 없어진 과목을
 * 계속 권하는 결과지가 더 나쁘다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PoolClient, QueryResultRow } from "pg";
import { tx } from "../../src/lib/db";

type Subject = {
  code: string;
  group: string;
  category: string;
  credit: number;
  prereq: string | null;
  grade: number;
  absoluteOnly: boolean;
  csat: boolean;
  sortNo: number;
  ko: string;
  en: string;
  blurb: string;
};

type Need = {
  sortNo: number;
  what: string;
  univ: string;
  hs: string[];
  hsWhy: string;
  ms: string;
  msWhy: string;
};
type Role = {
  major: string;
  sortNo: number;
  job: string | null;
  name: string;
  scene: string;
  needs: Need[];
};
type Chain = { roles: Role[] };

type Bank = {
  country: string;
  curriculum: string;
  groups: { code: string; ko: string; en: string }[];
  subjects: Subject[];
  need: { major: string; subject: string; necessity: number; why: string }[];
  univRecommendations: {
    univ: string;
    track: string;
    subject: string;
    level: string;
    /** 없으면 그 트랙 전체에 걸린다 */
    major?: string;
  }[];
  univRules: {
    univ: string;
    track: string;
    group: string;
    category: string;
    minCount: number;
  }[];
};

const bankPath = process.argv[2] ?? "data/metri/hs_subjects_kr.json";
const bank: Bank = JSON.parse(readFileSync(join(process.cwd(), bankPath), "utf8"));
const chain: Chain = JSON.parse(
  readFileSync(join(process.cwd(), "data/metri/career_chain_kr.json"), "utf8"),
);

const LANGS = ["ko", "en"] as const;

async function putText(
  c: PoolClient,
  table: string,
  rowId: string,
  field: string,
  text: Partial<Record<string, string>>,
) {
  for (const lang of LANGS) {
    if (!text[lang]) continue;
    await c.query(
      `INSERT INTO translations (table_name, row_id, lang, field, value)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value`,
      [table, rowId, lang, field, text[lang]],
    );
  }
}

async function main() {
  console.log(
    `${bank.curriculum} · 과목 ${bank.subjects.length}개 · 계열 연결 ${bank.need.length}행`,
  );

  await tx(async (c) => {
    const q1 = async <T extends QueryResultRow>(text: string, params: unknown[] = []) =>
      (await c.query<T>(text, params)).rows[0] ?? null;

    // 1. 과목. 선수과목은 코드로 들어가므로 순서를 신경 쓸 필요가 없다.
    const subjectId = new Map<string, string>();
    for (const s of bank.subjects) {
      const row = await q1<{ id: string }>(
        `INSERT INTO hs_subjects
           (country, code, category, credit, subject_group, prereq_code,
            grade_hint, absolute_only, csat, sort_no)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (country, code) DO UPDATE SET
           category = EXCLUDED.category, credit = EXCLUDED.credit,
           subject_group = EXCLUDED.subject_group, prereq_code = EXCLUDED.prereq_code,
           grade_hint = EXCLUDED.grade_hint, absolute_only = EXCLUDED.absolute_only,
           csat = EXCLUDED.csat, sort_no = EXCLUDED.sort_no
         RETURNING id`,
        [
          bank.country, s.code, s.category, s.credit, s.group, s.prereq,
          s.grade, s.absoluteOnly, s.csat, s.sortNo,
        ],
      );
      subjectId.set(s.code, row!.id);
      await putText(c, "hs_subjects", row!.id, "name", { ko: s.ko, en: s.en });
      await putText(c, "hs_subjects", row!.id, "blurb", { ko: s.blurb });
    }

    // 선수과목이 실제로 있는 과목을 가리키는지 확인한다. 없는 코드를 가리키면
    // 처방이 "먼저 들어야 할 과목" 을 못 찾고 조용히 빼먹는다.
    for (const s of bank.subjects) {
      if (s.prereq && !subjectId.has(s.prereq)) {
        throw new Error(`${s.code} 의 선수과목 ${s.prereq} 가 과목표에 없습니다`);
      }
    }

    // 2. 교과군
    for (const [i, g] of bank.groups.entries()) {
      const row = await q1<{ id: string }>(
        `INSERT INTO hs_subject_groups (code, sort_no) VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET sort_no = EXCLUDED.sort_no
         RETURNING id`,
        [g.code, i + 1],
      );
      await putText(c, "hs_subject_groups", row!.id, "name", { ko: g.ko, en: g.en });
    }

    // 3. 계열 × 과목 필요도와 "왜 이 과목인가"
    const majorId = new Map<string, string>();
    for (const code of new Set(bank.need.map((n) => n.major))) {
      const m = await q1<{ id: string }>(`SELECT id FROM majors WHERE code = $1`, [code]);
      if (!m) throw new Error(`majors 에 ${code} 가 없습니다`);
      majorId.set(code, m.id);
    }
    await c.query(`DELETE FROM hs_subject_major_map`);
    for (const n of bank.need) {
      const sid = subjectId.get(n.subject);
      if (!sid) throw new Error(`과목표에 ${n.subject} 가 없습니다`);
      const row = await q1<{ id: string }>(
        `INSERT INTO hs_subject_major_map (subject_id, major_id, necessity)
         VALUES ($1,$2,$3) RETURNING id`,
        [sid, majorId.get(n.major), n.necessity],
      );
      await putText(c, "hs_subject_major_map", row!.id, "why", { ko: n.why });
    }

    // 4. 대학 권장 — 대학이 이름을 걸고 밝힌 것만
    await c.query(`DELETE FROM hs_univ_subject_recs`);
    for (const r of bank.univRecommendations) {
      const sid = subjectId.get(r.subject);
      if (!sid) throw new Error(`과목표에 ${r.subject} 가 없습니다`);
      await c.query(
        `INSERT INTO hs_univ_subject_recs (univ_code, track_code, subject_id, level, major_id)
         VALUES ($1,$2,$3,$4,$5)`,
        [r.univ, r.track, sid, r.level, r.major ? majorId.get(r.major) ?? null : null],
      );
    }
    await c.query(`DELETE FROM hs_univ_subject_rules`);
    for (const r of bank.univRules) {
      await c.query(
        `INSERT INTO hs_univ_subject_rules
           (univ_code, track_code, subject_group, category, min_count)
         VALUES ($1,$2,$3,$4,$5)`,
        [r.univ, r.track, r.group, r.category, r.minCount],
      );
    }

    /**
     * 5. 현장에서 거꾸로 내려오는 사슬(29절).
     *
     * 과목표와 같은 스크립트에서 올린다. 사슬의 잎이 과목 코드라서 과목이
     * 먼저 들어가 있어야 하고, 둘이 따로 돌면 언젠가 한쪽만 최신이 된다.
     */
    await c.query(`DELETE FROM career_roles`);
    let nNeeds = 0;
    let nLinks = 0;
    for (const r of chain.roles) {
      const mj = majorId.get(r.major)
        ?? (await q1<{ id: string }>(`SELECT id FROM majors WHERE code = $1`, [r.major]))?.id;
      if (!mj) throw new Error(`majors 에 ${r.major} 가 없습니다`);
      const job = r.job
        ? await q1<{ id: string }>(`SELECT id FROM job_clusters WHERE code = $1`, [r.job])
        : null;
      // 대학판에 없는 계열도 있다. 못 찾았다고 멈추지 않되, 코드를 적어 뒀는데
      // 못 찾은 것은 오타이므로 그때는 멈춘다.
      if (r.job && !job) throw new Error(`job_clusters 에 ${r.job} 가 없습니다`);

      const role = await q1<{ id: string }>(
        `INSERT INTO career_roles (major_id, job_id, sort_no) VALUES ($1,$2,$3) RETURNING id`,
        [mj, job?.id ?? null, r.sortNo],
      );
      await putText(c, "career_roles", role!.id, "name", { ko: r.name });
      await putText(c, "career_roles", role!.id, "scene", { ko: r.scene });

      for (const nd of r.needs) {
        const need = await q1<{ id: string }>(
          `INSERT INTO career_needs (role_id, sort_no) VALUES ($1,$2) RETURNING id`,
          [role!.id, nd.sortNo],
        );
        nNeeds++;
        await putText(c, "career_needs", need!.id, "what", { ko: nd.what });
        await putText(c, "career_needs", need!.id, "univ", { ko: nd.univ });
        await putText(c, "career_needs", need!.id, "hs_why", { ko: nd.hsWhy });
        await putText(c, "career_needs", need!.id, "ms", { ko: nd.ms });
        await putText(c, "career_needs", need!.id, "ms_why", { ko: nd.msWhy });
        for (const code of nd.hs) {
          const sid = subjectId.get(code);
          if (!sid) throw new Error(`사슬이 가리키는 과목 ${code} 가 과목표에 없습니다`);
          await c.query(
            `INSERT INTO career_need_subjects (need_id, subject_id) VALUES ($1,$2)
             ON CONFLICT DO NOTHING`,
            [need!.id, sid],
          );
          nLinks++;
        }
      }
    }

    console.log(
      `적재 완료 — 과목 ${subjectId.size} · 필요도 ${bank.need.length} · ` +
        `대학 권장 ${bank.univRecommendations.length} + 규칙 ${bank.univRules.length}`,
    );
    console.log(
      `사슬 — 직무 ${chain.roles.length} · 현장에서 필요한 것 ${nNeeds} · 과목 연결 ${nLinks}`,
    );
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
