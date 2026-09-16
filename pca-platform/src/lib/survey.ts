import { query, queryOne } from "./db";

/**
 * 지역 정주와 진단 만족도 — 점수를 만들지 않는 문항.
 *
 * 제안서가 의뢰 기관에 약속한 성과지표다(RISE·지자체 보고용). 검사
 * 문항과 **표를 나눠 둔 것이 핵심**이다 — 채점(`scoring.ts`)은 이 표를
 * 아예 읽지 않는다. 섞이면 정주 의향이 직무 적합도를 흔든다.
 *
 * **응시 전과 후에 같은 문장을 묻는다.** 그래야 "이 진단을 보고
 * 달라졌는가" 를 뺄셈으로 말할 수 있다. 한 번만 물으면 현황 조사가 되고,
 * 현황 조사는 사업 성과가 아니다.
 */

export type SurveyPhase = "before" | "after";

/**
 * 이 응시에 부가 문항을 물어야 하는가.
 *
 * **의뢰 기관이 있을 때만 묻는다.** 정주 문항은 "우리 지역" 을 묻는데,
 * 개인이 혼자 결제해 본 응시에는 그 지역이 없다. 어느 지역인지 모르는
 * 사람에게 물으면 답이 나와도 성과지표로 못 쓰고, 묻는 것 자체가
 * 이상한 화면이 된다.
 */
export async function surveyApplies(attemptId: string): Promise<boolean> {
  const r = await queryOne<{ kind: string }>(
    `SELECT ts.kind FROM attempts a JOIN test_sessions ts ON ts.id = a.session_id
      WHERE a.id = $1`,
    [attemptId],
  );
  return r?.kind === "org";
}

export type SurveyItem = {
  id: string;
  code: string;
  kind: "residency" | "awareness" | "interest" | "satisfaction";
  orderNo: number;
  text: string;
};

/** 그 시점에 물을 문항. 순서는 표가 정한다. */
export async function surveyItems(phase: SurveyPhase, lang = "ko"): Promise<SurveyItem[]> {
  return query<SurveyItem>(
    `SELECT s.id, s.code, s.kind, s.order_no AS "orderNo",
            COALESCE((SELECT value FROM translations
                       WHERE table_name = 'survey_items' AND row_id = s.id
                         AND lang = $2 AND field = 'text'), s.code) AS text
       FROM survey_items s
      WHERE s.phase = $1 AND s.active
      ORDER BY s.order_no`,
    [phase, lang],
  );
}

/**
 * 한 문항 답을 적는다. 응시와 같은 규칙으로 **누를 때마다 즉시** 저장한다.
 * 남의 응시에는 적을 수 없다 — attempt 주인을 함께 본다.
 */
export async function saveSurvey(
  attemptId: string,
  userId: string,
  itemId: string,
  value: number,
): Promise<boolean> {
  if (!Number.isInteger(value) || value < 1 || value > 5) return false;
  const mine = await queryOne<{ id: string }>(
    `SELECT id FROM attempts WHERE id = $1 AND user_id = $2`, [attemptId, userId]);
  if (!mine) return false;
  await query(
    `INSERT INTO survey_responses (attempt_id, item_id, value)
     VALUES ($1, $2, $3)
     ON CONFLICT (attempt_id, item_id)
       DO UPDATE SET value = EXCLUDED.value, answered_at = now()`,
    [attemptId, itemId, value],
  );
  return true;
}

/** 그 시점 문항을 다 답했는가. 화면이 "다음" 을 열지 말지 본다. */
export async function surveyDone(attemptId: string, phase: SurveyPhase): Promise<boolean> {
  const r = await queryOne<{ left: number }>(
    `SELECT count(*)::int AS left
       FROM survey_items s
      WHERE s.phase = $1 AND s.active
        AND NOT EXISTS (SELECT 1 FROM survey_responses r
                         WHERE r.attempt_id = $2 AND r.item_id = s.id)`,
    [phase, attemptId],
  );
  return (r?.left ?? 1) === 0;
}

/** 5명 미만 칸은 숫자를 내지 않는다. 집계가 개인 식별이 되는 순간 이 제품은 못 쓴다. */
export const MIN_CELL = 5;

export type ShiftRow = {
  pairKey: string;
  before: number | null;
  after: number | null;
  delta: number | null;
  n: number;
};

/**
 * 응시 전·후 변화. **짝이 맞는 응답만 센다** — 앞만 답하고 나간 사람을
 * 한쪽에 넣으면 두 평균이 다른 사람들의 평균이 되어 뺄셈이 거짓말을 한다.
 */
export async function residencyShift(sessionId: string): Promise<ShiftRow[]> {
  const rows = await query<{ pair_key: string; before: string; after: string; n: number }>(
    `WITH paired AS (
       SELECT b.pair_key,
              rb.value AS before_v,
              ra.value AS after_v
         FROM survey_items b
         JOIN survey_items a
           ON a.pair_key = b.pair_key AND a.phase = 'after'
         JOIN survey_responses rb ON rb.item_id = b.id
         JOIN survey_responses ra ON ra.item_id = a.id AND ra.attempt_id = rb.attempt_id
         JOIN attempts at ON at.id = rb.attempt_id
        WHERE b.phase = 'before' AND b.pair_key IS NOT NULL
          AND at.session_id = $1
     )
     SELECT pair_key,
            round(avg(before_v)::numeric, 1)::text AS before,
            round(avg(after_v)::numeric, 1)::text  AS after,
            count(*)::int AS n
       FROM paired GROUP BY pair_key ORDER BY pair_key`,
    [sessionId],
  );
  return rows.map((r) => {
    if (r.n < MIN_CELL) {
      return { pairKey: r.pair_key, before: null, after: null, delta: null, n: r.n };
    }
    const before = Number(r.before), after = Number(r.after);
    return {
      pairKey: r.pair_key,
      before, after,
      delta: Math.round((after - before) * 10) / 10,
      n: r.n,
    };
  });
}

export type SatisfactionRow = { code: string; text: string; avg: number | null; n: number };

/** 만족도 네 문항. 한 번만 묻기 때문에 뺄셈이 없다. */
export async function satisfaction(sessionId: string, lang = "ko"): Promise<SatisfactionRow[]> {
  const rows = await query<{ code: string; text: string; avg: string; n: number }>(
    `SELECT s.code,
            COALESCE((SELECT value FROM translations
                       WHERE table_name = 'survey_items' AND row_id = s.id
                         AND lang = $2 AND field = 'text'), s.code) AS text,
            round(avg(r.value)::numeric, 1)::text AS avg,
            count(*)::int AS n
       FROM survey_items s
       JOIN survey_responses r ON r.item_id = s.id
       JOIN attempts a ON a.id = r.attempt_id
      WHERE s.kind = 'satisfaction' AND a.session_id = $1
      GROUP BY s.id, s.code ORDER BY s.order_no`,
    [sessionId, lang],
  );
  return rows.map((r) => ({
    code: r.code, text: r.text, n: r.n,
    avg: r.n < MIN_CELL ? null : Number(r.avg),
  }));
}
