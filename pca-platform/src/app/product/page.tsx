import Link from "next/link";
import BrandHome from "@/components/sf/brand-home";
import PublicFooter from "@/components/sf/public-footer";
import { currentUser } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { toLang2, BRAND } from "@/lib/surface-text";
import { PRODUCT } from "@/lib/product-copy";
import CareerFlow from "@/components/sf/career-flow";
import { TIERS, valueOf } from "@/lib/tiers";
import { catalogFor, priceState, sellable } from "@/lib/catalog";
import { money, resolveMarket } from "@/lib/market";
import { supportConfig } from "@/lib/support";
import { step } from "@/lib/funnel-server";
import LangSelect from "@/components/sf/lang-select";
import NotOpen from "@/components/sf/not-open";
import { publicCommerceGate } from "@/lib/public-gate";

export const metadata = { title: `${BRAND.root}` };

/**
 * 상품 쪽. 처음 온 사람이 사기 전에 읽는 자리다.
 *
 * **열세 절을 받은 규격 순서대로 둔다**(§5). 히어로 · 겪는 것 · 하는 일 ·
 * 받는 것 · 등급 비교 · 견본 · 진행 · 누구에게 · 말하지 않는 것 · 자주
 * 묻는 것 · 값과 단추 · 환불과 문의 · 사업자 표시.
 *
 * **방법보다 받는 것을 앞세운다.** 92문항과 산식은 아래로 내렸다. 처음 온
 * 사람이 알고 싶은 것은 이 검사를 보면 무엇을 들고 나가는지다.
 *
 * **등급 설명은 `tiers.ts` 한 곳에서 온다.** 가격표와 여기가 각각 적으면
 * 둘이 갈리고, 갈린 날 사는 쪽은 둘 중 하나를 보고 결제한다.
 *
 * **방문을 센다.** 전환율의 분모가 이 쪽이고, 세지 않으면 "몇 명이 와서
 * 몇 명이 샀는가" 에 답할 수 없다(`funnel.ts`).
 */
export default async function ProductPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; market?: string }>;
}) {
  const sp = await searchParams;
  const L = toLang2(await resolveLang(sp.lang));

  /* **운영에서는 빈칸이 있는 동안 상거래 화면을 열지 않는다.** 전자상거래법
     제10조 표시와 환불 연락처가 비어 있으면 `확인 필요` 가 사는 사람의
     화면에 찍힌다. 공개 전에는 그게 할 일 목록이라 그대로 두고, 운영에서는
     닫는다(`public-gate.ts`) */
  const gate = await publicCommerceGate();
  if (!gate.open) return <NotOpen lang={L} />;
  const user = await currentUser();
  const mk = await resolveMarket(sp.market);
  const list = await catalogFor(mk.market);
  const sup = await supportConfig();
  const P = PRODUCT;
  /* **링크가 시장을 떨어뜨리지 않게 들고 다닌다.** 쿠키가 있어도 주소에
     적어 두면, 누가 그 주소를 그대로 복사해 보내도 같은 값이 보인다 */
  const q = `?market=${mk.market}${sp.lang ? `&lang=${sp.lang}` : ""}`;

  await step("landing", {
    userId: user?.id ?? null,
    props: { market: mk.market, locale: L },
  });

  /* 값이 승인된 등급 가운데 가장 싼 것을 단추 옆에 적는다. 하나도
     승인되지 않았으면 금액 자리를 비운다. **지어내지 않는다** */
  const priced = list
    .filter((p) => priceState(p) === "PAID_APPROVED")
    .sort((a, b) => a.amount - b.amount);
  const from = priced.length ? money(priced[0].amount, priced[0].currency, L) : null;
  const canBuy = list.some((p) => sellable(p).ok);

  return (
    <div className="pub">
      <header className="pubtop">
        {/* 로고와 브랜드 글자가 한 덩어리로 홈으로 간다. 로그인했으면 그
            역할의 첫 화면, 아니면 공개 홈이다 */}
        <BrandHome />
        <div className="pubtop-r">
          <LangSelect current={L} />
          <Link href={`/pricing${q}`} className="sf-btn ghost sm">{P.nav.pricing[L]}</Link>
          <Link href={user ? "/me" : "/login"} className="sf-btn ghost sm">
            {user ? (L === "en" ? "My page" : "내 화면") : P.nav.signin[L]}
          </Link>
        </div>
      </header>

      <div className="pubwrap">
        {/* 1. 히어로 */}
        <div className="pxhero">
          <div className="sf-eyebrow">{P.hero.sub[L]}</div>
          <h1>{P.hero.title[L]}</h1>
          <p>{P.hero.body[L]}</p>
          <div className="pdcta" style={{ justifyContent: "center" }}>
            <Link href={`/pricing${q}`} className="sf-btn accent big">
              {P.hero.cta[L]}{from ? ` · ${from}` : ""}
            </Link>
            <Link href={`/sample${q}`} className="sf-btn ghost big">{P.sample.cta[L]}</Link>
          </div>
        </div>

        {/* 제품의 사고 순서. **가격표와 같은 한 벌을 쓴다** */}
        <CareerFlow lang={L} />

        {/* 2. 겪고 있는 것 */}
        <section className="pdsec">
          <h2>{P.problem.title[L]}</h2>
          <ul className="pdlist">
            {P.problem.items.map((x) => <li key={x.ko}>{x[L]}</li>)}
          </ul>
        </section>

        {/* 3. 하는 일 */}
        <section className="pdsec">
          <h2>{P.what.title[L]}</h2>
          <p>{P.what.body[L]}</p>
          <ul className="pdlist">
            {P.what.items.map((x) => <li key={x.ko}>{x[L]}</li>)}
          </ul>
        </section>

        {/* 4. 받는 것 */}
        <section className="pdsec">
          <h2>{P.gets.title[L]}</h2>
          <ul className="pdlist">
            {P.gets.items.map((x) => <li key={x.ko}>{x[L]}</li>)}
          </ul>
        </section>

        {/* 5. 등급 비교. **문항 수를 앞세우지 않는다**(규격 §4) */}
        <section className="pdsec">
          <h2>{P.nav.pricing[L]}</h2>
          <div className="pxtiers">
            {TIERS.map((t) => {
              const v = valueOf(t, L);
              return (
                <article key={t} className={t === "STANDARD" ? "pxtier is-mid" : "pxtier"}>
                  <h2>{t}</h2>
                  <p className="pxwhat"><b>{v.headline}</b></p>
                  <ul className="pdlist" style={{ marginTop: 14 }}>
                    {v.gets.map((g) => <li key={g}>{g}</li>)}
                  </ul>
                  <p className="pxq" style={{ marginTop: 16 }}>{v.who}</p>
                  <Link href={`/pricing${q}`} className="sf-btn ghost"
                    style={{ marginTop: 18 }}>
                    {P.nav.choose[L]}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        {/* 6. 견본 */}
        <section className="pdsec">
          <h2>{P.sample.title[L]}</h2>
          <p>{P.sample.body[L]}</p>
          <div className="pdcta">
            <Link href={`/sample${q}`} className="sf-btn ghost big">{P.sample.cta[L]}</Link>
          </div>
        </section>

        {/* 7. 어떻게 진행되는가 */}
        <section className="pdsec">
          <h2>{P.how.title[L]}</h2>
          <ol className="pdsteps">
            {P.how.steps.map((x) => <li key={x.ko}>{x[L]}</li>)}
          </ol>
          <p style={{ marginTop: 18 }}>{P.how.note[L]}</p>
        </section>

        {/* 8. 누구에게 맞는가 */}
        <section className="pdsec">
          <h2>{P.who.title[L]}</h2>
          <div className="pdsplit">
            <div className="pdcard">
              <h3>{L === "en" ? "A good fit" : "맞습니다"}</h3>
              <ul className="pdlist">
                {P.who.yes.map((x) => <li key={x.ko}>{x[L]}</li>)}
              </ul>
            </div>
            <div className="pdcard">
              <h3>{L === "en" ? "Not a fit" : "아직 아닙니다"}</h3>
              <ul className="pdlist">
                {P.who.no.map((x) => <li key={x.ko}>{x[L]}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* 9. 말하지 않는 것 */}
        <section className="pdsec">
          <h2>{P.notclaim.title[L]}</h2>
          <ul className="pdlist">
            {P.notclaim.items.map((x) => <li key={x.ko}>{x[L]}</li>)}
          </ul>
        </section>

        {/* 10. 자주 묻는 것 */}
        <section className="pdsec">
          <h2>{L === "en" ? "Questions people ask" : "자주 묻는 것"}</h2>
          <div className="pdfaq">
            {P.faq.map((f) => (
              <details key={f.q.ko}>
                <summary>{f.q[L]}</summary>
                <p>{f.a[L]}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 11. 값과 단추 */}
        <section className="pdsec">
          <h2>{P.hero.cta[L]}</h2>
          <p>
            {from
              ? (L === "en" ? `From ${from}, one-time payment.` : `${from}부터, 한 번 결제입니다.`)
              : (L === "en"
                ? "The price has not been approved yet, so the plans are not on sale."
                : "값이 아직 승인되지 않아 등급을 팔지 않고 있습니다.")}
          </p>
          <div className="pdcta">
            <Link href={`/pricing${q}`}
              className={canBuy ? "sf-btn accent" : "sf-btn ghost"}>
              {P.nav.seePricing[L]}
            </Link>
          </div>
        </section>

        {/* 12. 환불과 문의 */}
        <section className="pdsec">
          <h2>{P.support.title[L]}</h2>
          <p>{P.support.body[L]}</p>
          <div className="pdcta">
            <Link href={`/legal/refund${q}`} className="sf-btn ghost sm">
              {P.support.refundLink[L]}
            </Link>
            <Link href={`/support${q}`} className="sf-btn ghost sm">
              {P.support.supportLink[L]}
            </Link>
          </div>
          {sup.email ? null : (
            /* **없는 주소를 적지 않는다.** 비어 있으면 비어 있다고 적는다 */
            <p className="pxtbd" style={{ marginTop: 14 }}>
              {L === "en"
                ? "The support address is not configured yet."
                : "지원 메일 주소가 아직 설정되지 않았습니다."}
            </p>
          )}
        </section>

      </div>

      {/* 13. 사업자 표시 (전자상거래법 제10조). **쪽 안에 또 적지 않는다**:
          공개 쪽 전부가 같은 꼬리말 한 벌을 쓰고, 값은 `/admin/business`
          한 자리에서 온다 */}
      <PublicFooter lang={L} />
    </div>
  );
}
