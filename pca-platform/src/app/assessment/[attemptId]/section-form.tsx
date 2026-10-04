"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveAnswersAction, submitAction } from "./actions";

export type Q = {
  id: string;
  no: number;
  text: string;
  choices: { value: string; label: string }[];
  scaleLabel: string;
};

type SaveState = "idle" | "saving" | "saved" | "retry";

/**
 * 한 묶음의 문항.
 *
 * **서버가 진실이다.** 답을 고치면 모아 두었다가 잠깐 멈출 때 한 번 보내고
 * (규격 §58: 묶어서, 눌릴 때마다가 아니라), 묶음을 넘어갈 때 반드시 한 번
 * 더 보낸다. 보내기 전에 창을 닫아도 다음에 들어오면 서버가 들고 있던
 * 데까지는 그대로다.
 *
 * **브라우저 저장소는 복구용 사본일 뿐이다.** 서버가 받아 준 답은 거기서
 * 지운다. 남겨 두면 다음에 들어왔을 때 어느 쪽이 최신인지를 또 판단해야
 * 하고, 그 판단이 틀리면 고친 답이 되돌아간다.
 *
 * **답할 때마다 알림을 띄우지 않는다**(규격 §44). 조용한 상태 한 줄이다.
 */
export default function SectionForm({
  attemptId, sectionIndex, lastSection, questions, initial, labels,
}: {
  attemptId: string;
  sectionIndex: number;
  lastSection: boolean;
  questions: Q[];
  initial: Record<string, unknown>;
  labels: {
    saving: string; saved: string; retry: string;
    prev: string; next: string; submit: string; notAll: string;
  };
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, unknown>>(initial);
  const [state, setState] = useState<SaveState>("idle");
  const [busy, setBusy] = useState(false);
  const pending = useRef<Record<string, unknown>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheKey = `cm_v2_recover_${attemptId}`;

  /** 아직 서버가 안 받은 답만 보낸다. 성공하면 사본을 지운다. */
  const flush = useCallback(async (): Promise<boolean> => {
    const batch = pending.current;
    if (!Object.keys(batch).length) return true;
    setState("saving");
    try {
      const r = await saveAnswersAction(attemptId, batch);
      if (!r.ok) { setState("retry"); return false; }
      pending.current = {};
      try { localStorage.removeItem(cacheKey); } catch { /* 꺼져 있을 수 있다 */ }
      setState("saved");
      return true;
    } catch {
      /* 잠깐 끊긴 것일 수 있다. 사본을 남겨 두고 다음 기회에 다시 보낸다 */
      setState("retry");
      return false;
    }
  }, [attemptId, cacheKey]);

  const answer = (id: string, value: string) => {
    setAnswers((a) => ({ ...a, [id]: Number(value) || value }));
    pending.current[id] = Number(value) || value;
    try { localStorage.setItem(cacheKey, JSON.stringify(pending.current)); } catch { /* */ }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, 900);
  };

  /* 떠나기 전에 한 번 더 보낸다 */
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") void flush(); };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flush]);

  const go = async (to: number) => {
    setBusy(true);
    const ok = await flush();
    setBusy(false);
    if (!ok) return;                       // 저장이 안 됐으면 넘어가지 않는다
    router.push(`/assessment/${attemptId}?s=${to}`);
  };

  const done = questions.every((q) => answers[q.id] !== undefined);

  const finish = async () => {
    setBusy(true);
    const ok = await flush();
    if (!ok) { setBusy(false); return; }
    const r = await submitAction(attemptId);
    setBusy(false);
    if (r.ok) router.push(`/assessment/${attemptId}/done`);
  };

  return (
    <>
      <ol className="asq">
        {questions.map((q) => (
          <li key={q.id} className="asq-i">
            <div className="asq-h">
              <span className="asq-no">{q.no}</span>
              <p className="asq-t">{q.text}</p>
            </div>
            <fieldset className="asq-opts">
              <legend className="sr-only">{q.scaleLabel}</legend>
              {q.choices.map((c) => (
                <label key={c.value} className={answers[q.id] == c.value ? "on" : undefined}>
                  <input
                    type="radio"
                    name={q.id}
                    value={c.value}
                    checked={String(answers[q.id] ?? "") === c.value}
                    onChange={(e) => answer(q.id, e.target.value)}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </fieldset>
          </li>
        ))}
      </ol>

      <div className="asnav">
        <span className={`assave is-${state}`} role="status" aria-live="polite">
          {state === "saving" ? labels.saving
            : state === "retry" ? labels.retry
            : state === "saved" ? labels.saved : ""}
        </span>
        {sectionIndex > 0 ? (
          <button type="button" className="sf-btn ghost" disabled={busy}
            onClick={() => void go(sectionIndex - 1)}>{labels.prev}</button>
        ) : null}
        {lastSection ? (
          <button type="button" className="sf-btn accent" disabled={busy || !done}
            onClick={() => void finish()}>
            {done ? labels.submit : labels.notAll}
          </button>
        ) : (
          <button type="button" className="sf-btn accent" disabled={busy || !done}
            onClick={() => void go(sectionIndex + 1)}>
            {done ? labels.next : labels.notAll}
          </button>
        )}
      </div>
    </>
  );
}
