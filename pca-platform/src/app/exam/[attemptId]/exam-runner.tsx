"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ExamQuestion } from "@/lib/exam";
import { saveAnswerAction, startAction, submitAction, type SaveOutcome } from "./actions";

/**
 * 응시 화면. 시안 `mockups/01_test_screen.html` 의 구조를 그대로 따른다.
 *
 * 설계에서 중요한 것 세 가지.
 *
 * 1. 문항 이동은 서버를 부르지 않는다. 문항은 처음에 전부 받아 두고, 서버로
 *    가는 것은 저장뿐이다. 이동이 한 박자 늦으면 사람은 두 번 누른다.
 *
 * 2. 저장은 대기열로 처리한다. 고를 때마다 화면은 즉시 반영하고, 저장은 뒤에서
 *    순서대로 보낸다. 실패하면 그 자리에 남겨 다시 보낸다. 네트워크가 잠깐
 *    끊겼다고 고른 것이 사라지면 안 되고, 그렇다고 브라우저 저장소에 답을
 *    넣어둘 수도 없다 (CLAUDE.md 기술 스택).
 *
 * 3. 저장되지 않은 답이 남아 있으면 제출을 막고, 창을 닫을 때 경고한다.
 *    제출은 "서버에 다 들어갔다"가 확인된 뒤에만 의미가 있다.
 */

type Props = {
  attemptId: string;
  sessionName: string;
  displayName: string;
  questions: ExamQuestion[];
  initialAnswers: Record<string, string>;
  /** 이어보기 지점 (attempts.last_order_no) */
  lastOrderNo: number;
  started: boolean;
  closesAt: string;
  releaseMode: string;
};

type Phase = "intro" | "quiz";

const SAVE_RETRY_MS = [1000, 2000, 4000, 8000, 15000];

export default function ExamRunner({
  attemptId,
  sessionName,
  displayName,
  questions,
  initialAnswers,
  lastOrderNo,
  started,
  closesAt,
  releaseMode,
}: Props) {
  const total = questions.length;

  // 이어보기: 마지막으로 답한 문항의 '다음'부터. 다 답했으면 첫 미응답으로.
  const firstUnanswered = useMemo(() => {
    const idx = questions.findIndex((q) => !initialAnswers[q.id]);
    return idx < 0 ? Math.min(lastOrderNo, total - 1) : idx;
  }, [questions, initialAnswers, lastOrderNo, total]);

  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(firstUnanswered);
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** 다시 시도해도 소용없는 실패. 제출을 막고 새로고침을 권한다 */
  const [fatal, setFatal] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const router = useRouter();
  const queue = useRef(new Map<string, string>());
  const draining = useRef(false);
  const retry = useRef(0);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id]).length,
    [questions, answers],
  );
  const unanswered = useMemo(
    () => questions.filter((q) => !answers[q.id]).map((q) => q.orderNo),
    [questions, answers],
  );

  const msLeft = new Date(closesAt).getTime() - now;
  const expired = msLeft <= 0;
  const closingSoon = msLeft > 0 && msLeft < 10 * 60 * 1000;

  /* ---------------- 저장 대기열 ---------------- */

  const drain = useCallback(async () => {
    if (draining.current) return;
    draining.current = true;

    try {
      while (queue.current.size > 0) {
        const [questionId, optionId] = queue.current.entries().next().value as [string, string];

        // 서버 액션은 연결이 끊기면 값을 돌려주는 대신 예외를 던진다.
        // 여기서 잡지 않으면 대기열이 멈춘 채로 남아 이후 응답이 영영 저장되지 않는다.
        let res: SaveOutcome;
        try {
          res = await saveAnswerAction({ attemptId, questionId, optionId });
        } catch {
          res = { ok: false, message: "연결이 끊겼습니다.", retryable: true };
        }

        if (res.ok) {
          // 그사이 같은 문항을 다시 골랐으면 새 값이 큐에 남아 있어야 한다.
          if (queue.current.get(questionId) === optionId) queue.current.delete(questionId);
          setPendingCount(queue.current.size);
          setSaveError(null);
          retry.current = 0;
          setSavedFlash(true);
          if (flashTimer.current) clearTimeout(flashTimer.current);
          flashTimer.current = setTimeout(() => setSavedFlash(false), 1400);
          continue;
        }

        // 다시 보내도 소용없는 실패는 거기서 멈춘다. 화면을 새로 고쳐야 한다.
        if (!res.retryable) {
          setFatal(res.message);
          setSaveError(null);
          return;
        }

        // 그 밖에는 큐에 남겨 두고 간격을 늘려가며 다시 보낸다.
        const attempts = retry.current + 1;
        setSaveError(
          attempts >= 5
            ? `${res.message} 계속 저장되지 않습니다. 인터넷 연결을 확인해 주세요.`
            : `${res.message} 다시 시도합니다.`,
        );
        const wait = SAVE_RETRY_MS[Math.min(retry.current, SAVE_RETRY_MS.length - 1)];
        retry.current = attempts;
        draining.current = false;
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => void drain(), wait);
        return;
      }
    } finally {
      draining.current = false;
    }
  }, [attemptId]);

  const choose = useCallback(
    (questionId: string, optionId: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
      queue.current.set(questionId, optionId);
      setPendingCount(queue.current.size);
      void drain();
    },
    [drain],
  );

  /** 다음 문항으로 옮길 때 포커스를 옮길 대상. 키보드로 온 경우에만 쓴다. */
  const focusNext = useRef(false);

  /* ---------------- 이동 ---------------- */

  const go = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(total - 1, next)));
    },
    [total],
  );

  const advance = useCallback(() => {
    if (index < total - 1) go(index + 1);
  }, [index, total, go]);

  /* ---------------- 시작 · 제출 ---------------- */

  async function begin() {
    setPhase("quiz");
    if (!started) await startAction(attemptId);
  }

  async function submit() {
    setSubmitError(null);

    // 큐를 먼저 비운다. 저장 안 된 답을 남겨두고 제출하면 그 문항은 빈 채로 채점된다.
    if (queue.current.size > 0) {
      setSubmitError(
        `아직 저장되지 않은 응답이 ${queue.current.size}개 있습니다. 저장이 끝난 뒤 제출할 수 있습니다.`,
      );
      void drain();
      return;
    }

    setSubmitting(true);
    const res = await submitAction(attemptId);

    if (!res.ok) {
      setSubmitting(false);
      setSubmitError(res.message);
      return;
    }
    // 완료 화면은 서버가 그린다. 새로고침해도, 나중에 다시 들어와도 같은 화면이다.
    router.refresh();
  }

  /* ---------------- 부수 효과 ---------------- */

  // 떠날 때 타이머를 정리한다. 남겨 두면 사라진 화면에 setState 가 날아간다.
  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );

  // 남은 시간 표시용. 1분마다면 충분하다.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // 저장 안 된 답이 있는 채로 창을 닫으려 하면 붙잡는다.
  useEffect(() => {
    if (pendingCount === 0) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [pendingCount]);

  // 키보드로 넘어왔으면 새 문항의 첫 선택지로 포커스를 옮긴다.
  // 옮기지 않으면 다음 숫자키가 사라진 버튼으로 가서 아무 일도 일어나지 않는다.
  useEffect(() => {
    if (phase !== "quiz" || !focusNext.current) return;
    focusNext.current = false;
    optionRefs.current[0]?.focus();
  }, [phase, index]);

  /**
   * 키보드.
   *
   * 선택지는 라디오 그룹이다. 그 안에서 방향키는 항목 사이를 옮기는 것이 표준이고
   * 스크린리더 사용자는 그렇게 기대한다. 그래서 방향키를 문항 이동에 쓰지 않고
   * 그룹 안 이동으로 돌려주었다. 문항 이동은 Alt+방향키와 PageUp/PageDown 이다.
   *
   * 방향키로는 포커스만 옮기고 고르지는 않는다. 표준 라디오는 이동하면서 선택까지
   * 하지만, 여기서는 선택이 곧 서버 저장이라 지나가는 항목까지 저장되면 안 된다.
   * 고르는 것은 Space·Enter(버튼의 기본 동작)와 숫자키다.
   */
  useEffect(() => {
    if (phase !== "quiz") return;
    const q = questions[index];

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;

      // 문항 이동 — Alt+방향키, PageUp/PageDown
      if ((e.altKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) ||
          e.key === "PageDown" || e.key === "PageUp") {
        e.preventDefault();
        focusNext.current = true;
        if (e.key === "ArrowRight" || e.key === "PageDown") advance();
        else go(index - 1);
        return;
      }

      // 숫자키로 고르기
      if (!e.altKey && !e.ctrlKey && !e.metaKey && e.key >= "1" && e.key <= "9") {
        const k = Number(e.key) - 1;
        if (k < q.options.length) {
          e.preventDefault();
          choose(q.id, q.options[k].id);
          if (index < total - 1) {
            focusNext.current = true;
            setTimeout(() => advance(), 220);
          } else {
            optionRefs.current[k]?.focus();
          }
        }
        return;
      }

      // 선택지 안에서의 이동. 그룹에 포커스가 있을 때만 가로챈다.
      const inGroup = optionRefs.current.some((b) => b && b === document.activeElement);
      if (!inGroup) return;

      const at = optionRefs.current.findIndex((b) => b === document.activeElement);
      const last = q.options.length - 1;
      let to = -1;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") to = at >= last ? 0 : at + 1;
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") to = at <= 0 ? last : at - 1;
      else if (e.key === "Home") to = 0;
      else if (e.key === "End") to = last;

      if (to >= 0) {
        e.preventDefault();
        optionRefs.current[to]?.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, index, questions, choose, advance, go, total]);

  /* ---------------- 화면 ---------------- */

  if (total === 0) {
    return (
      <div className="panel">
        <h1>준비된 문항이 없습니다</h1>
        <p>이 회차에 연결된 검사 도구에 문항이 없습니다. 학과 담당자에게 알려주세요.</p>
      </div>
    );
  }

  if (phase === "intro") {
    const resuming = answeredCount > 0;
    return (
      <div className="panel">
        <h1>{resuming ? "이어서 응시하시겠어요?" : "검사를 시작합니다"}</h1>
        <p>
          {resuming
            ? `지난 접속에서 ${answeredCount}개 문항에 응답하셨습니다. ${questions[firstUnanswered].orderNo}번 문항부터 이어서 시작합니다.`
            : "정답이 있는 검사가 아닙니다. 지금 상태를 그대로 고르시면 됩니다."}
        </p>
        <ul>
          <li>
            <b>문항 수</b> {total}개
            {resuming ? ` · 남은 문항 ${total - answeredCount}개` : ""}
          </li>
          <li>
            <b>예상 소요 시간</b> 약 {Math.max(3, Math.round((total * 35) / 60))}분
          </li>
          <li>
            <b>중간에 창을 닫아도</b> 응답은 그대로 남습니다
          </li>
          <li>
            <b>결과 공개</b>{" "}
            {releaseMode === "instant" ? "채점이 끝나는 대로 열립니다" : "학과 담당자 확인 후 열립니다"}
          </li>
        </ul>
        <button className="act solid" type="button" onClick={begin} disabled={expired}>
          {expired
            ? "응시 기간이 끝났습니다"
            : resuming
              ? `${questions[firstUnanswered].orderNo}번 문항부터 이어하기`
              : "시작하기"}
        </button>
        <p className="hint">
          문항은 한 개씩 나옵니다. 고르면 바로 저장되고, 이전 문항으로 돌아가 고칠 수 있습니다.
        </p>
      </div>
    );
  }

  const q = questions[index];
  optionRefs.current.length = q.options.length;
  const isLast = index === total - 1;
  const allAnswered = unanswered.length === 0;

  return (
    <>
      <div className="bar">
        <div className="row">
          <span className="who">
            {sessionName} · {displayName}
          </span>
          <span className="count">
            {index + 1}
            <em> / {total}</em>
          </span>
        </div>
        <div className="rail">
          <i style={{ width: `${(answeredCount / total) * 100}%` }} />
        </div>
        <div className="bar-note" aria-live="polite">
          {fatal ? (
            <span className="bar-err">{fatal}</span>
          ) : saveError ? (
            <span className="bar-err">{saveError} (저장 대기 {pendingCount}개)</span>
          ) : pendingCount > 0 ? (
            <span className="bar-wait">저장 중…</span>
          ) : savedFlash ? (
            <span className="bar-ok">응답이 저장되었습니다</span>
          ) : (
            <span className="bar-idle">
              {answeredCount}개 응답함
              {closingSoon ? ` · 마감까지 ${Math.max(1, Math.round(msLeft / 60000))}분` : ""}
            </span>
          )}
        </div>
      </div>

      {expired ? (
        <div className="notice error" style={{ marginBottom: 12 }}>
          응시 기간이 끝났습니다. 지금까지의 응답은 저장돼 있습니다. 학과 담당자에게 문의하세요.
        </div>
      ) : null}

      {fatal ? (
        <div className="notice error" style={{ marginBottom: 12 }}>
          {fatal} 저장되지 않은 응답이 {pendingCount}개 있습니다.{" "}
          <button className="linkish" type="button" onClick={() => router.refresh()}>
            화면 새로 고치기
          </button>
        </div>
      ) : null}

      <div className="card">
        {/* 화면이 바뀐 것을 스크린리더에 알린다. 시각적으로는 진행바가 그 일을 한다 */}
        <p className="sr-only" aria-live="polite">
          문항 {q.orderNo} / {total}
        </p>
        <div className="qno">문항 {q.orderNo}</div>
        <p className="qtext">{q.text}</p>

        <div className="opts" role="radiogroup" aria-label={`문항 ${q.orderNo}`}>
          {q.options.map((o, k) => {
            const on = answers[q.id] === o.id;
            const selectedIdx = q.options.findIndex((x) => x.id === answers[q.id]);
            // 그룹 전체가 탭 순서에서 한 칸을 차지한다(roving tabindex).
            // 고른 것이 있으면 그것에, 없으면 첫 항목에 탭이 닿는다.
            const tabbable = selectedIdx >= 0 ? k === selectedIdx : k === 0;
            return (
              <button
                key={o.id}
                ref={(el) => {
                  optionRefs.current[k] = el;
                }}
                className="opt"
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={tabbable ? 0 : -1}
                disabled={expired}
                onClick={(e) => {
                  choose(q.id, o.id);
                  // detail 0 이면 키보드로 누른 것이다(Space·Enter).
                  // 그때만 포커스를 다음 문항으로 옮긴다 — 마우스 사용자의 포커스를
                  // 함부로 가져가면 그다음 탭 순서가 엉킨다.
                  const viaKeyboard = e.detail === 0;
                  if (!isLast) {
                    focusNext.current = viaKeyboard;
                    // 고르자마자 넘어가면 잘못 누른 것을 고칠 틈이 없다. 시안처럼 잠깐 둔다.
                    setTimeout(() => advance(), 220);
                  }
                }}
              >
                <span className="dot" />
                <span className="txt">{o.label}</span>
                <span className="key" aria-hidden="true">
                  {k + 1}
                </span>
              </button>
            );
          })}
        </div>

        <div className="nav">
          <button className="act" type="button" onClick={() => go(index - 1)} disabled={index === 0}>
            이전
          </button>
          <span className="right">
            {!isLast ? (
              <button className="act" type="button" onClick={advance}>
                나중에 답하기
              </button>
            ) : null}
            {isLast ? (
              <button
                className="act solid"
                type="button"
                onClick={submit}
                disabled={submitting || !allAnswered || pendingCount > 0 || expired || fatal !== null}
              >
                {submitting ? "제출 중…" : "제출하기"}
              </button>
            ) : (
              <button className="act solid" type="button" onClick={advance}>
                다음
              </button>
            )}
          </span>
        </div>

        {isLast && !allAnswered ? (
          <div className="left-over">
            <b>답하지 않은 문항 {unanswered.length}개</b>
            <div className="left-over-list">
              {unanswered.map((no) => (
                <button key={no} type="button" className="chip" onClick={() => go(no - 1)}>
                  {no}번
                </button>
              ))}
            </div>
            <span className="help">모두 답해야 제출할 수 있습니다.</span>
          </div>
        ) : null}

        {submitError ? (
          <div className="notice error" style={{ marginTop: 14 }}>
            {submitError}
          </div>
        ) : null}
      </div>

      <p className="kbd-hint">
        숫자키 <b>1</b>–<b>{Math.min(9, q.options.length)}</b> 로 고르고, <b>Alt</b>+<b>←</b> <b>→</b> 로
        문항을 옮길 수 있습니다. 선택지 안에서는 방향키로 움직입니다.
      </p>
    </>
  );
}
