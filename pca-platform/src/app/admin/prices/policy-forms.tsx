"use client";

import { useActionState, useState } from "react";
import { savePayoutAction, saveRefundAction, type PriceState } from "./actions";

const initial: PriceState = {};

/** 신청자가 스스로 취소할 때 적용된다. 멘토 거절·무응답은 언제나 전액이다. */
export function RefundForm({ rules }: { rules: { hours_before: number; percent: number }[] }) {
  const [state, action, pending] = useActionState(saveRefundAction, initial);
  const [rows, setRows] = useState(
    rules.length > 0 ? rules : [{ hours_before: 24, percent: 0 }],
  );

  return (
    <form action={action} className="form">
      <p className="help">
        세션 시작까지 남은 시간이 많을수록 많이 돌려줍니다. 아래 어느 줄에도 걸리지 않으면
        환불하지 않습니다. 규칙이 하나도 없으면 신청자 취소는 환불되지 않습니다.
      </p>

      <div className="rule-rows">
        {rows.map((r, i) => (
          <div className="rule-row" key={i}>
            <span>세션 시작</span>
            <input
              type="number"
              min={0}
              max={8760}
              value={r.hours_before}
              aria-label="몇 시간 전"
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...r, hours_before: Number(e.target.value) };
                setRows(next);
              }}
            />
            <span>시간 전까지 취소하면</span>
            <input
              type="number"
              min={0}
              max={100}
              name={`r:${r.hours_before}`}
              value={r.percent}
              aria-label="환불율"
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...r, percent: Number(e.target.value) };
                setRows(next);
              }}
            />
            <span>% 환불</span>
            <button
              className="linkish"
              type="button"
              onClick={() => setRows(rows.filter((_, k) => k !== i))}
            >
              빼기
            </button>
          </div>
        ))}
      </div>

      <button
        className="linkish"
        type="button"
        onClick={() => setRows([...rows, { hours_before: 0, percent: 0 }])}
      >
        규칙 추가
      </button>

      {state.message ? <div className="notice error">{state.message}</div> : null}
      {state.ok ? <div className="notice ok">{state.ok}</div> : null}

      <button className="act solid" type="submit" disabled={pending}>
        {pending ? "저장 중…" : "환불 규칙 저장"}
      </button>
    </form>
  );
}

export function PayoutForm({ fee, withholding }: { fee: string; withholding: string }) {
  const [state, action, pending] = useActionState(savePayoutAction, initial);

  return (
    <form action={action} className="form" style={{ maxWidth: 420 }}>
      <div className="field">
        <label htmlFor="fee">운영사 수수료율 (%)</label>
        <input id="fee" name="fee" type="number" min={0} max={100} step="0.1" defaultValue={fee} />
        <span className="help">
          0이면 정산 건이 만들어지지 않습니다. 값을 넣어야 세션이 끝날 때 정산이 잡힙니다.
        </span>
      </div>

      <div className="field">
        <label htmlFor="withholding">원천징수율 (%)</label>
        <input
          id="withholding"
          name="withholding"
          type="number"
          min={0}
          max={100}
          step="0.1"
          defaultValue={withholding}
        />
        <span className="help">
          멘토가 개인이면 사업소득 원천징수 대상입니다. 세무 확인 후 값을 넣으세요.
        </span>
      </div>

      {state.message ? <div className="notice error">{state.message}</div> : null}
      {state.ok ? <div className="notice ok">{state.ok}</div> : null}

      <button className="act solid" type="submit" disabled={pending}>
        {pending ? "저장 중…" : "정산 설정 저장"}
      </button>
    </form>
  );
}
