"use client";

import { useActionState, useState, useTransition } from "react";
import { buildAction, payAction, type PayoutState } from "./actions";

const initial: PayoutState = {};

export function BuildButton() {
  const [pending, start] = useTransition();
  const [state, setState] = useState<PayoutState>({});

  return (
    <div className="inline-form">
      <button
        className="act"
        type="button"
        disabled={pending}
        onClick={() => start(async () => setState(await buildAction()))}
      >
        {pending ? "확인 중…" : "끝난 세션 정산 잡기"}
      </button>
      {state.ok ? <span className="inline-ok">{state.ok}</span> : null}
      {state.message ? <span className="inline-err">{state.message}</span> : null}
    </div>
  );
}

export function PayButton({ payoutId }: { payoutId: string }) {
  const [state, action, pending] = useActionState(payAction, initial);
  if (state.ok) return <span className="inline-ok">{state.ok}</span>;

  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="payoutId" value={payoutId} />
      <input name="memo" placeholder="이체 메모 (선택)" maxLength={100} />
      <button className="act" type="submit" disabled={pending}>
        {pending ? "처리 중…" : "지급 완료"}
      </button>
      {state.message ? <span className="inline-err">{state.message}</span> : null}
    </form>
  );
}
