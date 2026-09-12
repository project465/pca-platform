"use client";

import { useActionState } from "react";
import { approveMentorAction, pauseMentorAction, type ApproveState } from "./actions";

const initial: ApproveState = {};

export function ApproveForm({ mentorId }: { mentorId: string }) {
  const [state, action, pending] = useActionState(approveMentorAction, initial);
  if (state.ok) return <span className="inline-ok">{state.ok}</span>;

  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="mentorId" value={mentorId} />
      <input
        name="verifyNote"
        maxLength={300}
        placeholder="무엇으로 현직을 확인했는가 (예: 회사 메일 인증, 재직증명서)"
        required
      />
      <button className="act solid" type="submit" disabled={pending}>
        {pending ? "승인 중…" : "승인"}
      </button>
      {state.message ? <span className="inline-err">{state.message}</span> : null}
      {state.errors?.verifyNote ? (
        <span className="inline-err">{state.errors.verifyNote}</span>
      ) : null}
    </form>
  );
}

export function PauseForm({ mentorId }: { mentorId: string }) {
  const [state, action, pending] = useActionState(pauseMentorAction, initial);
  if (state.ok) return <span className="inline-ok">{state.ok}</span>;
  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="mentorId" value={mentorId} />
      <button className="linkish" type="submit" disabled={pending}>
        중지
      </button>
    </form>
  );
}
