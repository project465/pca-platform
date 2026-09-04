import { getSite } from "@/content";
import SiteHeader from "@/components/site-header";
import Hero from "@/components/hero";
import Pipeline from "@/components/pipeline";
import Contact from "@/components/contact";
import { Problem, Outputs, Process, Faq, SiteFooter } from "@/components/sections";

export default function Home() {
  const site = getSite();

  return (
    <>
      <SiteHeader site={site} />
      <main>
        <Hero site={site} />
        <Pipeline site={site} />
        <Problem site={site} />
        <Outputs site={site} />
        <Process site={site} />
        <Faq site={site} />
        <Contact site={site} />
      </main>
      <SiteFooter site={site} />
    </>
  );
}
