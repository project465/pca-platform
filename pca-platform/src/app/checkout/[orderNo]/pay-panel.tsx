"use client";

import { useState } from "react";

/**
 * 결제대행사 결제창을 띄우는 자리.
 *
 * ⚠️ **여기 한 곳만 대행사 문서를 보고 맞춰야 한다.** 나머지 흐름은
 * 대행사를 바꿔도 그대로다 — 주문은 서버가 만들고, 발급은 웹훅이 하고,
 * 금액은 되물어 확인한다.
 *
 * 이 화면이 "결제됐다" 고 말하는 것은 **아무 의미가 없다.** 응시권을
 * 만드는 것은 브라우저가 아니라 대행사가 서버로 보내는 웹훅이다. 사람이
 * 결제 직후 창을 닫아도 발급은 그대로 일어난다 — 반대로, 이 화면에서
 * 성공했다고 떠도 웹훅이 오지 않았으면 아직 아무것도 생기지 않은 것이다.
 * 그래서 아래 문구는 "결제창이 닫혔다" 까지만 말한다.
 */
declare global {
  interface Window {
    PortOne?: {
      requestPayment(req: Record<string, unknown>): Promise<{ code?: string; message?: string }>;
    };
  }
}

export function PayPanel(p: {
  orderNo: string;
  amount: number;
  currency: string;
  provider: string;
  storeId: string;
  channelKey: string;
}) {
  const [state, setState] = useState<"idle" | "opening" | "closed" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function pay() {
    if (!window.PortOne) {
      setState("error");
      setMsg("결제 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.");
      return;
    }
    if (!p.storeId || !p.channelKey) {
      setState("error");
      setMsg("결제 설정이 끝나지 않았습니다. hari_info@hari.re.kr 로 알려주세요.");
      return;
    }

    setState("opening");
    try {
      const res = await window.PortOne.requestPayment({
        storeId: p.storeId,
        channelKey: p.channelKey,
        paymentId: p.orderNo,
        orderName: "METRI 개인 진단",
        totalAmount: p.amount,
        currency: `CURRENCY_${p.currency}`,
        payMethod: "CARD",
        /* 웹훅이 주문을 찾는 유일한 끈이다. 대행사가 주는 다른 필드에
           기대지 않고 우리가 넣은 것만 믿는다 (lib/payments.ts) */
        customData: JSON.stringify({ orderNo: p.orderNo }),
      });

      if (res?.code) {
        setState("error");
        setMsg(res.message ?? "결제가 취소되었거나 실패했습니다.");
        return;
      }
      setState("closed");
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error ? e.message : "결제 중 문제가 생겼습니다.");
    }
  }

  if (state === "closed") {
    return (
      <div className="notice ok">
        <b>결제창이 닫혔습니다.</b>
        <p>
          승인이 확인되면 응시 링크를 메일로 보내드립니다. 보통 1분 안에
          도착합니다. 10분이 지나도 오지 않으면 주문번호 {p.orderNo} 와 함께
          hari_info@hari.re.kr 로 알려주세요.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* 대행사 SDK. 결제창을 여는 순간에만 필요하다 */}
      <script src="https://cdn.portone.io/v2/browser-sdk.js" async />
      <button className="act solid full" type="button" onClick={pay} disabled={state === "opening"}>
        {state === "opening" ? "결제창을 여는 중…" : "결제하기"}
      </button>
      {state === "error" ? <p className="notice err">{msg}</p> : null}
    </>
  );
}
