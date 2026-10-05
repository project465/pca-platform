import Link from "next/link";
import { requireUser } from "@/lib/session";
import { settlePayment } from "@/lib/orders";
import { paymentProvider } from "@/lib/payments";
import { t } from "@/lib/locale";
import { resolveLang } from "@/lib/locale-server";
import { BRAND, toLang2, txer } from "@/lib/surface-text";

export const metadata = { title: "결제 결과 · CareerMatri" };

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

  /**
   * ME_V2 를 사면 결제 다음 걸음이 '검사 시작' 이다.
   *
   * 옛 검사와 같은 화면으로 보내면 `/test` 로 가고, 거기는 좌석을 찾는다.
   * ME_V2 는 좌석이 아니라 이용권이 문을 여므로 그 화면이 "응시권이
   * 없습니다" 를 띄운다. **돈을 낸 사람에게 그 문장이 나가면 안 된다.**
   */
  if (result.ok && result.assessmentVersion === "ME_V2" && !result.upgradedAttemptId) {
    const L = toLang2(lang);
    const T = txer(L);
    return (
      <div className="pub">
        <div className="pubwrap">
          <div className="asdone">
            <div className="sf-eyebrow">{BRAND.root}</div>
            <h1 className="sf-h1" style={{ marginTop: 10 }}>{T("pxPaySuccess")}</h1>
            <p className="sf-sub">{T("okBody")}</p>
            <dl className="sf-defs" style={{ marginTop: 20 }}>
              <div className="sf-def">
                <dt>{T("okOrderNo")}</dt>
                <dd>{result.orderNo}</dd>
              </div>
              <div className="sf-def">
                <dt>{T("okTier")}</dt>
                <dd>{result.tier ?? "—"}</dd>
              </div>
            </dl>
            <Link href="/assessment/start" className="sf-btn accent" style={{ marginTop: 24 }}>
              {T("okStart")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="main">
      <div className="paywrap">
        {result.ok ? (
          <>
            <h1>{t("payDoneTitle", lang)}</h1>
            <p className="paydone">
              <b>{result.orderNo}</b>
              <br />
              {result.upgradedAttemptId
                ? t("payDoneUpgradeBody", lang)
                : t("payDoneBody", lang)}
            </p>
            {/* 업그레이드면 시작할 것이 없다. 이미 낸 결과지로 보낸다. */}
            <Link
              className="act solid"
              href={result.upgradedAttemptId ? `/report/${result.upgradedAttemptId}` : "/test"}
            >
              {result.upgradedAttemptId ? t("payGoReport", lang) : t("payGoTest", lang)}
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
