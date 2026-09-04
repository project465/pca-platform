import type { MetadataRoute } from "next";
import { getSite } from "@/content";

export default function robots(): MetadataRoute.Robots {
  const site = getSite();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `https://${site.domain}/sitemap.xml`,
  };
}
