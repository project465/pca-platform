/**
 * 상용화 준비 상태.
 *
 * **[됨] 과 [블로커] 를 섞지 않는다.** 우리가 끝낼 수 있는 것과 우리 밖에서
 * 정해져야 하는 것은 다른 줄이다. 섞으면 화면이 늘 빨간불이어서 아무도
 * 보지 않게 되고, 그러면 진짜 회귀가 그 빨간불에 섞여 든다.
 *
 * **한 구현을 두 곳이 읽는다.** 운영 화면(`/admin/readiness`)과 검사
 * (`npm run commercial:check`)가 같은 함수를 부른다. 두 곳에서 따로 세면
 * 숫자가 갈리고, 갈리는 순간 둘 다 못 믿는다(`/admin/ops` 와 같은 규칙).
 */
import { query } from "@/lib/db";
import { priceState, type PriceState } from "@/lib/catalog";
import { marketReadiness, type MarketReadiness } from "@/lib/payments";

export type PriceRow = {
  code: string;
  market: string | null;
  tier: string | null;
  amount: number;
  currency: string;
  state: PriceState;
  active: boolean;
};

export type ConsentRow = {
  kind: string;
  version: string;
  locale: string;
  required: boolean;
  translation_status: string;
  governing_locale: string | null;
};

export type SiteRow = {
  site_id: string; domain: string; payment_market: string;
  ownership: string; canonical_url: string | null;
};

/** 우리 밖에서 정해져야 하는 것 한 줄 */
export type Blocker = {
  what: string;
  why: string;
  /** 누가 정하는가. **'개발' 이 아니다** */
  who: string;
};

export type CommercialReport = {
  prices: PriceRow[];
  payments: MarketReadiness[];
  sites: SiteRow[];
  consent: ConsentRow[];
  /** 도메인 철자가 하나로 모여 있는가 */
  oneSpelling: boolean;
  blockers: Blocker[];
};

export async function commercialReport(): Promise<CommercialReport> {
  const rows = await query<{
    code: string; market: string | null; tier: string | null;
    amount: number; currency: string; price_status: string; active: boolean;
  }>(
    `SELECT code, market, tier, amount, currency, price_status, active
       FROM products
      WHERE assessment_version = 'ME_V2'
      ORDER BY market, CASE tier WHEN 'BASIC' THEN 1
                                 WHEN 'STANDARD' THEN 2 ELSE 3 END`,
  ).catch(() => []);

  const prices: PriceRow[] = rows.map((r) => ({
    code: r.code, market: r.market, tier: r.tier,
    amount: r.amount, currency: r.currency.trim(),
    state: priceState({ amount: r.amount, price_status: r.price_status as never }),
    active: r.active,
  }));

  const payments = (["KR", "GLOBAL"] as const).map(marketReadiness);

  const sites = await query<SiteRow>(
    `SELECT site_id, domain, payment_market, ownership, canonical_url
       FROM site_configs WHERE active ORDER BY site_id`,
  ).catch(() => []);

  const consent = await query<ConsentRow>(
    `SELECT kind, version, locale, required, translation_status, governing_locale
       FROM consent_documents
      WHERE retired_at IS NULL
      ORDER BY kind, locale`,
  ).catch(() => []);

  const spells = new Set(
    sites.map((s) => (s.domain.match(/careerm[ae]tri/) ?? [""])[0]).filter(Boolean),
  );

  const blockers: Blocker[] = [];

  for (const p of payments) {
    if (!p.ready && p.blocker) {
      blockers.push({ what: `${p.market} 결제`, why: p.blocker, who: "결제 대행사·심사" });
    }
  }

  const tbd = prices.filter((p) => p.state === "PRICE_NOT_APPROVED");
  if (tbd.length) {
    blockers.push({
      what: "가격 승인",
      why: `${tbd.length}개 상품의 값이 승인되지 않았습니다 ` +
        `(${tbd.map((p) => p.code).join(" · ")})`,
      who: "사업 결정",
    });
  }

  const pending = consent.filter((c) => c.translation_status === "pending");
  if (pending.length) {
    blockers.push({
      what: "영문 약관",
      why: `${pending.length}개 문서의 영문 번역이 없습니다. 구조는 다 되어 ` +
        `있고 본문만 넣으면 됩니다 (지금은 한국어 본문이 기준이라고 영어로 ` +
        `적어 두었습니다)`,
      who: "법률 검토·번역",
    });
  }

  if (spells.size > 1) {
    blockers.push({
      what: "도메인 철자",
      why: `두 철자가 섞여 있습니다 (${[...spells].join(" + ")})`,
      who: "도메인 구매",
    });
  }

  /**
   * 도메인 소유.
   *
   * **DNS 가 뜨는 것과 우리 것인 것은 다르다.** 한 번
   * `careermatri.com` 에 남의 IP 가 응답한다는 것만으로 제3자 소유라고
   * 적어 두었다가 틀렸다. 조회로 알 수 있는 것은 지금 누가 그 주소로
   * 서버를 띄워 두었는가뿐이고, 소유는 소유자가 확인해 준다
   * (`site_configs.ownership`).
   */
  const unowned = sites.filter((s) => s.ownership !== "confirmed");
  if (unowned.length) {
    blockers.push({
      what: "도메인 소유",
      why: `${unowned.map((s) => s.domain).join(" · ")} 의 소유가 아직 ` +
        `확인되지 않았습니다. 가지고 계시면 site_configs.ownership 을 ` +
        `confirmed 로 바꿉니다`,
      who: "도메인 구매",
    });
  }

  /* **사업자 정보를 지어내지 않았다.** 전자상거래법 제10조 표시가 없으면
     결제를 받을 수 없다 */
  blockers.push({
    what: "사업자 정보",
    why: "전자상거래법 제10조 표시(상호·대표자·주소·전화·사업자등록번호·" +
      "통신판매업 신고번호)가 비어 있습니다. 지어내지 않았습니다",
    who: "사업자 등록",
  });

  return { prices, payments, sites, consent, oneSpelling: spells.size <= 1, blockers };
}
