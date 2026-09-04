import { getSite } from "@/content";
import SiteHeader from "@/components/site-header";
import Hero from "@/components/hero";
import ResultSheet from "@/components/result-sheet";
import Contact from "@/components/contact";
import WorldMap from "@/components/world-map";
import {
  Analyze,
  Choose,
  Closing,
  Evidence,
  FloatingCta,
  SiteFooter,
  Styles,
  Who,
  Why,
} from "@/components/sections";

export default function Home() {
  const site = getSite();

  return (
    <>
      <SiteHeader site={site} />
      <main>
        <Hero site={site} />
        <Who site={site} />
        <Analyze site={site} />
        <Why site={site} />
        <ResultSheet site={site} />
        <Styles site={site} />
        {site.map ? <WorldMap map={site.map} /> : null}
        <Evidence site={site} />
        <Choose site={site} />
        <Closing site={site} />
        <Contact site={site} />
      </main>
      <SiteFooter site={site} />
      <FloatingCta site={site} />
    </>
  );
}
