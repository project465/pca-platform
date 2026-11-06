import Link from "next/link";
import { headers } from "next/headers";
import { requireUser } from "@/lib/session";
import { matTitle } from "@/lib/mat/title";
import { moneyText } from "@/lib/mat/money-text";
import { matLang } from "@/lib/mat/lang";
import { TITLE_TEXT } from "../mat-text";
import { CampusWait } from "../paywall";
import { ADDON, krwPrice, priceLabel, usdPrice, type Period, type Plan } from "@/lib/pricing/config";
import { INTERVIEW_TURNS, PASS_CAPS, canBuyRefill, REFILL_HREF } from "@/lib/assistant/ai-budget";
import { RESEARCH_LIMITS } from "@/lib/pricing/config";
import { subscriptionsOpen } from "@/lib/subscriptions/open";
import { ipCountryFrom, routeForUser } from "@/lib/subscriptions/route";
import { productFor } from "@/lib/plans";
import { payOpen } from "@/lib/payments";

export const generateMetadata = () => matTitle(TITLE_TEXT.pricing);

/**
 * MAT 요금(시안 Pricing, 2026-11-03 대표 결정). 30일 · 90일 고르기, 기본 · 연구자 두 카드.
 *
 * - **값은 설정에서 읽는다**(`pricing/config.ts`). 비어 있는 값(연구자 90일 · 해외 90일)은 값도 단추도 그리지 않는다
 * - 들어 있는 횟수는 **코드의 실제 한도**(`ai-budget.ts` 의 PASS_CAPS)를 그대로 적는다. 90일은 30일 몫의 세 배다
 * - 통화는 결제 길이 정한다(`subscriptions/route.ts`): 한국 신호가 있으면 원화 · KCP, 아니면 달러 · Paddle
 * - 정기결제가 열리기 전(`subscriptionsOpen`)에는 1회 결제 기간권으로 판다. 그때 연구자 카드는 단추를 끈다
 */
export default async function MatPricing({ searchParams }: { searchParams: Promise<{ p?: string; from?: string }> }) {
  const user = await requireUser();
  const lang = await matLang();
  const PRICING = moneyText(lang).PRICING;
  const sp = await searchParams;
  const period: Period = sp.p === "90" ? 90 : 30;
  const route = await routeForUser(user.id, ipCountryFrom(await headers()));
  const subs = subscriptionsOpen();
  const units = period / 30;
  const price = (plan: Plan) => route.currency === "KRW"
    ? priceLabel(krwPrice(plan, period), "KRW")
    : priceLabel(usdPrice(plan, period, route.country), "USD");
  const href = (plan: Plan): string | null => {
    if (!price(plan)) return null;
    if (subs) return `/mat/subscribe?plan=${plan}&p=${period}`;
    /* 정기결제 전: 기본만 1회 결제 기간권(원화)으로 판다 */
    const code = productFor(plan, period);
    return plan === "basic" && route.currency === "KRW" && code && payOpen("KR") ? `/checkout?product=${code}` : null;
  };
  const counts = [
    PRICING.perMonth(PASS_CAPS.posting * units, PRICING.countUnit.posting),
    PRICING.perMonth(PASS_CAPS.sentence * units, PRICING.countUnit.sentence),
    `${PRICING.perMonth(Math.floor(PASS_CAPS.interview / INTERVIEW_TURNS) * units, PRICING.countUnit.interview)} · ${PRICING.interviewTurns(INTERVIEW_TURNS)}`,
    PRICING.perMonth(PASS_CAPS.upload * units, PRICING.countUnit.upload),
  ];
  const addon = route.currency === "KRW" ? priceLabel(ADDON.KRW, "KRW") : priceLabel(ADDON.USD, "USD");
  const refill = addon && route.currency === "KRW" ? await canBuyRefill(user.id) : false;

  const card = (plan: Plan, main: boolean) => {
    const p = price(plan);
    const go = href(plan);
    return (
      <article className={`mt-plan${main ? " is-main" : ""}`} key={plan}>
        <h3>{plan === "basic" ? PRICING.basic : PRICING.research}</h3>
        <p className="mt-plan-for">{plan === "basic" ? PRICING.basicFor : PRICING.researchFor}</p>
        {p ? <p className="mt-plan-price">{p}<small>{PRICING.per(period)}</small></p> : <p className="mt-note">{PRICING.notOnSale}</p>}
        <ul>
          {plan === "basic" ? counts.map((c) => <li key={c}>{c}</li>) : (
            <>
              <li>{PRICING.researchAll}</li>
              <li>{PRICING.researchPdf} · {PRICING.pages(RESEARCH_LIMITS.pagesPer30 * units)}</li>
              <li>{PRICING.researchDocs}</li>
              <li>{PRICING.researchJobs}</li>
            </>
          )}
        </ul>
        {go ? (
          <Link className={`mt-btn is-block${main ? " is-main" : ""}`} href={go}>
            {plan === "basic" ? PRICING.startBasic : PRICING.startResearch}
          </Link>
        ) : p ? <button type="button" className="mt-btn is-block" disabled aria-disabled="true">{PRICING.payNotReady}</button> : null}
      </article>
    );
  };

  return (
    <main>
      <div className="mt-top"><span className="mt-week">MAT</span></div>
      <h1 className="mt-h1">{PRICING.title}</h1>
      {/* 학교 발급 계정인데 학교 MAT 이 아직 닫혀 있으면 값보다 먼저 그 사실을 적는다 */}
      <CampusWait userId={user.id} lang={lang} />
      <nav className="mt-seg" aria-label={PRICING.title}>
        <a href="?p=30" className={period === 30 ? "is-on" : undefined} aria-current={period === 30 ? "page" : undefined}>{PRICING.t30}</a>
        <a href="?p=90" className={period === 90 ? "is-on" : undefined} aria-current={period === 90 ? "page" : undefined}>{PRICING.t90} · {PRICING.t90note}</a>
      </nav>
      <div className="mt-plans">
        {card("basic", true)}
        {card("research", false)}
      </div>
      <p className="mt-note" style={{ marginTop: 14 }}>
        {subs ? <>{PRICING.auto(period)}<br />{PRICING.keep}</> : PRICING.oneTime}
      </p>
      {route.currency === "USD" ? <p className="mt-note" data-currency="USD">{PRICING.usd}</p> : <span hidden data-currency="KRW" />}
      {refill ? (
        <p className="mt-note">{PRICING.addon} {addon} · {PRICING.addonNote} · <Link href={REFILL_HREF}>{PRICING.addon}</Link></p>
      ) : null}
      <p className="mt-note">
        <Link href={lang === "en" ? "/legal/subscription?lang=en" : "/legal/subscription"}>{PRICING.legal}</Link> · <Link href={lang === "en" ? "/legal/refund?lang=en" : "/legal/refund"}>{PRICING.refund}</Link>
      </p>
    </main>
  );
}
