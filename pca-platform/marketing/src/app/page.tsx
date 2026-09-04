import { getSite } from "@/content";
import SiteHeader from "@/components/site-header";
import Hero from "@/components/hero";
import TwoAxis from "@/components/two-axis";
import Contact from "@/components/contact";
import WorldMap from "@/components/world-map";
import {
  About,
  Analysis,
  Audience,
  Compare,
  Evidence,
  Faq,
  MidCta,
  Process,
  Questions,
  Region,
  Report,
  SiteFooter,
  University,
} from "@/components/sections";

export default function Home() {
  const site = getSite();

  return (
    <>
      <SiteHeader site={site} />
      <main>
        <Hero site={site} />
        <About site={site} />
        <Questions site={site} />
        <Analysis site={site} />
        <TwoAxis site={site} />
        <Compare site={site} />
        <Report site={site} />
        <Region site={site} />
        {site.map ? <WorldMap map={site.map} /> : null}
        <MidCta site={site} />
        <University site={site} />
        <Evidence site={site} />
        <Process site={site} />
        <Audience site={site} />
        <Faq site={site} />
        <Contact site={site} />
      </main>
      <SiteFooter site={site} />
    </>
  );
}
