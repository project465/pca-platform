"use client";

import { useActionState } from "react";
import { answerAction, type AnswerState } from "./actions";

const initial: AnswerState = {};

/** 답장은 메일로 하고, 여기서는 처리했다는 표시와 메모만 남긴다 */
export default function AnswerForm({ inquiryId }: { inquiryId: string }) {
  const [state, action, pending] = useActionState(answerAction, initial);
  if (state.ok) return <span className="inline-ok">{state.ok}</span>;

  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <input name="memo" maxLength={1000} placeholder="어떻게 답했는지 (선택)" />
      <button className="act" type="submit" disabled={pending}>
        {pending ? "처리 중…" : "답변함"}
      </button>
      {state.message ? <span className="inline-err">{state.message}</span> : null}
    </form>
  );
}
