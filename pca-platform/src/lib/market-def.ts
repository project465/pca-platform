/**
 * 시장이 무엇인가. **여기에는 아무것도 import 하지 않는다.**
 *
 * 미들웨어는 Edge 런타임에서 돌아 `pg` 를 못 올린다. 그런데 시장 이름을
 * `catalog.ts` 에서 가져오면 그 파일이 DB 모듈을 끌고 들어와 미들웨어가
 * 통째로 깨진다(실제로 깨졌다). 뜻만 든 줄은 양쪽이 같이 볼 수 있는
 * 자리에 둔다.
 */
export type Market = "KR" | "GLOBAL";

export function isMarket(v: string | undefined | null): v is Market {
  return v === "KR" || v === "GLOBAL";
}

/** 고른 시장을 담는 쿠키 이름 */
export const MARKET_COOKIE = "cm_market";
