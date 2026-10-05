"use client";

import { useActionState } from "react";
import { refundAction, resendVerifyAction, type SupportState } from "./actions";

/**
 * 확인 메일 다시 보내기.
 *
 * **보낸 척하지 않는다.** 메일이 안 붙어 있으면 그 사실을 적는다. 조용히
 * 성공한 척하면 받은 적 없는 사람이 메일함을 계속 들여다본다.
 */
export function ResendVerify({
  labels,
}: {
  labels: { send: string; sent: string; off: string };
}) {
  const [state, run, busy] = useActionState<SupportState>(
    async () => resendVerifyAction(),
    {},
  );
  return (
    <form action={run} style={{ marginTop: 12 }}>
      <button className="sf-btn ghost sm" disabled={busy}>{labels.send}</button>
      {state.verify === "sent" ? (
        <span className="sf-meta" style={{ marginLeft: 10 }}>{labels.sent}</span>
      ) : null}
      {state.verify && state.verify !== "sent" ? (
        <span className="pxtbd" style={{ marginLeft: 10, display: "inline" }}>
          {labels.off}
        </span>
      ) : null}
    </form>
  );
}

/**
 * 환불 요청 폼.
 *
 * **사유를 고르게 하고 자유입력을 받지 않는다**(`refund_requests.reason_code`
 * 주석). 사정을 적는 칸을 두면 그 글이 5년 남는 거래 기록에 들어간다.
 */
export function RefundForm({
  orders, reasons, labels,
}: {
  orders: { orderNo: string; label: string }[];
  reasons: { code: string; label: string }[];
  labels: {
    ask: string; reason: string; order: string; sent: string; denied: string;
    open: string; why: Record<string, string>;
  };
}) {
  const [state, run, busy] = useActionState<SupportState, FormData>(refundAction, {});
  if (!orders.length) return null;
  return (
    <form action={run} className="form" style={{ marginTop: 14, maxWidth: 420 }}>
      <div className="field">
        <label htmlFor="rfOrder">{labels.order}</label>
        <select id="rfOrder" name="order" defaultValue={orders[0].orderNo}>
          {orders.map((o) => (
            <option key={o.orderNo} value={o.orderNo}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="rfReason">{labels.reason}</label>
        <select id="rfReason" name="reason" defaultValue={reasons[0].code}>
          {reasons.map((r) => (
            <option key={r.code} value={r.code}>{r.label}</option>
          ))}
        </select>
      </div>
      <div>
        <button className="sf-btn ghost sm" disabled={busy}>{labels.ask}</button>
      </div>

      {state.refund === "sent" ? (
        <p className="sf-meta" style={{ marginTop: 10 }}>{labels.sent}</p>
      ) : null}
      {state.refund === "already_open" ? (
        <p className="sf-meta" style={{ marginTop: 10 }}>{labels.open}</p>
      ) : null}
      {state.refund === "denied" ? (
        <p className="pxtbd" style={{ marginTop: 10 }}>
          {labels.denied}
          {state.deny && labels.why[state.deny] ? ` ${labels.why[state.deny]}` : ""}
        </p>
      ) : null}
    </form>
  );
}
