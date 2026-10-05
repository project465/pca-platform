/**
 * 사이트 설정.
 *
 * **화면 언어 · 사이트 지역 · 목표 국가는 서로 다른 값이다.** 한국 사이트를
 * 한국어로 쓰면서 미국 시장을 보는 사람이 가장 흔한 경우다. 셋을 하나로
 * 묶으면 그 사람에게 한국 공고가 나간다.
 *
 * **도메인을 코드에 적지 않는다.** `site_configs` 한 표에서만 읽는다.
 */
import { query } from "@/lib/db";

export type SiteConfig = {
  site_id: string;
  domain: string;
  default_language: string;
  default_currency: string;
  payment_market: string;
  site_region: string | null;
  offered_languages: string[];
  active: boolean;
  /**
   * 소유자가 확인해 주었는가.
   *
   * **DNS 조회로 정하지 않는다.** 한 번 `careermatri.com` 에 남의 IP 가
   * 응답한다는 것만으로 '제3자 소유' 라고 적어 두었다가 틀렸다. 지금
   * 누가 그 주소로 서버를 띄워 두었는지와 도메인이 누구 것인지는 별개다.
   */
  ownership: "confirmed" | "unconfirmed";
  /** 정규 주소. 메일 링크·결제 콜백·결과지 주소가 이 값을 읽는다 */
  canonical_url: string | null;
};

const COLS = `site_id, domain, default_language, default_currency, payment_market,
              site_region, offered_languages, active, ownership, canonical_url`;

export async function listSites(): Promise<SiteConfig[]> {
  const rows = await query<SiteConfig>(
    `SELECT ${COLS} FROM site_configs ORDER BY site_id`,
  );
  return rows;
}

export async function siteById(siteId: string): Promise<SiteConfig | null> {
  const rows = await query<SiteConfig>(
    `SELECT ${COLS} FROM site_configs WHERE site_id = $1`,
    [siteId],
  );
  return rows[0] ?? null;
}

/** 호스트 글자를 견주는 꼴로 다듬는다. `www.` 와 포트를 뗀다 */
export function hostKey(host: string | null): string {
  return (host ?? "").toLowerCase().replace(/^www\./, "").split(":")[0];
}

/**
 * 이 호스트가 **실제로 어느 사이트인가.** 못 찾으면 `null` 이다.
 *
 * `siteByHost` 와 나눠 둔 까닭이 있다. 저쪽은 못 찾으면 global 로
 * 돌려주는데, 그 값이 시장을 정하는 데 쓰이면 **모르는 호스트가 조용히
 * 글로벌 시장이 된다.** 플랫폼은 전 세계 하나라(설계 원칙 5)
 * `app.careermatri.com` 은 어느 시장도 아니고, 거기서 시장은 손님이
 * 고르거나 소개 사이트가 들고 온다.
 */
export async function siteForHostExact(host: string | null): Promise<SiteConfig | null> {
  const h = hostKey(host);
  if (!h) return null;
  const sites = await listSites().catch(() => [] as SiteConfig[]);
  return sites.find((s) => s.domain.toLowerCase() === h) ?? null;
}

/** 들어온 호스트로 사이트를 고른다. 못 찾으면 global 로 둔다. */
export async function siteByHost(host: string | null): Promise<SiteConfig | null> {
  const h = hostKey(host);
  const sites = await listSites();
  return sites.find((s) => s.domain.toLowerCase() === h) ?? sites.find((s) => s.site_id === "global") ?? null;
}

/**
 * 이 시장의 정규 주소.
 *
 * **메일 링크와 결제 콜백과 결과지 주소가 전부 여기서 온다.** 코드에
 * 적어 두면 도메인을 옮기는 날 저장소를 뒤져야 하고, 뒤지다 하나를
 * 빠뜨리면 그 링크만 옛 주소를 가리킨다.
 *
 * **요청 호스트를 그대로 쓰지 않는 자리가 있다.** 메일은 받는 사람이
 * 다른 날 열고, 그때 staging 호스트가 적혀 있으면 닿지 않는다. 그래서
 * 메일과 콜백은 정규 주소를 쓰고, 화면 안에서 끝나는 이동만 요청
 * 호스트를 따른다.
 */
export async function canonicalFor(market: string): Promise<string | null> {
  const sites = await listSites().catch(() => []);
  const s = sites.find((x) => x.payment_market === market && x.active);
  if (!s) return null;
  return s.canonical_url ?? (s.domain ? `https://${s.domain}` : null);
}

/**
 * 결과지가 나라별 내용을 낼 수 있는가.
 *
 * **확인된 묶음이 없으면 지어내지 않는다.** 없는 나라는 Global Reference
 * Mode 로 가고, 그 사실을 화면에 적는다.
 */
export async function countryMode(target: string | null): Promise<{
  mode: "COUNTRY_PACK" | "GLOBAL_REFERENCE_MODE";
  country: string | null;
  pack_version: string | null;
  notice: string;
}> {
  if (!target) {
    return {
      mode: "GLOBAL_REFERENCE_MODE", country: null, pack_version: null,
      notice: "목표 국가를 고르지 않으셨습니다. 나라별 내용 없이 보여 드립니다.",
    };
  }
  const rows = await query<{ version: string }>(
    `SELECT version FROM country_packs
      WHERE country_code = $1 AND status = 'verified' AND verified_at IS NOT NULL
      ORDER BY verified_at DESC LIMIT 1`,
    [target.toUpperCase()],
  );
  if (!rows[0]) {
    return {
      mode: "GLOBAL_REFERENCE_MODE", country: target.toUpperCase(), pack_version: null,
      notice: "이 나라는 확인된 자료가 아직 없습니다. 임금·비자·면허를 적지 않습니다.",
    };
  }
  return {
    mode: "COUNTRY_PACK", country: target.toUpperCase(), pack_version: rows[0].version,
    notice: "",
  };
}
