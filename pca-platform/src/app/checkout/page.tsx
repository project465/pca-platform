import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { getProduct } from "@/lib/orders";
import { globalChannelReady, paymentProvider } from "@/lib/payments";
import { t, productName } from "@/lib/locale";
import { formatMoney } from "@/lib/money";
import { resolveLang } from "@/lib/locale-server";
import LangSwitch from "@/components/lang-switch";
import CheckoutForm from "./checkout-form";

export const metadata = { title: "결제 · CareerMatri" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; lang?: string; attempt?: string }>;
}) {
  const { product: code = "REPORT_UNIV", lang: q, attempt } = await searchParams;
  const lang = await resolveLang(q);
  // 로그인 요구로 막지 않는다. 처음 온 사람은 계정이 없고, 여기서 로그인
  // 폼만 보여주면 그대로 나간다. 가입 화면이 값을 먼저 보여주고 끝나면
  // 이 화면으로 돌려보낸다.
  const user = await currentUser();
  if (!user) {
    const back = attempt
      ? `/checkout?product=${encodeURIComponent(code)}&attempt=${encodeURIComponent(attempt)}`
      : `/checkout?product=${encodeURIComponent(code)}`;
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
          {/* **통화를 보고 적는다.** 금액에 `원` 을 박아 두면 $14.99 짜리가
              `1499원` 으로 나간다: `products.amount` 는 통화의 최소 단위
              정수이고, 쪼개지는 자릿수는 통화만 안다(`src/lib/money.ts`) */}
          <b>{formatMoney(product.amount, product.currency, lang === "ko" ? "ko" : "en")}</b>
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
          upgradesAttemptId={attempt}
          provider={provider}
          globalReady={globalReady}
          lang={lang}
        />
      </div>
    </main>
  );
}
