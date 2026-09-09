import { query, queryOne, tx } from "@/lib/db";

/**
 * 응시.
 *
 * 문항 텍스트는 컬럼이 아니라 translations 에 있으므로(설계 원칙 2) 화면에
 * 내보낼 때 붙여서 읽는다. 요청한 언어가 없으면 ko 로 떨어진다 — 화면에
 * 빈 칸이 뜨는 것보다 다른 언어라도 보이는 편이 낫다.
 */

export type ExamOption = { id: string; orderNo: number; label: string };
export type ExamQuestion = {
  id: string;
  orderNo: number;
  answerType: string;
  text: string;
  options: ExamOption[];
};

export type Attempt = {
  id: string;
  sessionId: string;
  userId: string;
  status: string;
  lastOrderNo: number;
  instrumentId: string;
  sessionName: string;
  orgId: string;
  closesAt: string;
  submittedAt: string | null;
};

/** 이 학생이 지금 응시할 수 있는 회차. 소속과 기간으로 거른다 */
export async function openSessionsFor(userId: string) {
  return query<{
    id: string; name: string; org_id: string; closes_at: string; attempt_id: string | null;
    status: string | null; last_order_no: string | null; total: string;
  }>(
    `SELECT s.id, s.name, s.org_id::text AS org_id,
            to_char(s.closes_at, 'YYYY-MM-DD') AS closes_at,
            a.id::text AS attempt_id, a.status,
            a.last_order_no::text AS last_order_no,
            (SELECT count(*) FROM questions q WHERE q.instrument_id = s.instrument_id)::text AS total
       FROM test_sessions s
       JOIN memberships m ON m.org_id = s.org_id AND m.user_id = $1 AND m.role = 'student'
       LEFT JOIN attempts a ON a.session_id = s.id AND a.user_id = $1
      WHERE s.opens_at <= now() AND s.closes_at >= now()
      ORDER BY s.closes_at`,
    [userId],
  );
}

/**
 * 응시를 시작하거나 이어간다.
 *
 * 응시권은 여기서 소진된다 — 계약 좌석의 consumed_at 을 채운다. 학생이
 * 링크로 등록할 때 좌석을 잡아 두었고(user_id), 실제로 검사를 시작한
 * 시점이 소진 기준이다.
 */
export async function startAttempt(userId: string, sessionId: string): Promise<string> {
  return tx(async (c) => {
    const s = await c.query<{ id: string; org_id: string; contract_id: string }>(
      `SELECT s.id, s.org_id, s.contract_id
         FROM test_sessions s
         JOIN memberships m ON m.org_id = s.org_id AND m.user_id = $1 AND m.role = 'student'
        WHERE s.id = $2 AND s.opens_at <= now() AND s.closes_at >= now()`,
      [userId, sessionId],
    );
    if (s.rowCount === 0) throw new Error("NOT_ELIGIBLE");

    const existing = await c.query<{ id: string }>(
      `SELECT id FROM attempts WHERE session_id = $1 AND user_id = $2`,
      [sessionId, userId],
    );
    if (existing.rowCount) return existing.rows[0].id;

    /* 이 학생에게 배정된 좌석. 등록할 때 잡아 둔 것을 그대로 쓴다 */
    const seat = await c.query<{ id: string }>(
      `SELECT s.id FROM seats s
        WHERE s.contract_id = $1 AND s.user_id = $2 AND s.consumed_at IS NULL
        ORDER BY s.id FOR UPDATE SKIP LOCKED LIMIT 1`,
      [s.rows[0].contract_id, userId],
    );
    const seatId = seat.rowCount ? seat.rows[0].id : null;
    if (seatId) {
      await c.query(`UPDATE seats SET consumed_at = now() WHERE id = $1`, [seatId]);
    }

    const a = await c.query<{ id: string }>(
      `INSERT INTO attempts (session_id, user_id, seat_id, status, started_at)
       VALUES ($1, $2, $3, 'in_progress', now()) RETURNING id`,
      [sessionId, userId, seatId],
    );
    return a.rows[0].id;
  });
}

/** 이 사람의 응시인지 함께 확인한다. 남의 응시를 열어볼 수 없다 */
export async function attemptOf(attemptId: string, userId: string): Promise<Attempt | null> {
  const row = await queryOne<{
    id: string; session_id: string; user_id: string; status: string; last_order_no: number;
    instrument_id: string; name: string; org_id: string; closes_at: string; submitted_at: string | null;
  }>(
    `SELECT a.id::text, a.session_id::text, a.user_id::text, a.status, a.last_order_no,
            s.instrument_id::text, s.name, s.org_id::text,
            to_char(s.closes_at, 'YYYY-MM-DD') AS closes_at,
            to_char(a.submitted_at, 'YYYY-MM-DD HH24:MI') AS submitted_at
       FROM attempts a JOIN test_sessions s ON s.id = a.session_id
      WHERE a.id = $1 AND a.user_id = $2`,
    [attemptId, userId],
  );
  if (!row) return null;
  return {
    id: row.id, sessionId: row.session_id, userId: row.user_id, status: row.status,
    lastOrderNo: Number(row.last_order_no), instrumentId: row.instrument_id,
    sessionName: row.name, orgId: row.org_id, closesAt: row.closes_at,
    submittedAt: row.submitted_at,
  };
}

export async function questionsOf(instrumentId: string, lang: string): Promise<ExamQuestion[]> {
  const qs = await query<{ id: string; order_no: number; answer_type: string; text: string | null }>(
    `SELECT q.id::text, q.order_no, q.answer_type,
            COALESCE(t.value, tk.value) AS text
       FROM questions q
       LEFT JOIN translations t
         ON t.table_name = 'questions' AND t.row_id = q.id AND t.field = 'text' AND t.lang = $2
       LEFT JOIN translations tk
         ON tk.table_name = 'questions' AND tk.row_id = q.id AND tk.field = 'text' AND tk.lang = 'ko'
      WHERE q.instrument_id = $1
      ORDER BY q.order_no`,
    [instrumentId, lang],
  );
  if (qs.length === 0) return [];

  const opts = await query<{ question_id: string; id: string; order_no: number; label: string | null }>(
    `SELECT o.question_id::text, o.id::text, o.order_no,
            COALESCE(t.value, tk.value) AS label
       FROM question_options o
       JOIN questions q ON q.id = o.question_id
       LEFT JOIN translations t
         ON t.table_name = 'question_options' AND t.row_id = o.id AND t.field = 'label' AND t.lang = $2
       LEFT JOIN translations tk
         ON tk.table_name = 'question_options' AND tk.row_id = o.id AND tk.field = 'label' AND tk.lang = 'ko'
      WHERE q.instrument_id = $1
      ORDER BY o.question_id, o.order_no`,
    [instrumentId, lang],
  );

  const byQ = new Map<string, ExamOption[]>();
  for (const o of opts) {
    if (!byQ.has(o.question_id)) byQ.set(o.question_id, []);
    byQ.get(o.question_id)!.push({ id: o.id, orderNo: o.order_no, label: o.label ?? "" });
  }

  return qs.map((q) => ({
    id: q.id, orderNo: q.order_no, answerType: q.answer_type,
    text: q.text ?? "", options: byQ.get(q.id) ?? [],
  }));
}

/** 지금까지 고른 것. 문항 id → 선택지 id */
export async function answersOf(attemptId: string): Promise<Record<string, string>> {
  const rows = await query<{ question_id: string; option_id: string | null }>(
    `SELECT question_id::text, option_id::text FROM responses WHERE attempt_id = $1`,
    [attemptId],
  );
  const out: Record<string, string> = {};
  for (const r of rows) if (r.option_id) out[r.question_id] = r.option_id;
  return out;
}
