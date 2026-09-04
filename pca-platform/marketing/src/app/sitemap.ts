import type { MetadataRoute } from "next";
import { getSite } from "@/content";

/** 지금은 한 장짜리 사이트다. 페이지가 늘면 여기에 추가한다. */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSite();
  return [
    {
      url: `https://${site.domain}/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
