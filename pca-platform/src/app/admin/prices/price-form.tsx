"use client";

import { useActionState } from "react";
import { savePricesAction, type PriceState } from "./actions";

const initial: PriceState = {};

export default function PriceForm({
  rows,
}: {
  rows: { session_minutes: number; amount: number }[];
}) {
  const [state, action, pending] = useActionState(savePricesAction, initial);

  return (
    <form action={action} className="form" style={{ maxWidth: 420 }}>
      {rows.map((r) => (
        <div className="field" key={r.session_minutes}>
          <label htmlFor={`p${r.session_minutes}`}>{r.session_minutes}분 세션</label>
          <input
            id={`p${r.session_minutes}`}
            name={`p:${r.session_minutes}`}
            type="number"
            min={0}
            step={1000}
            defaultValue={r.amount}
          />
        </div>
      ))}

      {state.message ? <div className="notice error">{state.message}</div> : null}
      {state.ok ? <div className="notice ok">{state.ok}</div> : null}

      <button className="act solid" type="submit" disabled={pending}>
        {pending ? "저장 중…" : "저장"}
      </button>
      <span className="help">
        학과 계약으로 들어온 학생은 무료입니다. 이 값은 개인 회원에게만 청구됩니다.
      </span>
    </form>
  );
}
