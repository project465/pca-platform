import Link from "next/link";
import { requireUser } from "@/lib/session";
import { settlePayment } from "@/lib/orders";
import { paymentProvider } from "@/lib/payments";
import { t } from "@/lib/locale";
import { resolveLang } from "@/lib/locale-server";

export const metadata = { title: "결제 결과 — METRI" };

/**
 * 결제창에서 돌아오는 자리.
 *
 * 쿼리에 온 값으로 "성공" 이라고 쓰지 않는다. 그 값은 사용자가 고칠 수 있다.
 * 서버가 PG 에 직접 물어본 결과로만 확정한다.
 */
export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<{
    order?: string;
    paymentId?: string;
    code?: string;
    message?: string;
    lang?: string;
  }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const lang = await resolveLang(sp.lang);

  // PortOne 은 paymentId 를, mock 은 order 를 돌려준다
  const key =
    sp.paymentId ??
    (sp.order ? (paymentProvider().name === "mock" ? `mock_${sp.order}` : sp.order) : null);

  if (sp.code) {
    return (
      <main className="main">
        <div className="empty">
          <b>{t("payFailTitle", lang)}</b>
          {sp.message ?? ""}
          <Link className="act" href="/checkout">
            {t("payGo", lang)}
          </Link>
        </div>
      </main>
    );
  }

  if (!key) {
    return (
      <main className="main">
        <div className="empty">
          <b>{t("payFailTitle", lang)}</b>
        </div>
      </main>
    );
  }

  const result = await settlePayment(key);

  return (
    <main className="main">
      <div className="paywrap">
        {result.ok ? (
          <>
            <h1>{t("payDoneTitle", lang)}</h1>
            <p className="paydone">
              <b>{result.orderNo}</b>
              <br />
              {t("payDoneBody", lang)}
            </p>
            <Link className="act solid" href="/test">
              {t("payGoTest", lang)}
            </Link>
          </>
        ) : (
          <>
            <h1>{t("payFailTitle", lang)}</h1>
            <p className="err">{result.reason}</p>
            <Link className="act" href="/my">
              {t("repBack", lang)}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
