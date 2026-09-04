import SiteHeader from "@/components/site-header";
import { FloatingCta, SiteFooter } from "@/components/sections";
import { getSite } from "@/content";

/** 모든 페이지가 같은 머리·꼬리를 쓴다 */
export default function Shell({ children }: { children: React.ReactNode }) {
  const site = getSite();
  return (
    <>
      <SiteHeader site={site} />
      <main>{children}</main>
      <SiteFooter site={site} />
      <FloatingCta site={site} />
    </>
  );
}
