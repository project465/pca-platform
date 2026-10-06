"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { progressAction, saveAnswersAction, submitAction, type ProgressReply } from "./actions";

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
 * **다 풀었는가도 서버가 정한다.** 전에는 이 화면이 들고 있는 답만 세서
 * 제출 단추를 열고 닫았다. 그 둘이 갈리는 날이 있다: 뒤로가기로 돌아오면
 * 브라우저가 앞서 그려 둔 쪽을 되살리고, 그 쪽이 들고 있는 것은 **그때의
 * 서버 상태**다. 그러면 화면에는 다 고른 것으로 보이는데 단추가 안 열리고,
 * 눌러도 아무 일이 없었다. 지금은 저장할 때마다 서버가 센 수를 같이 받아
 * 그것으로 연다.
 *
 * **브라우저 저장소는 복구용 사본이다.** 들어올 때 한 번 읽어 아직 서버가
 * 못 받은 답을 다시 보내고, 서버가 받아 준 답은 거기서 지운다.
 */
export default function SectionForm({
  attemptId, sectionIndex, lastSection, questions, initial, sectionLabels, labels,
}: {
  attemptId: string;
  sectionIndex: number;
  lastSection: boolean;
  questions: Q[];
  initial: Record<string, unknown>;
  /** 묶음 이름. 남은 자리를 적을 때 쓴다 */
  sectionLabels: string[];
  labels: {
    saving: string; saved: string; retry: string;
    prev: string; next: string; submit: string; notAll: string;
    missingHead: string; missingLeft: string; gone: string;
  };
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, unknown>>(initial);
  const [state, setState] = useState<SaveState>("idle");
  const [busy, setBusy] = useState(false);
  const [server, setServer] = useState<ProgressReply | null>(null);
  const [missing, setMissing] = useState<{ index: number; label: string; left: number }[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const pending = useRef<Record<string, unknown>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const again = useRef(false);
  const cacheKey = `cm_v2_recover_${attemptId}`;

  const remember = () => {
    try { localStorage.setItem(cacheKey, JSON.stringify(pending.current)); } catch { /* 꺼져 있을 수 있다 */ }
  };

  /**
   * 아직 서버가 안 받은 답만 보낸다.
   *
   * **보낸 것만 지운다.** 전에는 끝나고 `pending` 을 통째로 비웠는데,
   * 보내는 동안 고른 답이 그 자리에 들어와 있으면 보내지도 않고 지워졌다.
   * 지금은 보낸 열쇠 가운데 **값이 그대로인 것만** 지운다.
   *
   * **한 번에 하나만 보낸다.** 둘이 겹치면 늦게 끝난 쪽이 먼저 끝난 쪽의
   * 대기열을 지운다. 보내는 중에 더 생기면 끝나고 한 번 더 돈다.
   */
  const flush = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) { again.current = true; return true; }
    const batch = { ...pending.current };
    const keys = Object.keys(batch);
    if (!keys.length) return true;
    inFlight.current = true;
    setState("saving");
    try {
      const r = await saveAnswersAction(attemptId, batch);
      if (!r.ok) { setState("retry"); return false; }
      for (const k of keys) {
        if (pending.current[k] === batch[k]) delete pending.current[k];
      }
      remember();
      if (r.progress) setServer(r.progress);
      setState("saved");
      return true;
    } catch {
      /* 잠깐 끊긴 것일 수 있다. 사본을 남겨 두고 다음 기회에 다시 보낸다 */
      setState("retry");
      return false;
    } finally {
      inFlight.current = false;
      if (again.current) { again.current = false; void flush(); }
    }
  }, [attemptId, cacheKey]);

  const answer = (id: string, value: string) => {
    const v = value === "" ? value : (Number.isNaN(Number(value)) ? value : Number(value));
    setAnswers((a) => ({ ...a, [id]: v }));
    pending.current[id] = v;
    remember();
    setMissing(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, 900);
  };

  /* 들어올 때: 못 보낸 사본을 되살리고 서버가 센 수를 받아 둔다 */
  useEffect(() => {
    let cached: Record<string, unknown> | null = null;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) cached = JSON.parse(raw) as Record<string, unknown>;
    } catch { cached = null; }
    if (cached && Object.keys(cached).length) {
      pending.current = { ...cached, ...pending.current };
      setAnswers((a) => ({ ...cached, ...a }));
      void flush();
    }
    void progressAction(attemptId).then((p) => { if (p) setServer(p); }).catch(() => null);
  }, [attemptId, cacheKey, flush]);

  /**
   * 서버가 들고 있던 답을 화면에 되돌린다.
   *
   * **되살아난 쪽이 빈 채로 서는 것을 막는다.** 뒤로가기로 돌아오면 그때의
   * 쪽이 그대로 서는데, 그 쪽의 `initial` 은 그 시점의 서버 상태다. 아직
   * 못 보낸 답(`pending`)이 이기고 그 다음이 화면이 들고 있던 것이다.
   */
  const seed = JSON.stringify(initial);
  useEffect(() => {
    setAnswers((a) => ({ ...(JSON.parse(seed) as Record<string, unknown>), ...a, ...pending.current }));
  }, [seed]);

  /* 떠나기 전에 한 번 더 보낸다. 쪽을 옮기는 것도 떠나는 것이다 */
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") void flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      if (timer.current) clearTimeout(timer.current);
      void flush();
    };
  }, [flush]);

  const go = async (to: number) => {
    setBusy(true);
    const ok = await flush();
    setBusy(false);
    if (!ok) return;                       // 저장이 안 됐으면 넘어가지 않는다
    /* **`router.refresh()` 를 같이 부르지 않는다.** 주소를 옮기는 중에
       지금 쪽을 다시 받아 오면 둘이 경쟁해서 옮기던 것이 취소된다.
       실제로 그래서 첫 묶음에서 더 못 나갔다. 주소가 바뀌면 서버가
       다시 그리므로 띠의 수도 그때 같이 새로 온다 */
    router.push(`/assessment/${attemptId}?s=${to}`);
  };

  /** 이 묶음을 화면이 다 들고 있는가 */
  const localDone = questions.every((q) => answers[q.id] !== undefined);
  /** 응시 전체를 서버가 다 들고 있는가 */
  const serverDone = server ? server.answered >= server.total : false;
  const done = localDone || serverDone;

  const showMissing = (p: ProgressReply) => {
    setServer(p);
    const left = p.sections
      .map((s, i) => ({ index: i, label: sectionLabels[i] ?? "", left: s.total - s.answered }))
      .filter((s) => s.left > 0);
    setMissing(left);
  };

  const finish = async () => {
    setBusy(true);
    setNote(null);
    const ok = await flush();
    if (!ok) { setBusy(false); return; }
    const r = await submitAction(attemptId);
    setBusy(false);
    if (r.ok) { router.push(`/assessment/${attemptId}/done`); return; }
    /* 이미 닫힌 응시면 결과 쪽으로 보낸다. 같은 자리에 세워 두지 않는다 */
    if (r.reason === "already") { router.push(`/assessment/${attemptId}/done`); return; }
    if (r.reason === "gone") { setNote(labels.gone); return; }
    if (r.progress) showMissing(r.progress);
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

      {/* **어디에 몇 개가 남았는지 적고 그 자리로 보낸다.** '남은 문항이
          있습니다' 만 적으면 누른 사람은 처음부터 다시 훑는다 */}
      {missing && missing.length ? (
        <div className="asmiss" role="alert">
          <p>{labels.missingHead}</p>
          <ul>
            {missing.map((m) => (
              <li key={m.index}>
                <a href={`/assessment/${attemptId}?s=${m.index}`}>
                  {m.label} {m.left} {labels.missingLeft}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {note ? <div className="asmiss" role="alert"><p>{note}</p></div> : null}

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
        {/* **단추를 잠그지 않는다.** 잠그는 판단이 화면에 있으면 화면이
            틀렸을 때 빠져나갈 길이 없다. 눌러 보고 서버가 거절하면 어디가
            남았는지 적는다 */}
        {lastSection ? (
          <button type="button" className="sf-btn accent" disabled={busy}
            onClick={() => void finish()}>
            {done ? labels.submit : labels.notAll}
          </button>
        ) : (
          <button type="button" className="sf-btn accent" disabled={busy || !localDone}
            onClick={() => void go(sectionIndex + 1)}>
            {localDone ? labels.next : labels.notAll}
          </button>
        )}
      </div>
    </>
  );
}
