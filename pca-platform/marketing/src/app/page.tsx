import { getSite } from "@/content";
import Shell from "@/components/shell";
import Hero from "@/components/hero";
import { Analyze, Closing, PricingSection, RegionsSection, Who } from "@/components/sections";
import { FlowDiagram, NextLink, PhotoSlot, PullQuote, ReportMini } from "@/components/visuals";
import SampleReport from "@/components/sample-report";

export default function Home() {
  const site = getSite();
  const u = site.ui;
  const flow = u.flow.map((v, i) => ({ k: `0${i + 1}`, v }));

  return (
    <Shell>
      <Hero site={site} />

      <SampleReport site={site} />

      <section className="divided">
        <div className="wrap">
          <div className="sec-head">
            <span className="label-sm">{u.glanceLabel}</span>
            <h2>{u.glanceHeading}</h2>
          </div>
          <FlowDiagram steps={flow} />
        </div>
      </section>

      <Who site={site} />
      <Analyze site={site} />

      <section className="divided tinted">
        <div className="wrap photosplit">
          <div>
            <span className="label-sm">{site.sheet.label}</span>
            <h2 style={{ margin: "16px 0 16px" }}>{site.sheet.heading}</h2>
            <p className="lead">{site.sheet.lead[0]}</p>
            <div style={{ marginTop: 24 }}>
              <a className="btn lg solid" href="/metri">
                {u.sheetCta}
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
            {u.photos.home.map((c) => (
              <PhotoSlot key={c} caption={c} />
            ))}
          </div>
        </div>
      </section>

      <section className="divided">
        <div className="wrap">
          <div className="sec-head">
            <span className="label-sm">{u.moreLabel}</span>
            <h2>{u.moreHeading}</h2>
          </div>
          <div className="nextgrid">
            {site.nav.items.slice(0, 4).map((i) => (
              <NextLink key={i.href} label={i.href.replace("/", "")} title={i.label} href={i.href} />
            ))}
          </div>
        </div>
      </section>

      <PricingSection site={site} />
      <RegionsSection site={site} />
      <Closing site={site} />
    </Shell>
  );
}
