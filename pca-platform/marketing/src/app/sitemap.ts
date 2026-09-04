import type { MetadataRoute } from "next";
import { getSite } from "@/content";

/** 내비에 있는 경로를 그대로 싣는다 */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSite();
  const paths = ["/", ...site.nav.items.map((i) => i.href).filter((h) => h.startsWith("/"))];
  const now = new Date();
  return [...new Set(paths)].map((p) => ({
    url: `https://${site.domain}${p}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: p === "/" ? 1 : 0.7,
  }));
}
