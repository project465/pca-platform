"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { t, type Lang } from "@/lib/locale";
import { createOrderAction, mockPayAction, type CheckoutState } from "./actions";
import { formatMoney } from "@/lib/money";

declare global {
  interface Window {
    PortOne?: {
      requestPayment(req: Record<string, unknown>): Promise<{ code?: string; message?: string }>;
    };
    /** 포트원 V1(아임포트) 결제창 모듈 */
    IMP?: {
      init(impCode: string): void;
      request_pay(req: Record<string, unknown>, cb: (rsp: V1Rsp) => void): void;
    };
  }
}

type V1Rsp = { success?: boolean; error_code?: string | null; error_msg?: string | null; imp_uid?: string | null; merchant_uid?: string };

/**
 * 포트원 V1 결제창을 열고 결과를 V2 와 같은 꼴로 돌려준다. 실패 · 취소면 `code`, 성공이면 결제 고유번호(imp_uid).
 * 모바일은 결제창이 `m_redirect_url` 로 넘어가므로 이 함수가 돌아오지 않을 수 있다(완료 화면이 확정한다)
 */
function requestV1(t: { storeId?: string; channelKey?: string; orderNo: string; orderName: string; amount: number; currency: string; redirectUrl: string; noticeUrl?: string }):
  Promise<{ code?: string; message?: string; impUid?: string }> {
  const IMP = window.IMP!;
  IMP.init(t.storeId ?? "");
  return new Promise((resolve) => {
    IMP.request_pay({
      channelKey: t.channelKey,
      pay_method: "card",
      merchant_uid: t.orderNo,
      name: t.orderName,
      amount: t.amount,
      currency: t.currency,
      m_redirect_url: t.redirectUrl,
      /* 결제 알림은 이 주소로(포트원 콘솔의 결제알림 주소는 다른 서비스가 쓰고 있어 바꾸지 않는다) */
      ...(t.noticeUrl ? { notice_url: t.noticeUrl } : {}),
    }, (rsp) => {
      if (rsp.error_code || rsp.success === false || !rsp.imp_uid) {
        resolve({ code: rsp.error_code || "FAILED", message: rsp.error_msg ?? undefined });
      } else resolve({ impUid: rsp.imp_uid });
    });
  });
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
  upgradesAttemptId,
  provider,
  globalReady,
  foreignOnly = false,
  lang,
}: {
  productCode: string;
  /** 무료로 본 결과지를 여는 결제라면 그 응시 번호 */
  upgradesAttemptId?: string;
  provider: string;
  /** 해외 카드 채널이 설정돼 있는가. 없으면 선택지를 열지 않는다 */
  globalReady: boolean;
  /**
   * 원화가 아닌 상품(해외판 MAT, 달러). **국내 카드로는 낼 수 없다**: 국내 채널은
   * 원화만 받아서, 그쪽으로 보내면 결제창에서 실패한다. 해외 카드만 열고, 그
   * 채널이 아직 없으면 결제 단추를 끈다(`payGlobalOff` 가 까닭을 적는다)
   */
  foreignOnly?: boolean;
  lang: Lang;
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(createOrderAction, {});
  const [launching, setLaunching] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  /* 결제창을 열고 한참 지나도 아무 답이 없을 때 보이는 안내(창은 그대로 둔다: 카드 정보를 적는 중일 수 있다) */
  const [slow, setSlow] = useState(false);
  /* **한 결제 아이디로 결제창을 한 번만 연다.** 전에는 실패하면 `launching` 이 풀리면서 같은 티켓으로 다시 열었다 */
  const opened = useRef<string | null>(null);
  const ticket = state.ticket;
  const en = lang !== "ko";

  // 실제 PG 는 티켓을 받는 즉시 결제창을 띄운다
  useEffect(() => {
    if (!ticket || !provider.startsWith("portone") || opened.current === ticket.providerPaymentId) return;
    opened.current = ticket.providerPaymentId;
    setLaunching(true);
    setSdkError(null);
    setSlow(false);
    const timer = window.setTimeout(() => setSlow(true), 20_000);
    /* 실패하면 버튼을 다시 연다. 다시 누르면 새 주문 · 새 결제 아이디로 연다 */
    const fail = (msg: string) => { window.clearTimeout(timer); setSlow(false); setSdkError(msg); setLaunching(false); };

    (async () => {
      const v1 = ticket.sdk === "v1";
      if (v1 ? !window.IMP : !window.PortOne) {
        fail(en ? "The payment module did not load. Refresh the page and try again." : "결제 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.");
        return;
      }
      /*
       * **결제 요청이 바로 실패해도 화면을 풀어 준다**(2026-11-06 운영: 포트원이 0.03초 만에 FAILED 를 냈는데
       * `결제창 여는 중…` 에 멈췄다). SDK 가 던지면 잡아서 까닭을 보이고, 코드가 오면 그 글을 보인다
       */
      let res: { code?: string; message?: string; impUid?: string };
      try {
        res = v1 ? await requestV1(ticket) : await window.PortOne!.requestPayment({
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
      } catch (e) {
        fail(`${en ? "Could not start the payment." : "결제를 시작하지 못했습니다."} ${e instanceof Error ? e.message : ""}`.trim());
        return;
      }
      window.clearTimeout(timer);
      setSlow(false);
      // 창을 닫거나 실패하면 code 가 온다
      if (res?.code) {
        fail(res.message ?? (en ? "The payment was cancelled." : "결제가 취소되었습니다."));
        return;
      }
      /* **PC 에서는 성공해도 돌아오지 않을 수 있다.** 포트원 SDK 는
         `redirectUrl` 이 있어도 `forceRedirect` 가 아니면 PC 결제창을
         반환값 방식으로 끝낸다(포트원 V2 결제창 가이드). 그대로 두면 결제를
         마친 손님이 결제 화면에 멈춰 선다. 완료 화면으로 직접 보내고,
         거기서 서버가 PG 에 다시 물어 확정한다(값을 믿지 않는 것은 같다) */
      if (res) {
        const sep = ticket.redirectUrl.includes("?") ? "&" : "?";
        /* V1 은 결제 고유번호(imp_uid)를 넘긴다. 없으면 주문번호로 찾는다(`v1Lookup`) */
        window.location.assign(
          `${ticket.redirectUrl}${sep}paymentId=${encodeURIComponent(res.impUid ?? ticket.providerPaymentId)}`);
        return;
      }
      setLaunching(false);
    })();
  }, [ticket, provider, en]);

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
            <dd>{formatMoney(ticket.amount, ticket.currency, lang === "ko" ? "ko" : "en")}</dd>
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
          <button className="act solid full" type="submit">
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
      {upgradesAttemptId && <input type="hidden" name="attempt" value={upgradesAttemptId} />}

      <fieldset className="paymethod">
        <legend>{t("payMethodLabel", lang)}</legend>
        <label>
          <input type="radio" name="region" value="domestic"
            defaultChecked={!foreignOnly} disabled={foreignOnly} />
          <span>
            <b>{t("payDomestic", lang)}</b>
            <em>{t("payDomesticNote", lang)}</em>
          </span>
        </label>
        <label className={globalReady ? undefined : "off"}>
          <input type="radio" name="region" value="global" disabled={!globalReady}
            defaultChecked={foreignOnly && globalReady} />
          <span>
            <b>{t("payGlobal", lang)}</b>
            <em>{globalReady ? t("payGlobalNote", lang) : t("payGlobalOff", lang)}</em>
          </span>
        </label>
      </fieldset>

      {state.error ? <p className="err">{state.error}</p> : null}
      {sdkError ? <p className="err" role="alert">{sdkError}</p> : null}
      {slow && launching ? (
        <p className="err" role="status">
          {en ? "If you don't see the payment window, " : "결제창이 보이지 않으면 "}
          <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>{en ? "refresh and try again" : "새로고침 후 다시 시도해 주세요"}</a>.
        </p>
      ) : null}
      <button className="act solid full" type="submit"
        disabled={pending || launching || (foreignOnly && !globalReady)}>
        {pending || launching ? t("payOpening", lang) : t("payGo", lang)}
      </button>
    </form>
  );
}
