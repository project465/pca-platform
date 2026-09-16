import type { MetadataRoute } from "next";
import { getSite } from "@/content";

/* 값이 빌드 때 다 정해진다. 정적으로 내보낼 때 이것이 없으면
   Next 가 이 경로를 동적으로 보고 내보내기를 멈춘다 */
export const dynamic = "force-static";

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
