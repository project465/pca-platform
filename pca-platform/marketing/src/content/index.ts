import { notFound } from "next/navigation";
import type { Lang, SiteContent, SiteKey } from "./model";
import { withAppLinks, withLangLinks } from "@/lib/platform";
import { DEFAULT_LANG, isLang } from "@/lib/i18n";
import { global } from "./global";
import { kr } from "./kr";
import { en } from "./en";
import { ja } from "./ja";
import { zh } from "./zh";

/**
 * 어느 원고를 실을지는 빌드할 때 `SITE` 가, 어느 언어로 그릴지는 주소가
 * 정한다(`lib/i18n.ts`).
 *
 * **한국어판은 네 언어로 선다**(2026-10-21). 영어 · 일본어 · 중국어는
 * 한국어 원고를 옮긴 것이고 같은 제품 · 같은 값 · 같은 주소를 적는다.
 * 글로벌판(`global.ts`)은 다른 시장의 원고라 이 표에 섞지 않는다.
 *
 * **kz·tr 은 이 판의 쪽에 연결하지 않았다.** 두 원고(`kz.ts` · `tr.ts`)는
 * 옛 모양(`types.ts`)으로 쓴 현지 검수 전 초안이고, 지금 제품이 하지 않는
 * 일(직무 적합도 점수 · 업무 성향 6축 · 지역 기업 매칭)을 적고 있다. 그대로
 * 띄우면 그 나라 사람이 없는 기능을 읽게 된다.
 */
const SITES: Record<SiteKey, Partial<Record<Lang, SiteContent>>> = {
  kr: { ko: kr, en, ja, zh },
  global: { en: global },
};

export function getSite(lang: string = DEFAULT_LANG): SiteContent {
  const key = (process.env.SITE ?? "kr") as SiteKey;
  const byLang = SITES[key];
  if (!byLang) {
    const known = Object.keys(SITES).join(", ");
    throw new Error(
      `SITE=${key} 에 해당하는 원고가 없습니다. 지금 있는 것: ${known}. ` +
        "kz·tr 은 옛 원고만 남아 있고 이 판의 쪽에는 연결하지 않았습니다.",
    );
  }
  /* 내놓지 않는 언어로 들어오면 404 다. 기본 언어로 조용히 그리면 같은
     본문이 주소 둘에 서고, 검색엔진은 그것을 베낀 쪽으로 본다 */
  if (!isLang(lang)) notFound();
  const site = byLang[lang];
  if (!site) notFound();
  /* **앱이 맡은 길은 앱으로 보낸다.** 원고에는 `/cores` · `/login` 처럼
     상대 주소로 적혀 있고, 여기서 한 번 돌린다(`lib/platform.ts`). 남은
     이 사이트 안의 주소에는 그 언어의 앞머리를 붙인다 */
  return withLangLinks(lang, withAppLinks(site, site));
}

export type { SiteContent, SiteKey, Lang, Link, Titled, Faq } from "./model";
