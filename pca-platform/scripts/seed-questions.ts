/**
 * 검사 문항 개발용 시드.
 *
 *   npm run db:seed              (기관·계정)
 *   npm run db:seed:mentoring    (직무 영역 10개)
 *   npm run db:seed:questions    (이 파일)
 *   npm run db:seed:report       (채점된 응시 한 건)
 *
 * 문항은 `mockups/01_test_screen.html` 시안에 있는 12개를 그대로 가져왔다.
 * 실제 문항 수와 내용은 아직 정해지지 않았다(CLAUDE.md 「아직 정해지지 않은 것」).
 * 이 시드는 응시 화면이 도는지 확인하기 위한 것이지 문항을 확정하는 것이 아니다.
 *
 * 문항 본문과 선택지 라벨은 컬럼이 아니라 translations 에 들어간다 (설계 원칙 2).
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

const LIKERT = ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"];

/** 지표 — 문항이 재는 축. 채점 가중치(scoring_weights)가 이 축에 붙는다 */
const INDICATORS: [string, string][] = [
  ["ANALYTIC", "분석·수리"],
  ["DESIGN", "설계·구상"],
  ["FIELD", "현장·운영"],
  ["DOC", "문서·규격"],
  ["DEPTH", "몰입·탐구"],
  ["COMM", "정리·전달"],
  ["ACADEMIC", "학업·연구 지향"],
];

type Q = {
  text: string;
  indicator: string | null;
  /** 역량 보유 수준을 직접 묻는 문항은 competencies 에 연결한다 */
  competency: string | null;
  reversed: boolean;
  options: string[];
};

const QUESTIONS: Q[] = [
  {
    text: "수식으로 표현된 물리 현상을 직접 계산해 확인해보는 일이 즐겁다.",
    indicator: "ANALYTIC", competency: null, reversed: false, options: LIKERT,
  },
  {
    text: "완성된 도면보다, 아직 형상이 정해지지 않은 아이디어 단계가 더 흥미롭다.",
    indicator: "DESIGN", competency: null, reversed: false, options: LIKERT,
  },
  {
    text: "실험 결과가 이론값과 다를 때 원인을 끝까지 추적하는 편이다.",
    indicator: "DEPTH", competency: null, reversed: false, options: LIKERT,
  },
  {
    text: "규격서나 기준 문서를 읽고 정리하는 일이 크게 부담스럽지 않다.",
    indicator: "DOC", competency: null, reversed: false, options: LIKERT,
  },
  {
    text: "3D 모델링 도구를 사용해 본 경험은 어느 정도인가요?",
    indicator: "DESIGN", competency: "CAD", reversed: false,
    options: ["써본 적 없다", "수업에서 따라 해봤다", "과제 부품을 직접 그려봤다", "조립체까지 설계해봤다"],
  },
  {
    text: "설비가 멈춘 상황이라면, 현장에 직접 가서 확인하는 쪽이 나에게 맞다.",
    indicator: "FIELD", competency: null, reversed: false, options: LIKERT,
  },
  {
    text: "반복되는 계산을 코드로 자동화해 본 경험은 어느 정도인가요?",
    indicator: "ANALYTIC", competency: "PYTHON", reversed: false,
    options: ["없다", "예제를 실행해봤다", "과제에 직접 작성해 썼다", "반복 작업용 도구를 만들어봤다"],
  },
  {
    text: "하나의 주제를 오래 파고드는 편이다.",
    indicator: "DEPTH", competency: null, reversed: false, options: LIKERT,
  },
  {
    text: "유한요소해석을 수업이나 스터디에서 접해본 적이 있나요?",
    indicator: "ANALYTIC", competency: "FEM", reversed: false,
    options: ["들어본 적 없다", "이름만 안다", "수업에서 다뤄봤다", "직접 해석을 돌려봤다"],
  },
  {
    text: "도면에 표기된 공차의 의미를 읽을 수 있다.",
    indicator: "DOC", competency: "GDNT", reversed: false, options: LIKERT,
  },
  {
    text: "팀 과제에서 결과 정리와 발표를 맡는 경우가 많다.",
    indicator: "COMM", competency: null, reversed: false, options: LIKERT,
  },
  {
    text: "졸업 후 대학원 진학을 고려하고 있다.",
    indicator: "ACADEMIC", competency: null, reversed: false, options: LIKERT,
  },
];

async function main() {
  await tx(async (c) => {
    const one = async <T,>(sql: string, params: unknown[] = []): Promise<T> => {
      const r = await c.query(sql, params);
      return r.rows[0] as T;
    };
    const setText = (table: string, id: string, field: string, value: string) =>
      c.query(
        `INSERT INTO translations (table_name, row_id, lang, field, value)
         VALUES ($1, $2, 'ko', $3, $4)
         ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value`,
        [table, id, field, value],
      );

    const major = await one<{ id: string } | undefined>(`SELECT id FROM majors WHERE code = 'ALL'`);
    if (!major) throw new Error("majors 가 비어 있습니다. npm run db:seed:mentoring 을 먼저 돌리세요.");

    const instrument = await one<{ id: string }>(
      `INSERT INTO instruments (major_id, version, status, published_at)
       VALUES ($1, 'v1.0', 'published', now())
       ON CONFLICT (major_id, version) DO UPDATE SET status = 'published'
       RETURNING id`,
      [major.id],
    );

    const indicatorId = new Map<string, string>();
    for (const [code, ko] of INDICATORS) {
      const r = await one<{ id: string }>(
        `INSERT INTO indicators (instrument_id, code) VALUES ($1, $2)
         ON CONFLICT (instrument_id, code) DO UPDATE SET code = EXCLUDED.code
         RETURNING id`,
        [instrument.id, code],
      );
      indicatorId.set(code, r.id);
      await setText("indicators", r.id, "name", ko);
    }

    // 문항에서 직접 묻는 역량. 없으면 만든다(3D 모델링 등)
    const compId = new Map<string, string>();
    for (const code of new Set(QUESTIONS.map((q) => q.competency).filter((v): v is string => !!v))) {
      const r = await one<{ id: string }>(
        `INSERT INTO competencies (code, comp_type) VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
         RETURNING id`,
        [code, code === "CAD" ? "software" : "theory"],
      );
      compId.set(code, r.id);
    }
    await setText("competencies", compId.get("CAD")!, "name", "3D 모델링(CAD)");

    for (const [i, q] of QUESTIONS.entries()) {
      const orderNo = i + 1;
      const row = await one<{ id: string }>(
        `INSERT INTO questions
           (instrument_id, indicator_id, competency_id, order_no, answer_type, is_reversed)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (instrument_id, order_no) DO UPDATE
           SET indicator_id = EXCLUDED.indicator_id,
               competency_id = EXCLUDED.competency_id,
               answer_type = EXCLUDED.answer_type,
               is_reversed = EXCLUDED.is_reversed
         RETURNING id`,
        [
          instrument.id,
          q.indicator ? indicatorId.get(q.indicator) : null,
          q.competency ? compId.get(q.competency) : null,
          orderNo,
          q.options.length === 5 ? "likert5" : "choice",
          q.reversed,
        ],
      );
      await setText("questions", row.id, "text", q.text);

      for (const [k, label] of q.options.entries()) {
        // 배점은 1부터 선택지 수까지. 역채점은 채점 단계에서 is_reversed 로 뒤집는다.
        const opt = await one<{ id: string }>(
          `INSERT INTO question_options (question_id, order_no, score)
           VALUES ($1, $2, $3)
           ON CONFLICT (question_id, order_no) DO UPDATE SET score = EXCLUDED.score
           RETURNING id`,
          [row.id, k + 1, k + 1],
        );
        await setText("question_options", opt.id, "label", label);
      }
    }

    console.log(`
문항 시드 완료.

  검사 도구   v1.0 (published)
  지표        ${INDICATORS.length}개
  문항        ${QUESTIONS.length}개 (리커트 5점 ${QUESTIONS.filter((q) => q.options.length === 5).length}개 · 선택형 ${QUESTIONS.filter((q) => q.options.length !== 5).length}개)

  문항 내용은 화면 시안(mockups/01_test_screen.html)에서 가져온 예시입니다.
  실제 문항은 아직 정해지지 않았습니다.
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
