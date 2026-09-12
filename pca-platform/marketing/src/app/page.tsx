import { getSite } from "@/content";
import Shell from "@/components/shell";
import Hero from "@/components/hero";
import {
  Analyze,
  ChannelsSection,
  Closing,
  GapSection,
  PricingSection,
  RegionsSection,
  Who,
} from "@/components/sections";
import { FlowDiagram, NextLink, PhotoSlot, PullQuote, ReportMini } from "@/components/visuals";
import SampleReport from "@/components/sample-report";

export default function Home() {
  const site = getSite();

  const c = site.chrome;
  const flow = c.flow.map((v, i) => ({ k: String(i + 1).padStart(2, "0"), v }));

  return (
    <Shell>
      <Hero site={site} />

      <SampleReport site={site} />

      <section className="divided">
        <div className="wrap">
          <div className="sec-head">
            <span className="label-sm">{c.glanceLabel}</span>
            <h2>{c.glanceHeading}</h2>
          </div>
          <FlowDiagram steps={flow} />
        </div>
      </section>

      <ChannelsSection site={site} />

      <Who site={site} />
      <Analyze site={site} />

      <section className="divided tinted">
        <div className="wrap photosplit">
          <div>
            <span className="label-sm">{site.sheet.label}</span>
            <h2 style={{ margin: "16px 0 16px" }}>{site.sheet.heading}</h2>
            <p className="lead">{site.sheet.lead[0]}</p>
            <div style={{ marginTop: 24 }}>
              <a className="btn lg solid" href="/pca">
                {c.seeSheet}
              </a>
            </div>
          </div>
          <ReportMini site={site} />
        </div>
      </section>

      <section className="divided">
        <div className="wrap">
          <PullQuote source={site.why.after.title}>
            {site.why.after.verdict}
          </PullQuote>
          <div className="photorow" style={{ marginTop: 34 }}>
            {c.photosHome.map((caption) => (
              <PhotoSlot key={caption} caption={caption} />
            ))}
          </div>
        </div>
      </section>

      <section className="divided">
        <div className="wrap">
          <div className="sec-head">
            <span className="label-sm">{c.deeperLabel}</span>
            <h2>{c.deeperHeading}</h2>
          </div>
          <div className="nextgrid">
            {site.nav.items.slice(0, 4).map((i) => (
              <NextLink key={i.href} label={i.href.replace("/", "")} title={i.label} href={i.href} />
            ))}
          </div>
        </div>
      </section>

      <GapSection site={site} />

      <PricingSection site={site} />
      <RegionsSection site={site} />
      <Closing site={site} />
    </Shell>
  );
}
