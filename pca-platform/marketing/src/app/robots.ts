import type { MetadataRoute } from "next";
import { getSite } from "@/content";
import { DEFAULT_LANG } from "@/lib/i18n";

/** 정적 내보내기에서도 만들어지도록 고정한다 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const site = getSite(DEFAULT_LANG);
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `https://${site.domain}/sitemap.xml`,
  };
}
