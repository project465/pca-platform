import { getSite } from "@/content";
import SiteHeader from "@/components/site-header";
import Hero from "@/components/hero";
import ResultSheet from "@/components/result-sheet";
import Contact from "@/components/contact";
import WorldMap from "@/components/world-map";
import {
  About,
  Analyze,
  Choose,
  Closing,
  Evidence,
  FaqSection,
  FloatingCta,
  Localisation,
  Partnership,
  ProcessSection,
  ProgramSection,
  SiteFooter,
  Styles,
  University,
  Who,
  Why,
} from "@/components/sections";

/**
 * 한국판과 글로벌판은 같은 페이지의 번역본이 아니다.
 * 한국은 학과 도입과 앵커사업(구 라이즈) 근거가 중심이고,
 * 글로벌은 새 나라에 어떻게 들어가는가 — 현지화와 파트너십 — 이 중심이다.
 * 있는 절만 그린다.
 */
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

        {/* 한국 전용 */}
        <University site={site} />

        {/* 글로벌 전용 */}
        <Localisation site={site} />
        {site.map ? <WorldMap map={site.map} /> : null}
        <Partnership site={site} />

        <Evidence site={site} />
        <Choose site={site} />
        <ProcessSection site={site} />
        <About site={site} />
        <ProgramSection site={site} />
        <FaqSection site={site} />
        <Closing site={site} />
        <Contact site={site} />
      </main>
      <SiteFooter site={site} />
      <FloatingCta site={site} />
    </>
  );
}
