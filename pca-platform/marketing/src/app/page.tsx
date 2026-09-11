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
  const kr = site.key === "kr";

  const flow = kr
    ? [
        { k: "01", v: "진단 응시" },
        { k: "02", v: "직무 영역 10개" },
        { k: "03", v: "업무 성향 6유형" },
        { k: "04", v: "실행 전략" },
        { k: "05", v: kr ? "지역 기업 연계" : "실행" },
      ]
    : [
        { k: "01", v: "Sitting" },
        { k: "02", v: "Ten job areas" },
        { k: "03", v: "Six work styles" },
        { k: "04", v: "Execution plan" },
        { k: "05", v: "Report" },
      ];

  return (
    <Shell>
      <Hero site={site} />

      <SampleReport site={site} />

      <section className="divided">
        <div className="wrap">
          <div className="sec-head">
            <span className="label-sm">{kr ? "한눈에" : "AT A GLANCE"}</span>
            <h2>{kr ? "진단 한 번이 실행까지 이어집니다" : "One sitting, carried through to execution"}</h2>
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
                {kr ? "결과지 구성 보기" : "See the result sheet"}
              </a>
            </div>
          </div>
          <ReportMini site={site} />
        </div>
      </section>

      <section className="divided">
        <div className="wrap">
          <PullQuote source={kr ? site.why.after.title : site.why.after.title}>
            {site.why.after.verdict}
          </PullQuote>
          <div className="photorow" style={{ marginTop: 34 }}>
            <PhotoSlot caption={kr ? "사진 자리 — 직무별 취업 특강 현장" : "Photo — employment lecture"} />
            <PhotoSlot caption={kr ? "사진 자리 — STEM 멘토링 진행 장면" : "Photo — STEM mentoring session"} />
            <PhotoSlot caption={kr ? "사진 자리 — 채용 박람회 부스" : "Photo — career fair"} />
          </div>
        </div>
      </section>

      <section className="divided">
        <div className="wrap">
          <div className="sec-head">
            <span className="label-sm">{kr ? "더 보기" : "GO DEEPER"}</span>
            <h2>{kr ? "필요한 곳부터 보세요" : "Start where it matters to you"}</h2>
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
