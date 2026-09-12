"use client";

import { useActionState } from "react";
import { releaseAction, scoreAction } from "./actions";

const initial: { message?: string; ok?: string } = {};

export default function ReleaseButton({
  sessionId,
  releasedAt,
  compact = false,
}: {
  sessionId: string;
  releasedAt: string | null;
  /** 리포트 머리글처럼 자리가 좁은 곳에서는 버튼만 남긴다 */
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState(releaseAction, initial);
  const done = Boolean(state.ok) || releasedAt !== null;

  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="sessionId" value={sessionId} />
      <button className="act solid" type="submit" disabled={pending || done}>
        {pending ? "공개 중…" : done ? "공개함" : "결과 공개하기"}
      </button>
      {compact ? null : state.ok ? (
        <span className="inline-ok">{state.ok}</span>
      ) : done ? (
        <span className="help">학생 화면에 결과지가 보입니다.</span>
      ) : (
        <span className="help">누르면 학생 화면에 결과지가 나타납니다. 되돌릴 수 없습니다.</span>
      )}
      {state.message ? <span className="inline-err">{state.message}</span> : null}
    </form>
  );
}

export function ScoreButton({ sessionId, pending }: { sessionId: string; pending: number }) {
  const [state, action, busy] = useActionState(scoreAction, initial);

  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="sessionId" value={sessionId} />
      <button className="act solid" type="submit" disabled={busy || pending === 0}>
        {busy ? "채점 중…" : pending === 0 ? "채점할 제출 없음" : `제출한 ${pending}명 채점하기`}
      </button>
      {state.ok ? (
        <span className="inline-ok">{state.ok}</span>
      ) : (
        <span className="help">지표 점수와 직무 적합도를 계산합니다. 여러 번 돌려도 됩니다.</span>
      )}
      {state.message ? <span className="inline-err">{state.message}</span> : null}
    </form>
  );
}
