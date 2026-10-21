import type { SiteContent, SiteKey } from "./model";
import { withAppLinks } from "@/lib/platform";
import { global } from "./global";
import { kr } from "./kr";

/**
 * 어느 원고를 실을지는 빌드할 때 `SITE` 가 정한다.
 *
 * **kz·tr 은 이 판의 쪽에 연결하지 않았다.** 두 원고(`kz.ts` · `tr.ts`)는
 * 옛 모양(`types.ts`)으로 쓴 현지 검수 전 초안이고, 지금 제품이 하지 않는
 * 일(직무 적합도 점수 · 업무 성향 6축 · 지역 기업 매칭)을 적고 있다. 그대로
 * 띄우면 그 나라 사람이 없는 기능을 읽게 된다. 다시 붙일 때는 `model.ts`
 * 모양으로 원고를 새로 쓰고 아래 표에 한 줄을 더한다.
 */
const SITES: Record<SiteKey, SiteContent> = { kr, global };

export function getSite(): SiteContent {
  const key = (process.env.SITE ?? "kr") as SiteKey;
  const site = SITES[key];
  if (!site) {
    const known = Object.keys(SITES).join(", ");
    throw new Error(
      `SITE=${key} 에 해당하는 원고가 없습니다. 지금 있는 것: ${known}. ` +
        "kz·tr 은 옛 원고만 남아 있고 이 판의 쪽에는 연결하지 않았습니다.",
    );
  }
  /* **앱이 맡은 길은 앱으로 보낸다.** 원고에는 `/cores` · `/login` 처럼
     상대 주소로 적혀 있고, 여기서 한 번 돌린다(`lib/platform.ts`) */
  return withAppLinks(site, site);
}

export type { SiteContent, SiteKey, Link, Titled, Faq } from "./model";
