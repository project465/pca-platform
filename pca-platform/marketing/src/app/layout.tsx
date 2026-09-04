import type { Metadata } from "next";
import { getSite } from "@/content";
import "./globals.css";

export function generateMetadata(): Metadata {
  const site = getSite();
  return {
    title: site.meta.title,
    description: site.meta.description,
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const site = getSite();
  return (
    <html lang={site.lang}>
      <body>{children}</body>
    </html>
  );
}
