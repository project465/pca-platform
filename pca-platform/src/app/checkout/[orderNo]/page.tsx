import Link from "next/link";
import { queryOne } from "@/lib/db";
import { formatPrice } from "@/lib/pricing";
import { paymentsEnabled, providerName } from "@/lib/payments";
import { PayPanel } from "./pay-panel";

/**
 * 결제창.
 *
 * 소개 사이트는 정적이라 결제대행사 SDK 를 띄우지 않는다(키와 서명이
 * 오가는 곳을 누구나 원고를 뜯어볼 수 있는 판에 두지 않는다). 주문번호만
 * 들고 여기로 넘어오고, 결제는 여기서 끝낸다.
 *
 * **금액은 주문에서 읽는다.** 주소나 질의문자열로 받지 않는다 — 받게 해
 * 두면 `?amount=100` 이 언젠가 들어온다.
 */
export const dynamic = "force-dynamic";

export default async function Checkout({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;

  const order = await queryOne<{
    order_no: string; status: string; amount: string; currency: string;
    site: string; buyer_name: string;
  }>(
    `SELECT order_no, status, amount::text, currency, site, buyer_name
       FROM orders WHERE order_no = $1`,
    [orderNo],
  );

  if (!order) {
    return (
      <main className="wrap narrow">
        <h1>주문을 찾을 수 없습니다</h1>
        <p>주소가 잘못되었거나 주문이 만료되었습니다.</p>
        <Link className="act" href="/">처음으로</Link>
      </main>
    );
  }

  const lang = order.site === "kr" ? "ko" : "en";
  const amount = formatPrice(
    { amount: Number(order.amount), currency: order.currency as "KRW" | "USD" | "KZT" },
    lang,
  );

  /* 이미 끝난 주문에 결제창을 다시 띄우지 않는다. 두 번 긁는 사고가
     여기서 난다 — 새로고침 한 번이면 충분하다 */
  if (order.status !== "created") {
    const done = order.status === "fulfilled" || order.status === "paid";
    return (
      <main className="wrap narrow">
        <h1>{done ? "결제가 끝났습니다" : "결제할 수 없는 주문입니다"}</h1>
        <p>
          주문번호 {order.order_no} · {amount}
        </p>
        {done ? (
          <p>
            응시 안내를 메일로 보내드렸습니다. 메일이 오지 않았다면
            hari_info@hari.re.kr 로 주문번호와 함께 알려주세요.
          </p>
        ) : (
          <p>hari_info@hari.re.kr 로 주문번호와 함께 알려주세요.</p>
        )}
      </main>
    );
  }

  if (!paymentsEnabled()) {
    /* 여기까지 오면 안 된다 — 소개 사이트의 단추가 먼저 사라져 있어야
       한다. 그래도 왔다면 결제창을 띄우지 않고 사실대로 말한다 */
    return (
      <main className="wrap narrow">
        <h1>지금은 결제할 수 없습니다</h1>
        <p>
          주문번호 {order.order_no} 는 남아 있습니다. hari_info@hari.re.kr 로
          알려주시면 연결해 드리겠습니다.
        </p>
      </main>
    );
  }

  return (
    <main className="wrap narrow">
      <h1>결제</h1>
      <p>
        {order.buyer_name}님 · 개인 진단 · <b>{amount}</b>
      </p>
      <p className="small">주문번호 {order.order_no}</p>
      <PayPanel
        orderNo={order.order_no}
        amount={Number(order.amount)}
        currency={order.currency}
        provider={providerName()}
        storeId={process.env.PAYMENTS_STORE_ID ?? ""}
        channelKey={process.env.PAYMENTS_CHANNEL_KEY ?? ""}
      />
      <p className="small">
        결제가 끝나면 응시 링크를 메일로 보내드립니다. 담당자 승인을
        기다리실 필요가 없습니다.
      </p>
    </main>
  );
}
