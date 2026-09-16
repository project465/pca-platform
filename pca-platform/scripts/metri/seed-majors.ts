/**
 * 제안서의 학과 28개를 표로 넣는다.
 *
 * **켜는 것은 문항이 있는 학과뿐이다.** 제안서에는 28개가 적혀 있지만
 * 실제 문항 은행은 기계공학 하나다. 나머지를 켜 두면 학생이 전공을 고르고
 * 들어갔다가 빈 검사를 만난다 — 스키마의 CHECK 도 검사지 없는 학과를
 * 켜지 못하게 막는다.
 *
 *   npm run metri:majors
 */
import { readFileSync } from "node:fs";
import { query, queryOne } from "../../src/lib/db";

type Program = {
  code: string; family: string; name: string;
  departments: string[]; instrumentKey?: string;
};

async function main() {
  const doc = JSON.parse(readFileSync("data/metri/majors_kr.json", "utf-8"));
  const programs: Program[] = doc.programs;

  for (const [i, p] of programs.entries()) {
    // 검사지가 실제로 적재돼 있을 때만 붙인다. JSON 에 적혀 있어도
    // DB 에 없으면 NULL 로 둔다 — 없는 것을 있다고 적지 않는다
    const inst = p.instrumentKey
      ? await queryOne<{ instrument_key: string }>(
          `SELECT instrument_key FROM instruments
            WHERE instrument_key = $1 AND status = 'published'
            ORDER BY id DESC LIMIT 1`,
          [p.instrumentKey])
      : null;

    const row = await queryOne<{ id: string }>(
      `INSERT INTO major_programs (code, family, instrument_key, order_no, active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code) DO UPDATE
         SET family = EXCLUDED.family,
             instrument_key = EXCLUDED.instrument_key,
             order_no = EXCLUDED.order_no,
             active = EXCLUDED.active
       RETURNING id`,
      [p.code, p.family, inst?.instrument_key ?? null, i + 1, !!inst],
    );

    await query(
      `INSERT INTO translations (table_name, row_id, lang, field, value)
       VALUES ('major_programs', $1, 'ko', 'name', $2),
              ('major_programs', $1, 'ko', 'departments', $3)
       ON CONFLICT (table_name, row_id, lang, field)
         DO UPDATE SET value = EXCLUDED.value`,
      [row!.id, p.name, p.departments.join(" · ")],
    );
  }

  const on = await query<{ code: string }>(
    `SELECT code FROM major_programs WHERE active ORDER BY order_no`);
  const off = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM major_programs WHERE NOT active`);

  console.log(`학과 ${programs.length}개를 넣었다.`);
  console.log(`  켜짐 ${on.length}개 — ${on.map((r) => r.code).join(", ")}`);
  console.log(`  꺼짐 ${off!.n}개 — 문항 은행이 없다. 지어내지 않는다`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
