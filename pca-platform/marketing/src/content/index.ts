import type { SiteContent, SiteKey } from "./types";
import { withAppLinks } from "@/lib/platform";
import { global } from "./global";
import { kr } from "./kr";
import { kz } from "./kz";
import { tr } from "./tr";

/**
 * 나라를 추가할 때 손대는 곳은 여기 한 줄과 원고 파일 하나다.
 * 지금 네 나라가 들어와 있다 — global · kr · kz · tr. 나라를 더할 때 손대는 곳은
 * 여기 한 줄과 원고 파일 하나뿐이다. 컴포넌트는 건드리지 않는다.
 */
const SITES: Partial<Record<SiteKey, SiteContent>> = { global, kr, kz, tr };

export function getSite(): SiteContent {
  const key = (process.env.SITE ?? "global") as SiteKey;
  const site = SITES[key];
  if (!site) {
    const known = Object.keys(SITES).join(", ");
    throw new Error(`SITE=${key} 에 해당하는 원고가 없습니다. 지금 있는 것: ${known}`);
  }
  /* **앱이 맡은 길은 앱으로 보낸다.** 원고에 `/pricing` · `/login` 처럼
     상대 주소로 적혀 있어서 눌리면 홈페이지 안에서 끝났다. 원고를 네 벌
     고치는 대신 읽는 자리에서 한 번 돌린다(`lib/platform.ts`) */
  return withAppLinks(site, site);
}

export type {
  SiteContent,
  SiteKey,
  MapContent,
  DeployStatus,
  SheetBlock,
  SheetTab,
  Named,
  Link,
} from "./types";
