import Link from "next/link";
import BrandHome from "@/components/sf/brand-home";
import PublicFooter from "@/components/sf/public-footer";
import { currentUser } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import {
  catalogFor, priceState, sellable, type CatalogItem,
} from "@/lib/catalog";
import { money, resolveMarket } from "@/lib/market";
import { krwToUsd, usdApprox, usdNote, type UsdRate } from "@/lib/fx";
import { entrySay } from "@/lib/entry-say";
import { sellableCores } from "@/lib/me-v3/core-registry";
import { openGrants } from "@/lib/me-v2/attempt";
import { resumePathFor } from "@/lib/engine-entry";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { valueOf } from "@/lib/tiers";
import { minutesLabel, tierMinutes } from "@/lib/tier-minutes";
import { PRODUCT } from "@/lib/product-copy";
import { step } from "@/lib/funnel-server";
import { startFreeAction } from "@/app/free-start/actions";
import { Empty } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";
import NotOpen from "@/components/sf/not-open";
import { publicCommerceGate } from "@/lib/public-gate";
import CareerFlow from "@/components/sf/career-flow";
import { trackOffers } from "@/lib/track";
import LaunchNotify, { type NotifyQuery } from "@/components/inquiry/launch-notify";
import { payOpen } from "@/lib/payments";
import { pageTitle } from "@/lib/page-title";

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> },
) {
  return pageTitle("가격 · CareerMatri", searchParams);
}

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
 *
 * **값보다 받는 것을 먼저 읽게 짠다.** 카드 안의 차례가 등급 이름 → 한
 * 마디 → 값 → 누구에게 맞는가 → 할 일 → 포함되는 것이다. 값을 맨 위에
 * 놓으면 세 칸이 '싸다/비싸다' 로만 견주어지고, 그러면 비싼 칸을 고를
 * 이유가 가격표 안에 없다.
 */
export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; market?: string; sent?: string; err?: string; for?: string }>;
}) {
  const sp = await searchParams;
  const L = toLang2(await resolveLang(sp.lang));
  const T = txer(L);

  /* **운영에서는 빈칸이 있는 동안 상거래 화면을 열지 않는다.** 전자상거래법
     제10조 표시와 환불 연락처가 비어 있으면 `확인 필요` 가 사는 사람의
     화면에 찍힌다. 공개 전에는 그게 할 일 목록이라 그대로 두고, 운영에서는
     닫는다(`public-gate.ts`) */
  const gate = await publicCommerceGate();
  if (!gate.open) return <NotOpen lang={L} />;
  const mk = await resolveMarket(sp.market);
  /* 영어 화면에서 원화 상품은 달러로 어림해 함께 적는다(`lib/fx.ts`). 결제는 원화다 */
  const fx = L === "en" ? await krwToUsd() : null;
  const [list, tracks] = await Promise.all([catalogFor(mk.market), trackOffers(mk.market)]);
  const t30 = tracks.find((t) => t.days === 30);
  const t90 = tracks.find((t) => t.days === 90);
  /* 걸리는 시간은 **실제 계획을 세워 센 값**이다. 시작 화면과 같은
     함수를 읽으므로 두 화면이 갈리지 않는다.
     **어느 전공으로 세는지를 글자로 박지 않는다**: 이 시장에서 지금
     응시할 수 있는 core 를 등록부에 묻는다. 전공이 둘 이상 열리는 날
     등급마다 시간이 갈리므로 그때는 전공을 고른 뒤에 적어야 한다 */
  const open = sellableCores(mk.market);
  const mins = open.length === 1 ? tierMinutes(open[0].code) : null;

  /* 이미 산 사람에게 또 팔지 않는다. 쓰지 않은 이용권이 있으면 그리로 보낸다 */
  const user = await currentUser();
  const grants = user ? await openGrants(user.id) : [];

  /* 가격표를 본 것을 센다. **결제를 시작한 것과 가른다**: 가격표에서
     떠나는 것과 결제창에서 떠나는 것은 전혀 다른 문제다 */
  await step("pricing", {
    userId: user?.id ?? null,
    props: { market: mk.market, locale: L },
  });

  /**
   * **파는 등급이 없는 글로벌 시장에서는 결제 이야기를 하지 않는다**(영어판
   * 2단계). 무료 기본 검사만 열린 자리에 `결제하는 즉시 시작` · `세 등급
   * 모두에` · `사기 전에(환불)` 를 세우면 살 수 없는 것을 사는 법을 읽게 된다.
   * 머리말도 기계공학 한 전공이 아니라 열린 이공계 전공 전부를 가리킨다.
   */
  const freeOnly = mk.market === "GLOBAL" && !list.length;
  const say = entrySay(L);

  const qs = (m: string) => `/pricing?market=${m}${sp.lang ? `&lang=${sp.lang}` : ""}`;
  /* **링크가 시장을 떨어뜨리지 않게 들고 다닌다** */
  const q = `?market=${mk.market}${sp.lang ? `&lang=${sp.lang}` : ""}`;

  const common: [string, string][] = [
    [T("pxCommon1"), T("pxCommon1b")],
    [T("pxCommon3"), T("pxCommon3b")],
    [T("pxCommon4"), T("pxCommon4b")],
    [T("pxCommon2"), T("pxCommon2b")],
  ];
  const asks: [string, string][] = [
    [T("pxAsk1"), T("pxNote1")],
    [T("pxAsk2"), T("pxNote2")],
    [T("pxAsk3"), T("pxNote3")],
  ];

  return (
    <div className="pub">
      <header className="pubtop">
        {/* **로고는 홈이다.** 여기만 상품 쪽을 가리키고 있어서, 가격표에서
            로고를 누른 사람이 홈이 아니라 소개 쪽으로 떨어졌다 */}
        <BrandHome />
        <div className="pubtop-r">
          <LangSelect current={L} />
          {/* **견본 단추를 두지 않는다.** 지금 `/sample` 에 서 있는 것은
              앞 판본(ME_V2)의 결과지이고, 사기 전에 그것을 보여 주면
              받지 않을 결과지가 약속이 된다. ME_V3 합성 견본이 준비되면
              이 줄이 돌아온다 */}
          {/* **검사로 들어가는 공개 길을 둔다.** 전에는 로그인 단추
              하나뿐이라 전공 고르는 화면으로 가려면 주소를 직접 쳐야
              했다. 로그인하지 않았으면 로그인을 거쳐 그 자리로 간다 */}
          <Link href={user ? "/cores" : "/login?next=%2Fcores"}
            className="sf-btn ghost sm">
            {T("pxStartAssessment")}
          </Link>
          <Link href={user ? "/me" : "/login"} className="sf-btn ghost sm">
            {user ? T("pxMyWorkspace") : T("pxSignIn")}
          </Link>
        </div>
      </header>

      <div className="pubwrap">
        <section className="pxhero">
          <div className="sf-eyebrow">{freeOnly ? say("이공계 진로 진단") : T("pxTitle")}</div>
          <h1>{T("pxLead")}</h1>
          <p>{T("pxLeadSub")}</p>
          <nav className="pxmkt" aria-label={T("pxMarketKR")}>
            <Link href={qs("KR")} aria-current={mk.market === "KR" ? "true" : undefined}>
              {T("pxMarketKR")}
            </Link>
            <Link href={qs("GLOBAL")} aria-current={mk.market === "GLOBAL" ? "true" : undefined}>
              {T("pxMarketGlobal")}
            </Link>
          </nav>
          {/* 사기 전에 가장 많이 걸리는 셋을 머리에 둔다. **지키지 못할 말을
              적지 않는다**: 셋 다 지금 코드가 실제로 하는 일이다 */}
          {freeOnly ? (
            <ul className="pxtrust">
              <li>{say("무료 기본 검사")}</li>
              <li>{say("웹 결과와 A4 PDF")}</li>
              <li>{say("답할 때마다 저장되어 이어서 풉니다")}</li>
            </ul>
          ) : (
            <ul className="pxtrust">
              <li>{T("pxTrust1")}</li>
              <li>{T("pxTrust2")}</li>
              <li>{T("pxTrust3")}</li>
            </ul>
          )}
        </section>

        {/* 제품의 사고 순서. **가격을 보기 전에 무엇을 사는지 보인다** */}
        <CareerFlow lang={L} tight />

        {grants.length ? (
          <div className="sf-section">
            <Empty
              icon="clipboard"
              title={T("pxHaveGrant")}
              body={`${grants[0].tier} · ${T("asResume")}`}
              /* 옛 판본의 이어하기. **보존하는 자리라 지우지 않는다**
                 (`engine-entry.ts` 의 route 표에서 COMPATIBILITY) */
              cta={{ href: resumePathFor("ME_V2") ?? "/me", label: T("pxGoAssessment") }}
              tight
            />
          </div>
        ) : null}

        {list.length ? (
          <div className="pxtiers">
            {list.map((p) => (
              <TierCard key={p.code} p={p} lang={L} T={T} fx={fx}
                /* 전공이 둘 이상 열리면 등급마다 시간이 갈린다.
                   그때는 **적지 않는다**: 한 전공의 시간을 모두의 시간으로
                   적으면 다른 전공 학생이 그 수를 보고 시간을 비워 둔다 */
                mins={mins ? minutesLabel(mins[p.tier], L) : ""}
                q={sp} back={`/pricing${sp.lang ? `?lang=${sp.lang}` : ""}`} />
            ))}
          </div>
        ) : (
          <div className="sf-section">
            {/* **글로벌 시장에서 빈 가격표로 끝내지 않는다**(영어판 2단계). 파는
                등급은 없어도 무료 기본 검사는 열려 있고, 그 길을 모르면 해외
                개인은 여기서 나간다 */}
            {mk.market === "GLOBAL" ? (
              <Empty icon="box" title={say("해외에서는 무료 기본 검사가 열려 있습니다")}
                body={say("유료 등급(Standard · Pro)은 아직 한국 밖에서 결제할 수 없습니다.")}
                cta={{ href: user ? "/cores" : "/signup?next=%2Fcores",
                  label: say("무료 기본 검사 시작하기") }} />
            ) : (
              <Empty icon="box" title={T("pxEmpty")} body={T("pxEmptyBody")} />
            )}
          </div>
        )}

        {/**
         * CareerMatri Track. **검사 등급과 한 줄에 세우지 않는다.** 등급은
         * 한 번 사는 결과지이고 Track 은 그 뒤에 쓰는 기간권이라, 같은 카드
         * 꼴로 나란히 두면 넷째 등급으로 읽힌다. 아래에 따로 둔다.
         *
         * **값은 `products` 에서 읽는다.** 화면에 적힌 값과 결제되는 값이
         * 갈리지 않게 한다. 한국 시장에서만 선다.
         */}
        {tracks.length ? (
          <section className="pxband" id="track">
            <h2>{T("pxTrackTitle")}</h2>
            <p className="pxwhat">{T("pxTrackLead")}</p>
            <ul className="pxtrack-f">
              <li>{T("pxTrackF1")}</li>
              <li>{T("pxTrackF2")}</li>
              <li>{T("pxTrackF3")}</li>
            </ul>
            <p className="pxwhat">{T("pxTrackNot")} <Link href="/me/track">{T("pxTrackMore")}</Link></p>
            <div className="pxband-g">
              {/* 무료 범위를 값보다 먼저 둔다: 사기 전에 써 볼 수 있다는 것이 첫 칸이다 */}
              <div className="pxband-i">
                <b>{T("pxTrackFreeHead")}</b>
                <span>{T("pxTrackFree")}</span>
              </div>
              {tracks.map((t) => (
                <div key={t.code} className="pxband-i">
                  <b>
                    {t.days === 90 ? T("pxTrack90") : T("pxTrack30")}
                    {" · "}{money(t.amount, t.currency, L)}
                    {L === "en" && t.currency === "KRW" && usdApprox(t.amount, fx) ? ` (${usdApprox(t.amount, fx)})` : ""}
                  </b>
                  <span>
                    {t.days === 90 ? T("pxTrack90Why") : T("pxTrack30Why")}
                  </span>
                  {/* **등급 카드와 같은 물음을 먼저 한다.** 결제 대행사가 서기
                      전에 사는 단추를 세우면, 누른 사람이 결제를 받을 수 없는
                      결제 화면에 떨어진다(운영에서 실제로 그랬다) */}
                  {payOpen(t.currency === "KRW" ? "KR" : "GLOBAL") ? (
                    <Link href={`/checkout?product=${encodeURIComponent(t.code)}`}
                      className={t.days === 90 ? "sf-btn accent sm" : "sf-btn ghost sm"}
                      style={{ marginTop: 10, alignSelf: "flex-start" }}>
                      {T("pxTrackBuy")}
                    </Link>
                  ) : (
                    /* **결제가 열리기 전에는 알림 신청을 받는다**(2026-10-30). 누를 수
                       없는 단추만 세우면 온 사람이 할 일 없이 돌아간다 */
                    <LaunchNotify product={t.code} lang={L === "en" ? "en" : "ko"}
                      source="app:/pricing" q={sp} compact
                      back={`/pricing${sp.lang ? `?lang=${sp.lang}` : ""}#track`} />
                  )}
                </div>
              ))}
              <div className="pxband-i">
                <b>{T("pxTrackTrial")}</b>
                <span>{T("pxTrackSoon")}</span>
              </div>
            </div>
          </section>
        ) : null}

        {freeOnly ? null : (<>
        <section className="pxband">
          <h2>{T("pxCommon")}</h2>
          <div className="pxband-g">
            {common.map(([t, b]) => (
              <div key={t} className="pxband-i">
                <b>{t}</b>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="pxask">
          <h2>{T("pxAsk")}</h2>
          <div className="pxask-g">
            {asks.map(([q2, a]) => (
              <div key={q2} className="pxask-i">
                <b>{q2}</b>
                <p>{a}</p>
              </div>
            ))}
          </div>
          <p className="pxask-more">
            <Link href={`/product${q}`}>{T("pxMore")}</Link>
          </p>
        </section>
        </>)}
      </div>

      <PublicFooter lang={L} />
    </div>
  );
}

function TierCard({
  p, lang, T, mins, fx, q, back = "/pricing",
}: {
  p: CatalogItem; lang: "ko" | "en"; T: ReturnType<typeof txer>;
  mins: string; fx: UsdRate | null; q?: NotifyQuery; back?: string;
}) {
  const usd = lang === "en" && p.currency === "KRW" ? usdApprox(p.amount, fx) : null;
  const state = priceState(p);
  const label = money(p.amount, p.currency, lang);
  const ok = sellable(p);
  const v = valueOf(p.tier, lang);
  const mid = p.tier === "STANDARD";

  /* 고르기를 권하는 칸 하나에만 금색이 나온다. **색만으로 가르지 않는다**:
     알약에 글자가 적혀 있고 테가 거든다 */
  return (
    <article className={mid ? "pxtier is-mid" : "pxtier"}>
      <header className="pxtier-h">
        <h2>{p.tier}</h2>
        {/* **왜 이 등급인지를 알약에 적는다.** '권해 드리는 등급' 한 마디만
            붙여 두면 왜 권하는지가 안 보이고, 그러면 위 등급이 '줄이 더
            많은 상품' 으로 읽힌다. 세 등급은 서로 다른 처지를 맡는다 */}
        <span className={mid ? "sf-pill gold" : "sf-pill plain"}>{v.when}</span>
      </header>
      <p className="pxwhat">{v.headline}</p>

      {state === "PAID_APPROVED" && label ? (
        <p className="pxprice">
          {label}
          <small>{p.currency === "KRW" ? T("pxOnceVat") : T("pxOnce")}</small>
          {usd && fx ? <small className="pxfx">{usd} · {usdNote(fx)}</small> : null}
        </p>
      ) : state === "FREE_APPROVED" ? (
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

      {state === "FREE_APPROVED" ? (
        /**
         * 승인된 무료는 **결제창을 거치지 않는다.**
         *
         * `POST` 로만 연다. 주소만 눌러도 주문이 생기면 링크 미리보기나
         * 크롤러가 계정에 주문을 만든다. 로그인하지 않았으면 서버가
         * 가입으로 보냈다가 끝나면 이 자리로 돌려보낸다.
         */
        <form action={startFreeAction} className="pxcta">
          <input type="hidden" name="product" value={p.code} />
          <button className="sf-btn ghost wide">{T("pxStartFree")}</button>
        </form>
      ) : ok.ok && payOpen(p.market === "GLOBAL" ? "GLOBAL" : "KR") ? (
        <div className="pxcta">
          <Link href={`/checkout?product=${encodeURIComponent(p.code)}`}
            className={mid ? "sf-btn accent wide" : "sf-btn ghost wide"}>
            {T("pxBuy")}
          </Link>
        </div>
      ) : (
        /* `sellable` 의 거절 이유는 한국어 한 줄이라 영어 화면에 그대로 쓰지
           않는다. 까닭은 위의 값 자리에 이미 적혀 있다 */
        <div className="pxcta">
          {ok.ok ? (
            /* 값은 정해졌는데 결제가 아직 열리지 않았다. 누를 수 없는 단추 대신
               알림 신청을 받는다(2026-10-30) */
            <LaunchNotify product={p.code} lang={lang} source="app:/pricing" q={q} back={back} />
          ) : (
            <span className="sf-btn ghost wide" aria-disabled="true">{T("pxBuy")}</span>
          )}
        </div>
      )}

      <p className="pxwho"><span>{T("pxFor")}</span>{v.who}</p>

      {/* **받는 것을 줄로 적고 문항 수는 아예 적지 않는다.**
          문항 수를 앞세우면 비싼 등급이 "문항이 더 많은 것" 으로 읽히고,
          그러면 같은 값을 더 내는 이유가 없다. 전에 여기 적히던 48 · 68 ·
          92 는 **앞 판본(ME_V2)의 수**라 지금 받는 것과도 달랐다. 남긴
          것은 시간 하나이고, 그것은 사는 쪽이 일정을 비워야 해서다 */}
      <div className="pxgets">
        <h3>{T("pxIncluded")}</h3>
        <ul>
          {v.gets.map((g) => <li key={g}>{g}</li>)}
        </ul>
      </div>
      <p className="pxq">{mins}</p>
    </article>
  );
}
