import type { MetadataRoute } from "next";
import { getSite } from "@/content";

/** 정적 내보내기에서도 만들어지도록 고정한다 */
export const dynamic = "force-static";

/** 이 사이트가 직접 내주는 쪽만 싣는다. 앱으로 가는 주소는 앱이 따로 싣는다 */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSite();
  const paths = ["/", "/universities", ...(site.assistant ? ["/assistant"] : []), "/contact"];
  const now = new Date();
  return paths.map((p) => ({
    url: `https://${site.domain}${p}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: p === "/" ? 1 : 0.7,
  }));
}
