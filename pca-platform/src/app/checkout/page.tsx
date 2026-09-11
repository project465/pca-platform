import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { getProduct } from "@/lib/orders";
import { globalChannelReady, paymentProvider } from "@/lib/payments";
import { t, productName } from "@/lib/locale";
import { resolveLang } from "@/lib/locale-server";
import LangSwitch from "@/components/lang-switch";
import CheckoutForm from "./checkout-form";

export const metadata = { title: "결제 — METRI" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; lang?: string }>;
}) {
  const { product: code = "REPORT_UNIV", lang: q } = await searchParams;
  const lang = await resolveLang(q);
  // 로그인 요구로 막지 않는다. 처음 온 사람은 계정이 없고, 여기서 로그인
  // 폼만 보여주면 그대로 나간다. 가입 화면이 값을 먼저 보여주고 끝나면
  // 이 화면으로 돌려보낸다.
  const user = await currentUser();
  if (!user) {
    const back = `/checkout?product=${encodeURIComponent(code)}`;
    redirect(`/signup?next=${encodeURIComponent(back)}&product=${encodeURIComponent(code)}`);
  }
  if (user.mustResetPw) redirect("/password/change");
  const product = await getProduct(code);
  const provider = paymentProvider().name;
  // mock 은 두 수단을 다 흉내 낸다. portone 은 채널이 있어야 연다
  const globalReady = provider === "mock" || globalChannelReady();

  if (!product) {
    return (
      <main className="main">
        <div className="empty">
          <b>{t("payNotSold", lang)}</b>
        </div>
      </main>
    );
  }

  return (
    <main className="main">
      <div className="paywrap">
        <div className="panel-top">
          <LangSwitch current={lang} />
        </div>
        <h1>{t("payTitle", lang)}</h1>
        <div className="payitem">
          <span>{productName(product.code, lang)}</span>
          <b>{product.amount.toLocaleString("ko-KR")}원</b>
        </div>
        <ul className="paynote">
          <li>{t("payNote1", lang)}</li>
          <li>{t("payNote2", lang)}</li>
          <li>{t("payNote3", lang)}</li>
        </ul>

        {provider === "mock" ? (
          <p className="testbar">
            <b>{t("payTestMode", lang)}</b> {t("payTestBody", lang)}
          </p>
        ) : null}

        <CheckoutForm
          productCode={product.code}
          provider={provider}
          globalReady={globalReady}
          lang={lang}
        />
      </div>
    </main>
  );
}
