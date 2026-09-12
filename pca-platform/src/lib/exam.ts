import { query, queryOne, tx } from "@/lib/db";
import { namesOf } from "@/lib/i18n";

/**
 * 응시. 화면은 `mockups/01_test_screen.html` 이 확정 시안이다.
 *
 * 지켜야 하는 것 (CLAUDE.md)
 *  - 문항마다 즉시 저장한다. 브라우저 저장소에 응답을 두지 않는다
 *  - 중간에 창을 닫아도 이어볼 수 있다 (attempts.last_order_no)
 *  - 고정 문항이다. 순서는 questions.order_no 로 정해져 있고 사람마다 같다
 *  - 응시 자격은 명단 기반이다. attempts 행이 없으면 들어올 수 없다
 *
 * 문항 본문은 컬럼이 아니라 translations 에 있다 (설계 원칙 2).
 *   questions        → field 'text'
 *   question_options → field 'label'
 */

export type ExamAccess =
  | { ok: true; attempt: ExamAttempt }
  | { ok: false; reason: ExamDenied; attempt: ExamAttempt | null };

export type ExamDenied =
  | "not_found"
  | "not_yours"
  | "not_open_yet"
  | "closed"
  | "no_questions";

export type ExamAttempt = {
  attempt_id: string;
  user_id: string;
  display_name: string;
  status: string;
  last_order_no: number;
  seat_id: string | null;
  submitted_at: string | null;
  session_id: string;
  session_name: string;
  instrument_id: string;
  opens_at: string;
  closes_at: string;
  release_mode: string;
  released_at: string | null;
  major_id: string;
  question_count: number;
  answered_count: number;
};

export async function loadAttempt(attemptId: string): Promise<ExamAttempt | null> {
  return queryOne<ExamAttempt>(
    `SELECT a.id AS attempt_id, a.user_id, u.display_name, a.status, a.last_order_no,
            a.seat_id, a.submitted_at::text,
            ts.id AS session_id, ts.name AS session_name, ts.instrument_id,
            ts.opens_at::text, ts.closes_at::text, ts.release_mode, ts.released_at::text,
            i.major_id,
            (SELECT count(*) FROM questions q WHERE q.instrument_id = ts.instrument_id)::int
              AS question_count,
            (SELECT count(*) FROM responses r
              WHERE r.attempt_id = a.id AND r.option_id IS NOT NULL)::int AS answered_count
       FROM attempts a
       JOIN users u          ON u.id = a.user_id
       JOIN test_sessions ts ON ts.id = a.session_id
       JOIN instruments i    ON i.id = ts.instrument_id
      WHERE a.id = $1`,
    [attemptId],
  );
}

/**
 * 들어올 수 있는지 본다. 거절하는 이유를 구분해 돌려주는 이유는,
 * "아직 시작 전"과 "이미 끝남"에 같은 화면을 보여줄 수 없기 때문이다.
 */
export async function checkAccess(attemptId: string, userId: string): Promise<ExamAccess> {
  const attempt = await loadAttempt(attemptId);
  if (!attempt) return { ok: false, reason: "not_found", attempt: null };
  if (attempt.user_id !== userId) return { ok: false, reason: "not_yours", attempt: null };

  // 제출이 끝난 응시는 완료 화면으로 간다. 기간과 무관하게 열람할 수 있어야 한다.
  if (attempt.status === "submitted" || attempt.status === "scored") {
    return { ok: true, attempt };
  }

  const now = Date.now();
  if (new Date(attempt.opens_at).getTime() > now) {
    return { ok: false, reason: "not_open_yet", attempt };
  }
  if (new Date(attempt.closes_at).getTime() < now) {
    return { ok: false, reason: "closed", attempt };
  }
  if (attempt.question_count === 0) {
    return { ok: false, reason: "no_questions", attempt };
  }
  return { ok: true, attempt };
}

export type ExamOption = { id: string; orderNo: number; label: string };
export type ExamQuestion = {
  id: string;
  orderNo: number;
  answerType: string;
  text: string;
  options: ExamOption[];
};

/**
 * 문항 전체를 한 번에 읽어 화면으로 내린다.
 *
 * 문항마다 서버를 다시 부르지 않는 이유: 문항 수가 수십 개라 한 번에 받아도
 * 가볍고, 무엇보다 이동이 즉각적이어야 한다. 저장만 서버로 간다.
 * 화면에 내리는 것은 문항과 선택지 라벨뿐이다 — 배점(score)은 내리지 않는다.
 * 응답이 점수에 어떻게 반영되는지 응시자가 보면 답이 흔들린다.
 */
export async function loadQuestions(
  instrumentId: string,
  lang: string,
): Promise<ExamQuestion[]> {
  const qs = await query<{ id: string; order_no: number; answer_type: string }>(
    `SELECT id, order_no, answer_type FROM questions
      WHERE instrument_id = $1 ORDER BY order_no`,
    [instrumentId],
  );
  if (qs.length === 0) return [];

  const opts = await query<{ id: string; question_id: string; order_no: number }>(
    `SELECT o.id, o.question_id, o.order_no
       FROM question_options o
       JOIN questions q ON q.id = o.question_id
      WHERE q.instrument_id = $1
      ORDER BY o.question_id, o.order_no`,
    [instrumentId],
  );

  const [qText, oLabel] = await Promise.all([
    namesOf("questions", qs.map((q) => q.id), lang, "text"),
    namesOf("question_options", opts.map((o) => o.id), lang, "label"),
  ]);

  const byQuestion = new Map<string, ExamOption[]>();
  for (const o of opts) {
    const list = byQuestion.get(o.question_id) ?? [];
    list.push({ id: o.id, orderNo: o.order_no, label: oLabel.get(o.id) ?? "" });
    byQuestion.set(o.question_id, list);
  }

  return qs.map((q) => ({
    id: q.id,
    orderNo: q.order_no,
    answerType: q.answer_type,
    text: qText.get(q.id) ?? "",
    options: byQuestion.get(q.id) ?? [],
  }));
}

/** 이미 답한 것. 화면을 열 때 한 번 읽어 그대로 표시한다. */
export async function loadResponses(attemptId: string): Promise<Record<string, string>> {
  const rows = await query<{ question_id: string; option_id: string | null }>(
    `SELECT question_id, option_id FROM responses WHERE attempt_id = $1`,
    [attemptId],
  );
  const out: Record<string, string> = {};
  for (const r of rows) if (r.option_id) out[r.question_id] = r.option_id;
  return out;
}

export class ExamError extends Error {}

/**
 * 응시 시작. 여기서 응시권이 소진된다 (seats.consumed_at — schema.sql 의 판정 기준).
 * 이미 시작한 응시를 다시 눌러도 시작 시각과 소진 시각은 처음 것을 지킨다.
 */
export async function startAttempt(attemptId: string, userId: string): Promise<void> {
  await tx(async (c) => {
    const rows = await c.query<{ seat_id: string | null }>(
      `UPDATE attempts
          SET status = CASE WHEN status = 'ready' THEN 'in_progress' ELSE status END,
              started_at = COALESCE(started_at, now())
        WHERE id = $1 AND user_id = $2 AND status IN ('ready', 'in_progress')
        RETURNING seat_id`,
      [attemptId, userId],
    );
    if (rows.rowCount === 0) throw new ExamError("시작할 수 없는 응시입니다.");

    const seatId = rows.rows[0].seat_id;
    if (seatId) {
      await c.query(
        `UPDATE seats SET consumed_at = COALESCE(consumed_at, now()) WHERE id = $1`,
        [seatId],
      );
    }
  });
}

/**
 * 응답 하나를 저장한다. 화면에서 선택할 때마다 불린다.
 *
 * 되돌아가 답을 바꾸는 것을 허용하므로 UPSERT 다. last_order_no 는 뒤로 가지
 * 않는다 — 이어보기 지점은 "가장 멀리 간 곳"이어야 하고, 앞 문항을 고치러
 * 돌아갔다고 그 지점이 당겨지면 다음에 열 때 이미 답한 곳부터 다시 보게 된다.
 */
export async function saveResponse(input: {
  attemptId: string;
  userId: string;
  questionId: string;
  optionId: string;
}): Promise<{ answered: number }> {
  return tx(async (c) => {
    // 이 응답이 이 응시의 문항이고, 그 선택지가 그 문항의 것인지 한 번에 확인한다.
    // 화면을 거쳐 오는 값이므로 짝이 맞는지 서버가 봐야 한다.
    const ok = await c.query<{ order_no: number }>(
      `SELECT q.order_no
         FROM attempts a
         JOIN test_sessions ts ON ts.id = a.session_id
         JOIN questions q      ON q.instrument_id = ts.instrument_id AND q.id = $3
         JOIN question_options o ON o.question_id = q.id AND o.id = $4
        WHERE a.id = $1 AND a.user_id = $2
          AND a.status IN ('ready', 'in_progress')
          AND ts.opens_at <= now() AND ts.closes_at >= now()`,
      [input.attemptId, input.userId, input.questionId, input.optionId],
    );
    if (ok.rowCount === 0) {
      throw new ExamError("저장할 수 없는 응답입니다. 화면을 새로 고쳐 주세요.");
    }
    const orderNo = ok.rows[0].order_no;

    await c.query(
      `INSERT INTO responses (attempt_id, question_id, option_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (attempt_id, question_id)
       DO UPDATE SET option_id = EXCLUDED.option_id, answered_at = now()`,
      [input.attemptId, input.questionId, input.optionId],
    );

    await c.query(
      `UPDATE attempts
          SET status = CASE WHEN status = 'ready' THEN 'in_progress' ELSE status END,
              started_at = COALESCE(started_at, now()),
              last_order_no = GREATEST(last_order_no, $2)
        WHERE id = $1`,
      [input.attemptId, orderNo],
    );

    const n = await c.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM responses
        WHERE attempt_id = $1 AND option_id IS NOT NULL`,
      [input.attemptId],
    );
    return { answered: Number(n.rows[0].n) };
  });
}

/**
 * 제출. 미응답이 하나라도 있으면 막는다 — 채점이 전 문항을 전제한다.
 * 조건부 UPDATE 라 두 번 눌러도 제출 시각이 덮이지 않는다.
 */
export async function submitAttempt(input: {
  attemptId: string;
  userId: string;
}): Promise<{ submittedAt: string }> {
  return tx(async (c) => {
    const missing = await c.query<{ n: string }>(
      `SELECT (
         (SELECT count(*) FROM questions q
            JOIN test_sessions ts ON ts.instrument_id = q.instrument_id
            JOIN attempts a ON a.session_id = ts.id
           WHERE a.id = $1)
         -
         (SELECT count(*) FROM responses r
           WHERE r.attempt_id = $1 AND r.option_id IS NOT NULL)
       )::text AS n`,
      [input.attemptId],
    );
    const left = Number(missing.rows[0].n);
    if (left > 0) throw new ExamError(`아직 답하지 않은 문항이 ${left}개 있습니다.`);

    const rows = await c.query<{ submitted_at: string }>(
      `UPDATE attempts
          SET status = 'submitted', submitted_at = now()
        WHERE id = $1 AND user_id = $2 AND status IN ('ready', 'in_progress')
        RETURNING submitted_at::text`,
      [input.attemptId, input.userId],
    );
    if (rows.rowCount === 0) throw new ExamError("이미 제출된 응시입니다.");

    return { submittedAt: rows.rows[0].submitted_at };
  });
}
