import type { MetadataRoute } from "next";
import { getSite } from "@/content";

/* 값이 빌드 때 다 정해진다. 정적으로 내보낼 때 이것이 없으면
   Next 가 이 경로를 동적으로 보고 내보내기를 멈춘다 */
export const dynamic = "force-static";

/**
 * 내비에 있는 경로를 그대로 싣고, 법적 문서 세 장을 더한다.
 *
 * 법적 문서는 메뉴에 없고 꼬리에만 있다. 그래도 색인에는 있어야 한다 —
 * PG 심사와 이용자가 주소로 찾는 장이다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSite();
  const legal = [
    site.privacyUrl === "/privacy" ? "/privacy" : null,
    site.terms ? "/terms" : null,
    site.refund ? "/refund" : null,
  ].filter((p): p is string => p !== null);
  const paths = [
    "/",
    ...site.nav.items.map((i) => i.href).filter((h) => h.startsWith("/")),
    ...legal,
  ];
  const now = new Date();
  return [...new Set(paths)].map((p) => ({
    url: `https://${site.domain}${p}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: p === "/" ? 1 : 0.7,
  }));
}
