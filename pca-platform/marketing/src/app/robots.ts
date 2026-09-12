import type { MetadataRoute } from "next";
import { getSite } from "@/content";

/** 정적 내보내기에서도 만들어지도록 고정한다 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const site = getSite();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `https://${site.domain}/sitemap.xml`,
  };
}
