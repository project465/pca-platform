import Link from "next/link";
import { startPathFor } from "@/lib/engine-entry";
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
   * 결제 다음 걸음은 **산 상품이 가리키는 검사**다.
   *
   * 전에는 이 자리에 `/assessment/start` 가 글자로 적혀 있었다. 그래서
   * 판본이 ME_V3 로 올라간 뒤에도 결제를 마친 사람이 **앞 판본(ME_V2)의
   * 검사로** 떨어졌다. 이제 `startPathFor()` 가 `products.
   * assessment_version` 을 보고 정한다(설계 원칙 10).
   *
   * **옛 판본이면 주소를 돌려주지 않는다.** 그러면 이 분기가 서지 않고
   * 아래 일반 화면으로 간다 — 새로 산 사람을 옛 검사로 보내는 것보다
   * 지원으로 보내는 쪽이 덜 틀린다. 그리고 공개 가격표가 이미 지금
   * 판본만 내놓으므로 이 자리에 옛 판본이 올 일은 없다.
   */
  const startAt = startPathFor(result.ok ? result.assessmentVersion : null);
  if (result.ok && startAt && !result.upgradedAttemptId) {
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
            <Link href={startAt} className="sf-btn accent" style={{ marginTop: 24 }}>
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
            <Link className="act" href="/me">
              {t("repBack", lang)}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
