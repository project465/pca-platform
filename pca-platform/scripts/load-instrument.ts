/**
 * 검사 문항을 파일에서 읽어 데이터베이스에 넣는다.
 *
 *   npx tsx scripts/load-instrument.ts docs/instrument-example.json
 *
 * 문항 텍스트와 선택지 문구는 컬럼이 아니라 translations 의 행으로 들어간다
 * (설계 원칙 2). 나라가 늘 때 컬럼이 아니라 행이 늘어나야 하기 때문이다.
 *
 * 이미 있는 버전은 덮어쓰지 않는다 (설계 원칙 4). 문항을 고치려면 파일의
 * version 을 올려 새로 넣는다 — 작년 응시자의 결과가 올해 수정으로 바뀌면
 * 안 되기 때문이다. 아직 published 가 아닌 draft 만 --replace 로 갈아끼울 수 있다.
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
  } catch {
    /* 파일이 없으면 환경변수가 이미 있다고 본다 */
  }
}
loadEnv(".env.local");

type Named = Record<string, string>;
type OptionSpec = { order: number; score: number; label: Named };
type QuestionSpec = {
  order: number;
  indicator?: string;
  competency?: string;
  type: "likert5" | "choice";
  reversed?: boolean;
  text: Named;
  options?: OptionSpec[];
};
type Spec = {
  major: { code: string; name: Named };
  version: string;
  indicators: { code: string; name: Named }[];
  questions: QuestionSpec[];
};

/** likert5 는 선택지를 매번 적지 않는다. 다섯 칸이 늘 같기 때문이다 */
const LIKERT5: OptionSpec[] = [
  { order: 1, score: 1, label: { ko: "전혀 아니다", en: "Strongly disagree" } },
  { order: 2, score: 2, label: { ko: "아니다", en: "Disagree" } },
  { order: 3, score: 3, label: { ko: "보통이다", en: "Neutral" } },
  { order: 4, score: 4, label: { ko: "그렇다", en: "Agree" } },
  { order: 5, score: 5, label: { ko: "매우 그렇다", en: "Strongly agree" } },
];

async function put(
  c: PoolClient, table: string, rowId: string, field: string, names: Named,
) {
  for (const [lang, value] of Object.entries(names)) {
    await c.query(
      `INSERT INTO translations (table_name, row_id, lang, field, value)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value`,
      [table, rowId, lang, field, value],
    );
  }
}

async function main() {
  const file = process.argv[2];
  const replace = process.argv.includes("--replace");
  if (!file) {
    console.error("쓸 파일을 받지 못했습니다. 예: npx tsx scripts/load-instrument.ts docs/instrument-example.json");
    process.exit(2);
  }

  const spec: Spec = JSON.parse(readFileSync(resolve(process.cwd(), file), "utf8"));

  /* 파일 안에서 먼저 걸러낸다. 절반만 들어간 문항지가 생기면 곤란하다 */
  const orders = spec.questions.map((q) => q.order);
  if (new Set(orders).size !== orders.length) {
    console.error("문항 번호가 겹칩니다."); process.exit(1);
  }
  const codes = new Set(spec.indicators.map((i) => i.code));
  for (const q of spec.questions) {
    if (q.indicator && !codes.has(q.indicator)) {
      console.error(`${q.order}번 문항이 없는 지표를 가리킵니다: ${q.indicator}`); process.exit(1);
    }
    if (q.type === "choice" && (!q.options || q.options.length < 2)) {
      console.error(`${q.order}번 문항에 선택지가 없습니다.`); process.exit(1);
    }
  }

  const n = await tx(async (c) => {
    const major = await c.query<{ id: string }>(
      `INSERT INTO majors (code) VALUES ($1)
       ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code RETURNING id`,
      [spec.major.code],
    );
    const majorId = major.rows[0].id;
    await put(c, "majors", majorId, "name", spec.major.name);

    const found = await c.query<{ id: string; status: string }>(
      `SELECT id, status FROM instruments WHERE major_id = $1 AND version = $2`,
      [majorId, spec.version],
    );
    if (found.rowCount) {
      const cur = found.rows[0];
      if (cur.status !== "draft") {
        throw new Error(
          `${spec.major.code} ${spec.version} 은 이미 ${cur.status} 입니다. 문항을 고치려면 version 을 올리세요.`,
        );
      }
      if (!replace) {
        throw new Error(`${spec.major.code} ${spec.version} 이 이미 있습니다. 갈아끼우려면 --replace 를 주세요.`);
      }
      // draft 를 갈아끼운다. questions·indicators 는 ON DELETE CASCADE 로 함께 지워진다
      await c.query(`DELETE FROM instruments WHERE id = $1`, [cur.id]);
    }

    const inst = await c.query<{ id: string }>(
      `INSERT INTO instruments (major_id, version, status) VALUES ($1, $2, 'draft') RETURNING id`,
      [majorId, spec.version],
    );
    const instId = inst.rows[0].id;

    const indicatorId = new Map<string, string>();
    for (const ind of spec.indicators) {
      const r = await c.query<{ id: string }>(
        `INSERT INTO indicators (instrument_id, code) VALUES ($1, $2) RETURNING id`,
        [instId, ind.code],
      );
      indicatorId.set(ind.code, r.rows[0].id);
      await put(c, "indicators", r.rows[0].id, "name", ind.name);
    }

    for (const q of spec.questions) {
      const r = await c.query<{ id: string }>(
        `INSERT INTO questions (instrument_id, indicator_id, order_no, answer_type, is_reversed)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [instId, q.indicator ? indicatorId.get(q.indicator) : null, q.order, q.type, q.reversed ?? false],
      );
      const qid = r.rows[0].id;
      await put(c, "questions", qid, "text", q.text);

      const opts = q.type === "likert5" ? LIKERT5 : q.options!;
      for (const o of opts) {
        const or = await c.query<{ id: string }>(
          `INSERT INTO question_options (question_id, order_no, score) VALUES ($1, $2, $3) RETURNING id`,
          [qid, o.order, o.score],
        );
        await put(c, "question_options", or.rows[0].id, "label", o.label);
      }
    }
    return spec.questions.length;
  });

  console.log(`적재 완료 — ${spec.major.code} ${spec.version} · 문항 ${n}개 (status: draft)`);
  console.log(`학생에게 보이려면 published 로 올려야 합니다:`);
  console.log(`  UPDATE instruments SET status='published', published_at=now() WHERE version='${spec.version}';`);
}

main().then(
  () => process.exit(0),
  (e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); },
);
