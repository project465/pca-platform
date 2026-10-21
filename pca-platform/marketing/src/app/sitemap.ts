import type { MetadataRoute } from "next";
import { getSite } from "@/content";
import { DEFAULT_LANG, HTML_LANG, LANGS, localePath } from "@/lib/i18n";

/** 정적 내보내기에서도 만들어지도록 고정한다 */
export const dynamic = "force-static";

/**
 * 이 사이트가 직접 내주는 쪽만 싣는다. 앱으로 가는 주소는 앱이 따로 싣는다.
 *
 * **언어마다 한 줄씩, 서로를 가리키게 적는다**(hreflang). 한 줄만 적으면
 * 검색엔진이 다른 언어의 쪽을 찾지 못하거나 베낀 쪽으로 본다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSite(DEFAULT_LANG);
  const paths = ["/", "/universities", ...(site.assistant ? ["/assistant"] : []), "/contact"];
  const now = new Date();
  const abs = (p: string) => `https://${site.domain}${p}`;
  return paths.flatMap((p) =>
    LANGS.map((l) => ({
      url: abs(localePath(l, p)),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: p === "/" ? 1 : 0.7,
      ...(LANGS.length > 1
        ? { alternates: { languages: Object.fromEntries(LANGS.map((x) => [HTML_LANG[x], abs(localePath(x, p))])) } }
        : {}),
    })),
  );
}
