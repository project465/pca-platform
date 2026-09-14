import type { MetadataRoute } from "next";
import { getSite } from "@/content";

/* 값이 빌드 때 다 정해진다. 정적으로 내보낼 때 이것이 없으면
   Next 가 이 경로를 동적으로 보고 내보내기를 멈춘다 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const site = getSite();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `https://${site.domain}/sitemap.xml`,
  };
}
