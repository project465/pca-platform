"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (method: string, opts: Record<string, unknown>) => Promise<void>;
    };
  }
}

/**
 * 신청이 접수되면 곧바로 결제창을 연다.
 * 결제창이 뜨기 전에 이미 신청 행과 결제 행은 만들어져 있다 — 창을 닫아도
 * '결제 대기'로 남아 내 신청 목록에서 이어서 낼 수 있다.
 */
export default function PayLauncher({
  pay,
  clientKey,
  dryRun,
}: {
  pay: { orderId: string; amount: number; requestId: string; title: string };
  clientKey: string | null;
  dryRun: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (dryRun) {
      window.location.href = `/mentoring/pay/success?orderId=${encodeURIComponent(pay.orderId)}&paymentKey=dry&amount=${pay.amount}`;
    }
  }, [dryRun, pay.orderId, pay.amount]);

  async function open() {
    if (!clientKey) {
      setError("결제 연동이 설정되지 않았습니다. 운영사에 문의하세요.");
      return;
    }
    setBusy(true);
    try {
      if (!window.TossPayments) {
        await new Promise<void>((resolve, reject) => {
          const el = document.createElement("script");
          el.src = "https://js.tosspayments.com/v1/payment";
          el.onload = () => resolve();
          el.onerror = () => reject(new Error("결제 모듈을 불러오지 못했습니다."));
          document.head.appendChild(el);
        });
      }
      const toss = window.TossPayments!(clientKey);
      const base = window.location.origin;
      await toss.requestPayment("카드", {
        amount: pay.amount,
        orderId: pay.orderId,
        orderName: pay.title,
        successUrl: `${base}/mentoring/pay/success`,
        failUrl: `${base}/mentoring/pay/fail`,
      });
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "결제를 시작하지 못했습니다.");
    }
  }

  if (dryRun) return <div className="notice">결제 확인 화면으로 이동합니다…</div>;

  return (
    <div className="pay-box">
      <div className="pay-head">
        <b>{pay.amount.toLocaleString("ko-KR")}원</b>
        <span>{pay.title}</span>
      </div>
      <p className="help">
        결제가 끝나야 멘토에게 신청이 전달됩니다. 멘토가 거절하거나 24시간 안에 답하지
        않으면 자동으로 취소되고 청구되지 않습니다.
      </p>
      <div className="req-foot">
        <button className="act solid" type="button" onClick={open} disabled={busy}>
          {busy ? "결제창 여는 중…" : "결제하기"}
        </button>
        <a className="act" href="/mentoring/requests">
          나중에 결제
        </a>
      </div>
      {error ? <div className="notice error" style={{ marginTop: 10 }}>{error}</div> : null}
    </div>
  );
}
