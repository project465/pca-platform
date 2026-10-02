"use client";

import { useState, useTransition } from "react";
import { answerAction, submitAction } from "./actions";
import type { ExamQuestion } from "@/lib/exam";

/**
 * 응시 화면. mockups/01_test_screen.html 의 확정된 시안을 따른다.
 *
 * 고르면 곧바로 서버에 저장한다. 저장이 끝나기 전에도 화면은 먼저 움직이고,
 * 실패하면 그 문항만 되돌린다 — 열두 문항을 답하는 동안 매번 기다리게 하면
 * 검사를 끝까지 보지 않는다.
 */
export default function Exam({
  attemptId,
  questions,
  initialAnswers,
  startAt,
  sessionName,
  studentName,
}: {
  attemptId: string;
  questions: ExamQuestion[];
  initialAnswers: Record<string, string>;
  startAt: number;
  sessionName: string;
  studentName: string;
}) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [i, setI] = useState(startAt);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const q = questions[i];
  const total = questions.length;
  const answeredCount = Object.keys(answers).length;
  const picked = answers[q.id];

  function choose(optionId: string) {
    const before = answers;
    setAnswers({ ...answers, [q.id]: optionId });
    setError(null);

    answerAction(attemptId, q.id, optionId).then(
      () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 1400);
        if (i < total - 1) setTimeout(() => setI((n) => Math.min(n + 1, total - 1)), 220);
      },
      () => {
        // 저장이 안 됐으면 고른 것을 지운다. 저장된 척하면 안 된다
        setAnswers(before);
        setError("응답을 저장하지 못했습니다. 다시 눌러 주세요.");
      },
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await submitAction(attemptId);
      if (r?.error) setError(r.error);
    });
  }

  const last = i === total - 1;

  return (
    <>
      <div className="bar">
        <div className="row">
          <span className="who">{sessionName} · {studentName}</span>
          <span className="count">{i + 1}<em> / {total}</em></span>
        </div>
        <div className="rail"><i style={{ width: `${(i / total) * 100}%` }} /></div>
        <div className={saved ? "saved on" : "saved"}>응답이 저장되었습니다</div>
      </div>

      <div className="card">
        <div className="qno">문항 {q.orderNo}</div>
        <p className="qtext">{q.text}</p>

        {error ? <p className="notice error" role="alert" style={{ marginBottom: 16 }}>{error}</p> : null}

        <div className="opts">
          {q.options.map((o) => (
            <button
              key={o.id}
              type="button"
              className="opt"
              aria-pressed={picked === o.id}
              onClick={() => choose(o.id)}
            >
              <span className="dot" />
              <span className="txt">{o.label}</span>
            </button>
          ))}
        </div>

        <div className="nav">
          <button className="act" disabled={i === 0} onClick={() => setI(i - 1)}>이전</button>
          <span className="right">
            {last ? null : (
              <button className="act" onClick={() => setI(i + 1)}>나중에 답하기</button>
            )}
            {last ? (
              <button
                className="act solid"
                disabled={pending || answeredCount < total}
                onClick={submit}
                title={answeredCount < total ? `아직 ${total - answeredCount}개 남았습니다` : undefined}
              >
                {pending ? "제출 중…" : "제출하기"}
              </button>
            ) : (
              <button className="act solid" disabled={!picked} onClick={() => setI(i + 1)}>다음</button>
            )}
          </span>
        </div>
      </div>

      {last && answeredCount < total ? (
        <p className="hint" style={{ marginTop: 14 }}>
          아직 답하지 않은 문항이 {total - answeredCount}개 있습니다. 이전으로 돌아가 마저 고르시면 제출할 수 있습니다.
        </p>
      ) : null}
    </>
  );
}
