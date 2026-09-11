"use client";

import { useActionState, useEffect, useState } from "react";
import { t, type Lang } from "@/lib/locale";
import { createOrderAction, mockPayAction, type CheckoutState } from "./actions";

declare global {
  interface Window {
    PortOne?: {
      requestPayment(req: Record<string, unknown>): Promise<{ code?: string; message?: string }>;
    };
  }
}

/**
 * 결제 버튼.
 *
 * 1) 서버가 주문을 만들고 결제창에 넘길 값(ticket)을 돌려준다
 * 2) portone 이면 PortOne SDK 로 결제창을 띄우고, mock 이면 가짜 결제창을 그린다
 * 3) 어느 쪽이든 /checkout/complete 로 돌아오고, **확정은 서버가 조회해서 한다**
 *
 * 금액은 화면에서 만들지 않는다. ticket 에 담겨 오는 값을 그대로 쓴다.
 */
export default function CheckoutForm({
  productCode,
  provider,
  globalReady,
  lang,
}: {
  productCode: string;
  provider: string;
  /** 해외 카드 채널이 설정돼 있는가. 없으면 선택지를 열지 않는다 */
  globalReady: boolean;
  lang: Lang;
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(createOrderAction, {});
  const [launching, setLaunching] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const ticket = state.ticket;

  // 실제 PG 는 티켓을 받는 즉시 결제창을 띄운다
  useEffect(() => {
    if (!ticket || provider !== "portone" || launching) return;
    setLaunching(true);

    (async () => {
      if (!window.PortOne) {
        setSdkError("결제 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.");
        return;
      }
      const res = await window.PortOne.requestPayment({
        storeId: ticket.storeId,
        channelKey: ticket.channelKey,
        paymentId: ticket.providerPaymentId,
        orderName: ticket.orderName,
        totalAmount: ticket.amount,
        currency: `CURRENCY_${ticket.currency}`,
        payMethod: "CARD",
        // 해외 채널은 PG 쪽에서 Visa·Mastercard 등 국제 브랜드를 처리한다
        customData: ticket.orderNo,
        redirectUrl: ticket.redirectUrl,
      });
      // 창을 닫거나 실패하면 code 가 온다. 성공은 redirectUrl 로 빠진다
      if (res?.code) setSdkError(res.message ?? "결제가 취소되었습니다.");
      setLaunching(false);
    })();
  }, [ticket, provider, launching]);

  if (ticket && provider === "mock") {
    return (
      <div className="mockpay">
        <div className="mockpay-head">
          <b>테스트 결제창</b>
          <span>실제 PG 라면 이 자리에 카드사 창이 뜹니다</span>
        </div>
        <dl>
          <div>
            <dt>주문번호</dt>
            <dd>{ticket.orderNo}</dd>
          </div>
          <div>
            <dt>결제금액</dt>
            <dd>{ticket.amount.toLocaleString("ko-KR")}원</dd>
          </div>
        </dl>
        <form
          action={async (fd) => {
            await mockPayAction(fd);
            window.location.href = ticket.redirectUrl;
          }}
        >
          <input type="hidden" name="paymentId" value={ticket.providerPaymentId} />
          <input type="hidden" name="orderNo" value={ticket.orderNo} />
          <input type="hidden" name="amount" value={ticket.amount} />
          <input type="hidden" name="currency" value={ticket.currency} />
          <button className="btn solid lg" type="submit">
            결제하기 (테스트)
          </button>
        </form>
        <a className="mockpay-cancel" href="/checkout">
          취소하고 돌아가기
        </a>
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="product" value={productCode} />

      <fieldset className="paymethod">
        <legend>{t("payMethodLabel", lang)}</legend>
        <label>
          <input type="radio" name="region" value="domestic" defaultChecked />
          <span>
            <b>{t("payDomestic", lang)}</b>
            <em>{t("payDomesticNote", lang)}</em>
          </span>
        </label>
        <label className={globalReady ? undefined : "off"}>
          <input type="radio" name="region" value="global" disabled={!globalReady} />
          <span>
            <b>{t("payGlobal", lang)}</b>
            <em>{globalReady ? t("payGlobalNote", lang) : t("payGlobalOff", lang)}</em>
          </span>
        </label>
      </fieldset>

      {state.error ? <p className="err">{state.error}</p> : null}
      {sdkError ? <p className="err">{sdkError}</p> : null}
      <button className="btn solid lg" type="submit" disabled={pending || launching}>
        {pending || launching ? t("payOpening", lang) : t("payGo", lang)}
      </button>
    </form>
  );
}
