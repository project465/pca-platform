"use client";

import { useActionState } from "react";
import { retryAction, type RetryState } from "./actions";

const initial: RetryState = {};

export default function RetryButton({ paymentId }: { paymentId: string }) {
  const [state, action, pending] = useActionState(retryAction, initial);
  if (state.ok) return <span className="inline-ok">{state.ok}</span>;

  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="paymentId" value={paymentId} />
      <button className="act" type="submit" disabled={pending}>
        {pending ? "다시 시도 중…" : "환불 다시 시도"}
      </button>
      {state.message ? <span className="inline-err">{state.message}</span> : null}
    </form>
  );
}
