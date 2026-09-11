"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import type { Question } from "@/lib/attempts";
import { answer, submit } from "./actions";

/**
 * 응시 화면.
 *
 * 보기를 누르면 화면은 곧바로 칠해지고 저장은 뒤에서 돈다. 250문항을 서버 왕복
 * 기다리며 찍게 하면 아무도 끝내지 않는다. 대신 저장이 실패하면 그 문항만
 * 빨갛게 되돌려 다시 누르게 한다 — 조용히 삼키지 않는다.
 */
export default function TestRunner({
  attemptId,
  page,
  pages,
  total,
  answered,
  questions,
  lang,
}: {
  attemptId: string;
  page: number;
  pages: number;
  total: number;
  answered: number;
  questions: Question[];
  lang: string;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<Record<string, string>>(
    Object.fromEntries(
      questions.filter((q) => q.chosenOptionId).map((q) => [q.id, q.chosenOptionId as string]),
    ),
  );
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [count, setCount] = useState(answered);
  const [missing, setMissing] = useState<number[] | null>(null);
  const [saving, startSaving] = useTransition();
  const shownAt = useRef<Record<string, number>>({});

  const pick = useCallback(
    (q: Question, optionId: string) => {
      const before = picked[q.id];
      setPicked((s) => ({ ...s, [q.id]: optionId }));
      setFailed((s) => ({ ...s, [q.id]: false }));
      if (!before) setCount((c) => c + 1);

      const first = shownAt.current[q.id] ?? (shownAt.current[q.id] = Date.now());
      const elapsed = Math.min(600_000, Date.now() - first);

      startSaving(async () => {
        try {
          const res = await answer(attemptId, q.id, optionId, elapsed);
          setCount(res.answered);
        } catch {
          setPicked((s) => {
            const next = { ...s };
            if (before) next[q.id] = before;
            else delete next[q.id];
            return next;
          });
          if (!before) setCount((c) => Math.max(0, c - 1));
          setFailed((s) => ({ ...s, [q.id]: true }));
        }
      });
    },
    [attemptId, picked],
  );

  const pageDone = questions.every((q) => picked[q.id]);
  const go = (n: number) => router.push(`/test/${attemptId}?p=${n}&lang=${lang}`);

  const onSubmit = () => {
    startSaving(async () => {
      const res = await submit(attemptId);
      if (res?.missing) {
        setMissing(res.missing);
        go(Math.floor((res.missing[0] - 1) / 10) + 1);
      }
    });
  };

  const pct = Math.round((count / total) * 100);

  return (
    <div className="test-shell">
      <header className="test-bar">
        <div className="test-bar-in">
          <span className="brand">METRI</span>
          <div className="progress" aria-label={`${total}문항 중 ${count}문항 완료`}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="progress-num">
            {count} / {total}
          </span>
        </div>
      </header>

      <main className="test-main">
        {missing && (
          <p className="notice warn" role="alert">
            아직 답하지 않은 문항이 {missing.length}개 있습니다. {missing.slice(0, 8).join(", ")}
            {missing.length > 8 ? " …" : ""}번을 확인해 주세요.
          </p>
        )}

        <ol className="qlist">
          {questions.map((q) => (
            <li
              key={q.id}
              className={`qcard${picked[q.id] ? " done" : ""}${failed[q.id] ? " failed" : ""}`}
              onPointerEnter={() => {
                shownAt.current[q.id] ??= Date.now();
              }}
            >
              <div className="qhead">
                <span className="qno">{q.orderNo}</span>
                <p className="qstem">{q.stem}</p>
              </div>
              <div className="qopts" role="radiogroup" aria-label={`문항 ${q.orderNo}`}>
                {q.options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={picked[q.id] === o.id}
                    className={`qopt${picked[q.id] === o.id ? " on" : ""}`}
                    onClick={() => pick(q, o.id)}
                  >
                    <span className="qopt-dot" aria-hidden />
                    <span className="qopt-label">{o.label}</span>
                  </button>
                ))}
              </div>
              {failed[q.id] && (
                <p className="qerr" role="alert">
                  저장되지 않았습니다. 다시 눌러 주세요.
                </p>
              )}
            </li>
          ))}
        </ol>

        <nav className="test-nav">
          <button type="button" className="act" onClick={() => go(page - 1)} disabled={page <= 1}>
            이전
          </button>
          <span className="test-nav-num">
            {page} / {pages} 쪽
          </span>
          {page < pages ? (
            <button
              type="button"
              className="act solid"
              onClick={() => go(page + 1)}
              disabled={!pageDone}
            >
              {pageDone ? "다음" : "이 쪽을 모두 답해 주세요"}
            </button>
          ) : (
            <button type="button" className="act solid" onClick={onSubmit} disabled={saving}>
              {saving ? "채점 중…" : "제출하고 결과 보기"}
            </button>
          )}
        </nav>
      </main>
    </div>
  );
}
