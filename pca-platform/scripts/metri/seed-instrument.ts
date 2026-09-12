/**
 * 문항 은행 파일 하나를 METRI 검사지로 올린다.
 *
 *   npm run metri:items       대학판 PCA_ME_V1 — 기계공학 253문항
 *   npm run metri:items:hs    고교판 HS_V1    — 메트리 플러스 115문항
 *
 * 대학판은 단체 PCA 기계공학과 엑셀 세 벌(한국어·영어·튀르키예어)에서 뽑아낸
 * 것이고, 문항 번호·직무분야·성향 배정이 원본과 완전히 같다. 고교판은 새로
 * 썼다 — 전공 용어가 들어간 문장은 중·고등학생에게 성향이 아니라 어휘를 묻게
 * 되기 때문이다(docs/metri/14_metri_plus.md).
 *
 *   대학판  10 직무분야 × 25 = 250,  6 성향 × 20 = 120(겹침),  성실도 3
 *   고교판   8 계열     × 14 = 112,  6 성향 × 16 = 96(겹침),   성실도 3
 *
 * 둘 다 문항은 고치지 않는다. 고칠 일이 생기면 version 을 올려 새 instrument
 * 를 만든다. 이미 응시한 사람의 결과가 뒤에서 바뀌면 안 되기 때문이다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PoolClient, QueryResultRow } from "pg";
import { tx } from "../../src/lib/db";

type Item = {
  code: string;
  seq: number;
  area: string | null;
  trait: string | null;
  reverse: boolean;
  attention?: number;
  ko: string;
  en: string;
  tr: string;
};

type Bank = {
  instrumentKey: string;
  version: string;
  /** 고교판은 전공이 없다. 학생이 아직 전공을 안 골랐기 때문이다 */
  major: string | null;
  track?: string;
  scale: { points: number; labels: Record<string, string[]> };
  areas: {
    code: string;
    /** 고교판에서는 영역이 곧 전공이다. 그 전공 코드를 여기 적는다 */
    major?: string;
    ko: string;
    en: string;
    tr: string;
    axisWeights: Record<string, number>;
  }[];
  items: Item[];
};

const LANGS = ["ko", "en", "tr"] as const;
type Lang = (typeof LANGS)[number];

const bankPath = process.argv[2] ?? "data/metri/items_pca_me_v1.json";
const bank: Bank = JSON.parse(readFileSync(join(process.cwd(), bankPath), "utf8"));

/** 은행에 없는 언어는 넣지 않는다. 빈 문자열을 넣으면 결과지가 빈칸으로 나온다 */
const langsIn = LANGS.filter((l) => bank.scale.labels[l]?.length === bank.scale.points);

/** 사람이 읽는 문장은 전부 translations 로. 컬럼이 아니라 행이 늘어난다. */
async function putText(
  c: PoolClient,
  table: string,
  rowId: string,
  field: string,
  text: Partial<Record<Lang, string>>,
) {
  for (const lang of langsIn) {
    if (!text[lang]) continue;
    await c.query(
      `INSERT INTO translations (table_name, row_id, lang, field, value)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (table_name, row_id, lang, field) DO UPDATE SET value = EXCLUDED.value`,
      [table, rowId, lang, field, text[lang]!],
    );
  }
}

async function main() {
  const scored = bank.items.filter((i) => i.attention === undefined);
  const traited = scored.filter((i) => i.trait);
  console.log(
    `문항 ${bank.items.length}개 (채점 ${scored.length} · 성향 반영 ${traited.length} · 성실도 ${bank.items.length - scored.length})`,
  );

  await tx(async (c) => {
    // tx 가 건네준 커넥션으로만 질의한다. 풀에서 새로 꺼내면 트랜잭션 밖이 된다.
    const q = async (text: string, params: unknown[] = []) => {
      await c.query(text, params);
    };
    const q1 = async <T extends QueryResultRow>(text: string, params: unknown[] = []) =>
      (await c.query<T>(text, params)).rows[0] ?? null;

    // 고교판은 전공이 없다. bank.major 가 null 이면 그대로 둔다.
    let majorId: string | null = null;
    if (bank.major) {
      const major = await q1<{ id: string }>(`SELECT id FROM majors WHERE code = $1`, [bank.major]);
      if (!major) throw new Error(`majors 에 ${bank.major} 가 없습니다. npm run metri:seed 를 먼저 돌리세요.`);
      majorId = major.id;
    }

    // 1. 영역과 축 변환 행렬.
    //    대학판에서는 직무분야, 고교판에서는 계열(=전공)이다.
    for (const [idx, area] of bank.areas.entries()) {
      let areaMajorId = majorId;
      if (area.major) {
        const m = await q1<{ id: string }>(`SELECT id FROM majors WHERE code = $1`, [area.major]);
        if (!m) throw new Error(`majors 에 ${area.major} 가 없습니다. npm run metri:seed 를 먼저 돌리세요.`);
        areaMajorId = m.id;
        // 전공 이름도 여기서 채운다. 고교판 결과지가 가리키는 것이 전공이라,
        // majors 에 영어 이름이 없으면 영문 결과지에 한국어가 그대로 찍힌다.
        await putText(c, "majors", m.id, "name", { ko: area.ko, en: area.en, tr: area.tr });
      }
      const row = await q1<{ id: string }>(
        `INSERT INTO job_areas (code, major_id, sort_no, instrument_key) VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE SET major_id = EXCLUDED.major_id,
                                          sort_no = EXCLUDED.sort_no,
                                          instrument_key = EXCLUDED.instrument_key
         RETURNING id`,
        [area.code, areaMajorId, idx + 1, bank.instrumentKey],
      );
      await putText(c, "job_areas", row!.id, "name", { ko: area.ko, en: area.en, tr: area.tr });

      const sum = Object.values(area.axisWeights).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1) > 1e-6) throw new Error(`${area.code} 축 가중치 합이 ${sum} 입니다`);
      await q(`DELETE FROM job_area_axis_weights WHERE area_code = $1`, [area.code]);
      for (const [axis, w] of Object.entries(area.axisWeights)) {
        await q(
          `INSERT INTO job_area_axis_weights (area_code, axis_code, weight) VALUES ($1, $2, $3)`,
          [area.code, axis, w],
        );
      }
    }

    // 2. 검사지. 같은 버전을 다시 올리면 문항을 지우고 새로 넣는다(draft 동안만).
    const track = bank.track ?? "UNIV_LOW";
    const minutes = Math.ceil((bank.items.length * 7) / 60);
    const found = await q1<{ id: string }>(
      `SELECT id FROM instruments WHERE instrument_key = $1 AND version = $2`,
      [bank.instrumentKey, bank.version],
    );
    const inst = found
      ? await q1<{ id: string }>(
          `UPDATE instruments SET item_count = $2, est_minutes = $3, track_code = $4,
                                  major_id = $5, status = 'published'
            WHERE id = $1 RETURNING id`,
          [found.id, bank.items.length, minutes, track, majorId],
        )
      : await q1<{ id: string }>(
          `INSERT INTO instruments
             (major_id, version, status, track_code, item_count, est_minutes, instrument_key)
           VALUES ($1, $2, 'published', $3, $4, $5, $6)
           RETURNING id`,
          [majorId, bank.version, track, bank.items.length, minutes, bank.instrumentKey],
        );
    const instrumentId = inst!.id;

    const used = await q1<{ n: string }>(
      `SELECT count(*) AS n FROM responses r
         JOIN questions q ON q.id = r.question_id
        WHERE q.instrument_id = $1`,
      [instrumentId],
    );
    if (Number(used!.n) > 0) {
      throw new Error(
        `이미 ${used!.n}개 응답이 달린 검사지입니다. 문항을 고치려면 version 을 올리세요.`,
      );
    }
    await q(`DELETE FROM questions WHERE instrument_id = $1`, [instrumentId]);

    // 3. 지표 — 검사 버전마다 새로 생기되 고정 축(indicator_axes)에 붙는다.
    const axes = [...new Set(bank.areas.flatMap((a) => Object.keys(a.axisWeights)))];
    const traits = [...new Set(bank.items.map((i) => i.trait).filter(Boolean))] as string[];
    const indicatorId = new Map<string, string>();
    for (const axis of [...axes, ...traits]) {
      const row = await q1<{ id: string }>(
        `INSERT INTO indicators (instrument_id, code, axis_code) VALUES ($1, $2, $2)
         ON CONFLICT (instrument_id, code) DO UPDATE SET axis_code = EXCLUDED.axis_code
         RETURNING id`,
        [instrumentId, axis],
      );
      indicatorId.set(axis, row!.id);
    }

    // 4. 문항과 선택지. 성향 문항은 성향 지표에, 일반 직무문항은 지표 없이
    //    직무분야로만 채점한다 — 원본 엑셀의 '직무점수 O / 성향점수 X' 그대로다.
    for (const item of bank.items) {
      const isAttention = item.attention !== undefined;
      const q = await q1<{ id: string }>(
        `INSERT INTO questions
           (instrument_id, indicator_id, order_no, answer_type, is_reversed,
            axis_code, item_kind, area_code, attention_expect)
         VALUES ($1, $2, $3, 'likert5', $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          instrumentId,
          item.trait ? indicatorId.get(item.trait) : null,
          item.seq,
          item.reverse,
          item.trait ?? null,
          isAttention ? "attention" : "likert",
          item.area,
          item.attention ?? null,
        ],
      );
      await putText(c, "questions", q!.id, "stem", { ko: item.ko, en: item.en, tr: item.tr });

      for (let v = 1; v <= bank.scale.points; v++) {
        const opt = await q1<{ id: string }>(
          `INSERT INTO question_options (question_id, order_no, score) VALUES ($1, $2, $3)
           RETURNING id`,
          [q!.id, v, item.reverse ? bank.scale.points + 1 - v : v],
        );
        await putText(
          c,
          "question_options",
          opt!.id,
          "label",
          Object.fromEntries(langsIn.map((l) => [l, bank.scale.labels[l][v - 1]])),
        );
      }
    }

    // 5. 직무 클러스터를 직무분야 아래 붙인다 — 결과지가 분야에서 직무로 내려간다.
    //    고교판은 직무가 아니라 전공으로 내려가므로 이 단계가 없다.
    const links: Record<string, string[]> = bank.major !== "ME" ? {} : {
      DESIGN_DEV: ["ME.MECH_DESIGN"],
      MFG_PROD: ["ME.MFG_ENG", "ME.QUALITY"],
      ENERGY_PLANT: [],
      AUTO_AERO: ["ME.AUTO_RD", "ME.AEROSPACE"],
      ROBOT_AUTO: ["ME.ROBOT_AUTO", "ME.SEMI_EQ"],
      IT_DATA: ["ME.CAE"],
      CONSTR_FACIL: [],
      RND_EDU: ["ME.CAE", "ME.AEROSPACE"],
      BIO_HEALTH: [],
      PUBLIC_ETC: [],
    };
    await q(
      `DELETE FROM job_cluster_areas WHERE job_id IN (SELECT id FROM job_clusters WHERE code LIKE 'ME.%')`,
    );
    for (const [area, jobs] of Object.entries(links)) {
      for (const code of jobs) {
        const job = await q1<{ id: string }>(`SELECT id FROM job_clusters WHERE code = $1`, [code]);
        if (!job) throw new Error(`job_clusters 에 ${code} 가 없습니다`);
        await q(
          `INSERT INTO job_cluster_areas (job_id, area_code, share) VALUES ($1, $2, $3)
           ON CONFLICT (job_id, area_code) DO UPDATE SET share = EXCLUDED.share`,
          [job.id, area, 1 / jobs.length],
        );
      }
    }

    console.log(
      `검사지 ${bank.instrumentKey} v${bank.version} · 트랙 ${track} · ` +
        `언어 ${langsIn.join("/")} (instrument_id=${instrumentId}) 적재 완료`,
    );
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
