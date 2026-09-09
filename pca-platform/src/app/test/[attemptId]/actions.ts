"use server";

import { redirect } from "next/navigation";
import { tx } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { attemptOf } from "@/lib/exam";

/**
 * 문항 하나를 고를 때마다 즉시 저장한다.
 *
 * 브라우저에 모아 두었다가 마지막에 보내지 않는다 — 창을 닫거나 연결이
 * 끊겨도 응답이 남아 있어야 하기 때문이다(기술 스택 규칙). 같은 문항을
 * 다시 고르면 덮어쓴다.
 *
 * 선택지가 정말 그 문항의 것인지 확인한다. 화면에서 온 값이므로
 * 다른 문항의 선택지를 붙여 보낼 수 있다.
 */
export type AnswerResult = { ok: boolean; answered: number; total: number };

export async function answerAction(
  attemptId: string,
  questionId: string,
  optionId: string,
): Promise<AnswerResult> {
  const user = await requireRole(["student"]);
  const attempt = await attemptOf(attemptId, user.id);
  if (!attempt) throw new Error("응시를 찾을 수 없습니다.");
  if (attempt.status === "submitted" || attempt.status === "scored") {
    throw new Error("이미 제출된 응시입니다.");
  }

  return tx(async (c) => {
    const q = await c.query<{ order_no: number }>(
      `SELECT q.order_no
         FROM question_options o
         JOIN questions q ON q.id = o.question_id
        WHERE o.id = $1 AND q.id = $2 AND q.instrument_id = $3`,
      [optionId, questionId, attempt.instrumentId],
    );
    if (q.rowCount === 0) throw new Error("이 문항의 선택지가 아닙니다.");

    await c.query(
      `INSERT INTO responses (attempt_id, question_id, option_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (attempt_id, question_id)
       DO UPDATE SET option_id = EXCLUDED.option_id, answered_at = now()`,
      [attemptId, questionId, optionId],
    );

    /* 이어보기 지점. 뒤로 가서 고쳐도 뒤로 밀리지 않게 큰 값만 남긴다 */
    await c.query(
      `UPDATE attempts
          SET last_order_no = GREATEST(last_order_no, $2),
              status = CASE WHEN status = 'ready' THEN 'in_progress' ELSE status END
        WHERE id = $1`,
      [attemptId, q.rows[0].order_no],
    );

    const counted = await c.query<{ answered: string; total: string }>(
      `SELECT (SELECT count(*) FROM responses r WHERE r.attempt_id = $1)::text AS answered,
              (SELECT count(*) FROM questions q WHERE q.instrument_id = $2)::text AS total`,
      [attemptId, attempt.instrumentId],
    );
    return {
      ok: true,
      answered: Number(counted.rows[0].answered),
      total: Number(counted.rows[0].total),
    };
  });
}

/**
 * 제출.
 *
 * 빠뜨린 문항이 있으면 제출하지 않는다. 채점이 비어 있는 응답을 어떻게
 * 다룰지 아직 정해지지 않았으므로, 반쯤 답한 응시를 만들지 않는 편이 낫다.
 */
export async function submitAction(attemptId: string): Promise<{ error?: string }> {
  const user = await requireRole(["student"]);
  const attempt = await attemptOf(attemptId, user.id);
  if (!attempt) return { error: "응시를 찾을 수 없습니다." };
  if (attempt.status === "submitted" || attempt.status === "scored") {
    redirect(`/test/${attemptId}`);
  }

  const done = await tx(async (c) => {
    const counted = await c.query<{ answered: string; total: string }>(
      `SELECT (SELECT count(*) FROM responses r WHERE r.attempt_id = $1)::text AS answered,
              (SELECT count(*) FROM questions q WHERE q.instrument_id = $2)::text AS total`,
      [attemptId, attempt.instrumentId],
    );
    const answered = Number(counted.rows[0].answered);
    const total = Number(counted.rows[0].total);
    if (answered < total) return { short: total - answered };

    await c.query(
      `UPDATE attempts SET status = 'submitted', submitted_at = now()
        WHERE id = $1 AND status <> 'submitted'`,
      [attemptId],
    );
    return { short: 0 };
  });

  if (done.short > 0) return { error: `아직 답하지 않은 문항이 ${done.short}개 있습니다.` };
  redirect(`/test/${attemptId}`);
}
