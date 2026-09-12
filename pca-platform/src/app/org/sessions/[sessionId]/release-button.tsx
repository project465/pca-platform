"use client";

import { useActionState } from "react";
import { releaseAction } from "./actions";

const initial: { message?: string; ok?: string } = {};

export default function ReleaseButton({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState(releaseAction, initial);
  if (state.ok) return <div className="notice ok">{state.ok}</div>;

  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="sessionId" value={sessionId} />
      <button className="act solid" type="submit" disabled={pending}>
        {pending ? "공개 중…" : "결과 공개하기"}
      </button>
      <span className="help">누르면 학생 화면에 결과지가 나타납니다. 되돌릴 수 없습니다.</span>
      {state.message ? <span className="inline-err">{state.message}</span> : null}
    </form>
  );
}
