import { requireUser } from "@/lib/session";
import { getProduct, orderName } from "@/lib/orders";
import { globalChannelReady, paymentProvider } from "@/lib/payments";
import CheckoutForm from "./checkout-form";

export const metadata = { title: "결제 — METRI" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  await requireUser();
  const { product: code = "REPORT_UNIV" } = await searchParams;
  const product = await getProduct(code);
  const provider = paymentProvider().name;
  // mock 은 두 수단을 다 흉내 낸다. portone 은 채널이 있어야 연다
  const globalReady = provider === "mock" || globalChannelReady();

  if (!product) {
    return (
      <main className="main">
        <div className="empty">
          <b>판매하지 않는 상품입니다</b>
          주소를 확인해 주세요.
        </div>
      </main>
    );
  }

  return (
    <main className="main">
      <div className="paywrap">
        <h1>결제</h1>
        <div className="payitem">
          <span>{orderName(product.code)}</span>
          <b>{product.amount.toLocaleString("ko-KR")}원</b>
        </div>
        <ul className="paynote">
          <li>결제하면 응시권 1개가 발급됩니다.</li>
          <li>응시를 시작하기 전에는 전액 환불됩니다.</li>
          <li>결과지는 응시를 마치면 바로 열립니다.</li>
        </ul>

        {provider === "mock" ? (
          <p className="testbar">
            <b>테스트 모드</b> 실제로 결제되지 않습니다. 가맹점 심사가 끝나면
            <code>PAYMENTS_PROVIDER=portone</code> 으로 바꾸기만 하면 됩니다.
          </p>
        ) : null}

        <CheckoutForm productCode={product.code} provider={provider} globalReady={globalReady} />
      </div>
    </main>
  );
}
