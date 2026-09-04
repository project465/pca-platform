import type { Metadata } from "next";
import { getSite } from "@/content";
import "./globals.css";

export function generateMetadata(): Metadata {
  const site = getSite();
  return {
    title: site.meta.title,
    description: site.meta.description,
    metadataBase: new URL(`https://${site.domain}`),
    openGraph: {
      type: "website",
      siteName: `${site.brand} · ${site.org}`,
      title: site.meta.title,
      description: site.meta.description,
      url: `https://${site.domain}`,
      locale: site.lang,
      images: [{ url: `/og-${site.key}.png`, width: 1200, height: 630, alt: site.meta.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: site.meta.title,
      description: site.meta.description,
      images: [`/og-${site.key}.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const site = getSite();
  return (
    <html lang={site.lang}>
      <body>{children}</body>
    </html>
  );
}
