import type { SiteContent, SiteKey } from "./types";
import { global } from "./global";
import { kr } from "./kr";

/**
 * 나라를 추가할 때 손대는 곳은 여기 한 줄과 원고 파일 하나다.
 * 카자흐스탄·터키는 kz.ts / tr.ts 를 만들어 같은 형태를 채우면 된다.
 */
const SITES: Partial<Record<SiteKey, SiteContent>> = { global, kr };

export function getSite(): SiteContent {
  const key = (process.env.SITE ?? "global") as SiteKey;
  const site = SITES[key];
  if (!site) {
    const known = Object.keys(SITES).join(", ");
    throw new Error(`SITE=${key} 에 해당하는 원고가 없습니다. 지금 있는 것: ${known}`);
  }
  return site;
}

export type { SiteContent, SiteKey } from "./types";
