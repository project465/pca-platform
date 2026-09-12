/**
 * 응시 — 좌석 하나를 실제 검사 한 번으로 바꾼다.
 *
 * 좌석은 두 경로로 생긴다.
 *   B2B  학과가 계약하고 회차를 열면 seats.contract_id 가 찬다.
 *   B2C  개인이 결제하면 seats.order_id 가 찬다.
 * 어느 쪽이든 좌석 하나에 응시 하나다. 그래서 이 파일은 좌석만 본다.
 *
 * 브라우저에 응답을 쌓지 않는다. 한 문항 고를 때마다 서버로 간다.
 * 시험 도중 노트북이 꺼져도 다음 문항부터 이어진다.
 */
import { query, queryOne, tx } from "./db";

export type Question = {
  id: string;
  orderNo: number;
  stem: string;
  itemKind: string;
  areaCode: string | null;
  options: { id: string; orderNo: number; label: string }[];
  chosenOptionId: string | null;
};

export type AttemptView = {
  id: string;
  status: string;
  total: number;
  answered: number;
  /** 아직 답하지 않은 첫 문항 번호. 다 찼으면 마지막 번호. */
  resumeOrderNo: number;
  instrumentId: string;
};

/** 한 화면에 올리는 문항 수. 250문항을 한 장에 쏟으면 아무도 끝내지 않는다. */
export const PAGE_SIZE = 10;

export async function findAttempt(attemptId: string, userId: string): Promise<AttemptView | null> {
  return queryOne<AttemptView>(
    `SELECT a.id, a.status,
            ts.instrument_id AS "instrumentId",
            (SELECT count(*) FROM questions q WHERE q.instrument_id = ts.instrument_id)::int AS total,
            (SELECT count(*) FROM responses r WHERE r.attempt_id = a.id)::int AS answered,
            -- 250번을 먼저 찍고 나간 학생을 26쪽으로 돌려보내면 안 된다.
            -- 이어보기는 빈 칸이 처음 나오는 곳이다.
            COALESCE((SELECT min(q.order_no) FROM questions q
                       WHERE q.instrument_id = ts.instrument_id
                         AND NOT EXISTS (SELECT 1 FROM responses r
                                          WHERE r.attempt_id = a.id AND r.question_id = q.id)),
                     a.last_order_no)::int AS "resumeOrderNo"
       FROM attempts a
       JOIN test_sessions ts ON ts.id = a.session_id
      WHERE a.id = $1 AND a.user_id = $2`,
    [attemptId, userId],
  );
}

/** 이 사람이 지금 볼 수 있는 응시. 없으면 null — 결제나 명단 등록이 먼저다. */
export async function currentAttempt(userId: string): Promise<AttemptView | null> {
  const row = await queryOne<{ id: string }>(
    `SELECT a.id FROM attempts a
      WHERE a.user_id = $1 AND a.status <> 'scored'
      ORDER BY a.id DESC LIMIT 1`,
    [userId],
  );
  return row ? findAttempt(row.id, userId) : null;
}

/**
 * 쓰지 않은 좌석이 있으면 응시를 연다. 이미 열려 있으면 그것을 준다.
 * 개인 결제 좌석이면 그 주문에 묶인 1인용 회차를 만들어 붙인다.
 */
export async function openAttempt(userId: string, instrumentId?: string): Promise<AttemptView | null> {
  const existing = await currentAttempt(userId);
  if (existing) return existing;

  const seat = await queryOne<{ id: string; order_id: string | null; contract_id: string | null }>(
    `SELECT s.id, s.order_id, s.contract_id
       FROM seats s
      WHERE s.user_id = $1
        AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.seat_id = s.id)
      ORDER BY s.id LIMIT 1`,
    [userId],
  );
  if (!seat) return null;

  /**
   * 어떤 검사지를 푸는가.
   *
   * 산 상품이 정한다. 예전에는 id 가 가장 큰 검사지를 집었는데, 고교판을
   * 올리는 순간 29,000원을 내고 대학판을 산 사람이 고교 문항을 받게 된다.
   * 상품에 붙은 트랙(products.track_code)이 검사지를 가리키고, 트랙이
   * 없으면 대학판으로 떨어진다 — 기존 주문이 그렇다.
   */
  const inst = instrumentId
    ? await queryOne<{ id: string }>(`SELECT id FROM instruments WHERE id = $1`, [instrumentId])
    : await queryOne<{ id: string }>(
        `SELECT i.id
           FROM instruments i
          WHERE i.status = 'published'
            AND i.track_code = COALESCE(
                  (SELECT p.track_code FROM seats s
                     JOIN orders o ON o.id = s.order_id
                     JOIN products p ON p.code = o.product_code
                    WHERE s.id = $1),
                  'UNIV_LOW')
          ORDER BY i.id DESC LIMIT 1`,
        [seat.id],
      );
  if (!inst) throw new Error("이 상품에 맞는 공개된 검사지가 없습니다");

  const attemptId = await tx(async (c) => {
    let sessionId: string;
    if (seat.order_id) {
      // 개인 결제 — 주문 하나당 1인용 회차 하나. 유니크 인덱스가 중복을 막는다.
      const found = await c.query<{ id: string }>(
        `SELECT id FROM test_sessions WHERE kind = 'solo' AND order_id = $1`,
        [seat.order_id],
      );
      if (found.rows[0]) sessionId = found.rows[0].id;
      else {
        const made = await c.query<{ id: string }>(
          `INSERT INTO test_sessions
             (org_id, contract_id, order_id, kind, instrument_id, name, opens_at, closes_at,
              release_mode, released_at)
           VALUES (NULL, NULL, $1, 'solo', $2, $3, now(), now() + interval '180 days',
                   'instant', now())
           RETURNING id`,
          [seat.order_id, inst.id, `개인 응시 #${seat.order_id}`],
        );
        sessionId = made.rows[0].id;
      }
    } else {
      const found = await c.query<{ id: string }>(
        `SELECT ts.id FROM test_sessions ts
           JOIN seats s ON s.contract_id = ts.contract_id
          WHERE s.id = $1 AND ts.instrument_id = $2
          ORDER BY ts.id DESC LIMIT 1`,
        [seat.id, inst.id],
      );
      if (!found.rows[0]) throw new Error("이 좌석에 열린 회차가 없습니다");
      sessionId = found.rows[0].id;
    }

    const a = await c.query<{ id: string }>(
      `INSERT INTO attempts (session_id, user_id, seat_id, status, started_at)
       VALUES ($1, $2, $3, 'in_progress', now())
       ON CONFLICT (session_id, user_id) DO UPDATE SET seat_id = EXCLUDED.seat_id
       RETURNING id`,
      [sessionId, userId, seat.id],
    );
    return a.rows[0].id;
  });

  return findAttempt(attemptId, userId);
}

/** 문항 한 쪽. lang 은 translations 에서 골라 온다. */
export async function questionPage(
  attempt: AttemptView,
  page: number,
  lang = "ko",
): Promise<Question[]> {
  const rows = await query<{
    id: string;
    order_no: number;
    stem: string | null;
    item_kind: string;
    area_code: string | null;
    chosen: string | null;
  }>(
    `SELECT q.id, q.order_no, t.value AS stem, q.item_kind, q.area_code,
            r.option_id AS chosen
       FROM questions q
       LEFT JOIN translations t
              ON t.table_name = 'questions' AND t.row_id = q.id
             AND t.lang = $3 AND t.field = 'stem'
       LEFT JOIN responses r ON r.attempt_id = $4 AND r.question_id = q.id
      WHERE q.instrument_id = $1
        AND q.order_no > $2 AND q.order_no <= $2 + $5
      ORDER BY q.order_no`,
    [attempt.instrumentId, (page - 1) * PAGE_SIZE, lang, attempt.id, PAGE_SIZE],
  );
  if (!rows.length) return [];

  const opts = await query<{
    question_id: string;
    id: string;
    order_no: number;
    label: string | null;
  }>(
    `SELECT o.question_id, o.id, o.order_no, t.value AS label
       FROM question_options o
       LEFT JOIN translations t
              ON t.table_name = 'question_options' AND t.row_id = o.id
             AND t.lang = $2 AND t.field = 'label'
      WHERE o.question_id = ANY($1::bigint[])
      ORDER BY o.question_id, o.order_no`,
    [rows.map((r) => r.id), lang],
  );

  return rows.map((r) => ({
    id: r.id,
    orderNo: r.order_no,
    stem: r.stem ?? "(문항 없음)",
    itemKind: r.item_kind,
    areaCode: r.area_code,
    chosenOptionId: r.chosen,
    options: opts
      .filter((o) => o.question_id === r.id)
      .map((o) => ({ id: o.id, orderNo: o.order_no, label: o.label ?? String(o.order_no) })),
  }));
}

/** 문항 하나 저장. 고쳐 답하면 덮어쓴다. 소요 시간도 같이 받는다. */
export async function saveResponse(
  attemptId: string,
  userId: string,
  questionId: string,
  optionId: string,
  elapsedMs: number | null,
): Promise<{ answered: number }> {
  const ok = await queryOne<{ id: string }>(
    `SELECT a.id FROM attempts a
       JOIN test_sessions ts ON ts.id = a.session_id
       JOIN questions q ON q.id = $3 AND q.instrument_id = ts.instrument_id
       JOIN question_options o ON o.id = $4 AND o.question_id = q.id
      WHERE a.id = $1 AND a.user_id = $2 AND a.status IN ('ready', 'in_progress')`,
    [attemptId, userId, questionId, optionId],
  );
  if (!ok) throw new Error("저장할 수 없는 응답입니다");

  await query(
    `INSERT INTO responses (attempt_id, question_id, option_id, elapsed_ms)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (attempt_id, question_id)
     DO UPDATE SET option_id = EXCLUDED.option_id, elapsed_ms = EXCLUDED.elapsed_ms,
                   answered_at = now()`,
    [attemptId, questionId, optionId, elapsedMs],
  );
  await query(
    `UPDATE attempts
        SET status = 'in_progress',
            started_at = COALESCE(started_at, now()),
            last_order_no = GREATEST(last_order_no, (SELECT order_no FROM questions WHERE id = $2))
      WHERE id = $1`,
    [attemptId, questionId],
  );

  const n = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM responses WHERE attempt_id = $1`,
    [attemptId],
  );
  return { answered: n!.n };
}

/** 빠진 문항이 있으면 그 번호를 돌려준다. 다 찼으면 제출 상태로 넘긴다. */
export async function submitAttempt(
  attemptId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; missing: number[] }> {
  const attempt = await findAttempt(attemptId, userId);
  if (!attempt) throw new Error("응시를 찾을 수 없습니다");

  const missing = await query<{ order_no: number }>(
    `SELECT q.order_no FROM questions q
      WHERE q.instrument_id = $1
        AND NOT EXISTS (SELECT 1 FROM responses r WHERE r.attempt_id = $2 AND r.question_id = q.id)
      ORDER BY q.order_no LIMIT 50`,
    [attempt.instrumentId, attemptId],
  );
  if (missing.length) return { ok: false, missing: missing.map((m) => m.order_no) };

  await query(
    `UPDATE attempts SET status = 'submitted', submitted_at = now()
      WHERE id = $1 AND status <> 'scored'`,
    [attemptId],
  );
  return { ok: true };
}
