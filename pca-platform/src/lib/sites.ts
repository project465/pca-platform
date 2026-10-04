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
};

export async function listSites(): Promise<SiteConfig[]> {
  const rows = await query<SiteConfig>(
    `SELECT site_id, domain, default_language, default_currency, payment_market,
            site_region, offered_languages, active
       FROM site_configs ORDER BY site_id`,
  );
  return rows;
}

export async function siteById(siteId: string): Promise<SiteConfig | null> {
  const rows = await query<SiteConfig>(
    `SELECT site_id, domain, default_language, default_currency, payment_market,
            site_region, offered_languages, active
       FROM site_configs WHERE site_id = $1`,
    [siteId],
  );
  return rows[0] ?? null;
}

/** 들어온 호스트로 사이트를 고른다. 못 찾으면 global 로 둔다. */
export async function siteByHost(host: string | null): Promise<SiteConfig | null> {
  const h = (host ?? "").toLowerCase().replace(/^www\./, "").split(":")[0];
  const sites = await listSites();
  return sites.find((s) => s.domain.toLowerCase() === h) ?? sites.find((s) => s.site_id === "global") ?? null;
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
