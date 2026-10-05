import Link from "next/link";
import { currentUser } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import {
  catalogFor, priceState, sellable, type CatalogItem, type Tier,
} from "@/lib/catalog";
import { money, resolveMarket } from "@/lib/market";
import { itemsFor } from "@/lib/me-v2/bank";
import { openGrants } from "@/lib/me-v2/attempt";
import { BRAND, toLang2, txer, type TxKey } from "@/lib/surface-text";
import { Empty } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `가격 · ${BRAND.root}` };

const WHAT: Record<Tier, TxKey> = {
  BASIC: "pxBasic",
  STANDARD: "pxStandard",
  PRO: "pxPro",
};

/**
 * 가격표.
 *
 * **로그인을 요구해 막지 않는다.** 처음 온 사람은 계정이 없고, 여기서 로그인
 * 폼을 띄우면 거기서 그대로 나간다. 값을 먼저 보여주고 고른 뒤에 가입으로
 * 보낸다(`/checkout` 이 이미 그렇게 짜여 있다).
 *
 * **통화는 사이트가 정하고 금액은 서버가 읽는다**(규격 §8). 화면은
 * `products` 의 값을 적기만 하고, 주문을 만드는 쪽은 그 순간의 금액을 다시
 * 읽어 굳힌다. 그래서 `?market=` 으로 시장을 바꿔도 남의 가격으로 결제되지
 * 않는다.
 *
 * **값 자리에 세 가지 가운데 하나를 적는다**(`catalog.priceState`).
 * 승인된 가격이면 금액, 승인된 0원이면 '무료', 아직 못 정했으면
 * `PRICE_NOT_APPROVED`. 예전에는 뒤의 둘이 같은 문구를 받았는데, 그러면
 * 무료 구간에 "값이 정해지지 않았습니다" 가 떠서 공짜로 풀 수 있다는 것을
 * 아무도 모르고, 반대로 못 정한 값이 '무료' 로 읽히면 파는 쪽이 공짜로
 * 약속한 셈이 된다.
 */
export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; market?: string }>;
}) {
  const sp = await searchParams;
  const L = toLang2(await resolveLang(sp.lang));
  const T = txer(L);
  const mk = await resolveMarket(sp.market);
  const list = await catalogFor(mk.market);

  /* 이미 산 사람에게 또 팔지 않는다. 쓰지 않은 이용권이 있으면 그리로 보낸다 */
  const user = await currentUser();
  const grants = user ? await openGrants(user.id) : [];

  const qs = (m: string) => `/pricing?market=${m}${sp.lang ? `&lang=${sp.lang}` : ""}`;

  return (
    <div className="pub">
      <header className="pubtop">
        <span className="sf-brand">
          <span className="sf-brand-mark" aria-hidden="true">CM</span>
          <span className="sf-brand-name">{BRAND.root}</span>
        </span>
        <div className="pubtop-r">
          <LangSelect current={L} />
          <Link href={user ? "/my" : "/login"} className="sf-btn ghost sm">
            {user ? T("navHome") : T("pxSignIn")}
          </Link>
        </div>
      </header>

      <div className="pubwrap">
        <div className="pxhero">
          <div className="sf-eyebrow">{BRAND.root}</div>
          <h1>{T("pxTitle")}</h1>
          <p>{T("pxBody")}</p>
          <nav className="pxmkt" aria-label={T("pxMarketKR")}>
            <Link href={qs("KR")} aria-current={mk.market === "KR" ? "true" : undefined}>
              {T("pxMarketKR")}
            </Link>
            <Link href={qs("GLOBAL")} aria-current={mk.market === "GLOBAL" ? "true" : undefined}>
              {T("pxMarketGlobal")}
            </Link>
          </nav>
        </div>

        {grants.length ? (
          <div className="sf-section">
            <Empty
              icon="clipboard"
              title={T("pxHaveGrant")}
              body={`${grants[0].tier} · ${T("asResume")}`}
              cta={{ href: "/assessment/start", label: T("pxGoAssessment") }}
              tight
            />
          </div>
        ) : null}

        {list.length ? (
          <div className="pxtiers">
            {list.map((p) => <TierCard key={p.code} p={p} lang={L} T={T} />)}
          </div>
        ) : (
          <div className="sf-section">
            <Empty icon="box" title={T("pxEmpty")} body={T("pxEmptyBody")} />
          </div>
        )}

        <ul className="pxnote">
          <li>{T("pxNote1")}</li>
          <li>{T("pxNote2")}</li>
          <li>{T("pxNote3")}</li>
        </ul>
      </div>
    </div>
  );
}

function TierCard({
  p, lang, T,
}: { p: CatalogItem; lang: "ko" | "en"; T: ReturnType<typeof txer> }) {
  const state = priceState(p);
  const label = money(p.amount, p.currency, lang);
  const ok = sellable(p);
  const n = itemsFor(p.tier).length;
  return (
    <article className={p.tier === "STANDARD" ? "pxtier is-mid" : "pxtier"}>
      <h2>{p.tier}</h2>
      {state === "PRICE_APPROVED" && label ? (
        <p className="pxprice">
          {label}
          <small>{p.currency === "KRW" ? T("pxOnceVat") : T("pxOnce")}</small>
        </p>
      ) : state === "FREE" ? (
        <p className="pxprice">
          {T("pxFreeTier")}
          <small>{T("pxFreeTierWhy")}</small>
        </p>
      ) : (
        /* 금액을 지어내지 않는다. 비어 있는 것을 비어 있다고 적는다.
           **상태 이름을 화면에도 남긴다**: 운영자가 캡처 한 장으로
           '0원으로 팔리는 중' 과 '아직 승인 안 됨' 을 가를 수 있다 */
        <p className="pxtbd" data-price-state="PRICE_NOT_APPROVED">
          {T("pxPriceNotApproved")}
          <small>{T("pxPriceNotApprovedWhy")}</small>
        </p>
      )}
      <p className="pxwhat">{T(WHAT[p.tier])}</p>
      <p className="pxq">{n.toLocaleString()} {T("pxQuestions")}</p>
      {ok.ok ? (
        <Link href={`/checkout?product=${encodeURIComponent(p.code)}`}
          className={p.tier === "STANDARD" ? "sf-btn accent" : "sf-btn ghost"}
          style={{ marginTop: 18 }}>
          {T("pxBuy")}
        </Link>
      ) : (
        /* `sellable` 의 거절 이유는 한국어 한 줄이라 영어 화면에 그대로 쓰지
           않는다. 까닭은 위의 값 자리에 이미 적혀 있다 */
        <span className="sf-btn ghost" aria-disabled="true" style={{ marginTop: 18 }}>
          {T("pxBuy")}
        </span>
      )}
    </article>
  );
}
