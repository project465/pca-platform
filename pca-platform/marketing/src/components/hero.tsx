import type { SiteContent } from "@/content";

export default function Hero({ site }: { site: SiteContent }) {
  return (
    <div className="hero" id="top">
      <div className="wrap inner">
        <span className="eyebrow">{site.hero.eyebrow}</span>
        <h1>
          {site.hero.title.map((line, i) => (
            <span key={i}>
              {line}
              {i < site.hero.title.length - 1 ? <br /> : null}
            </span>
          ))}
        </h1>
        <p className="lead">{site.hero.lead}</p>
        <div className="cta">
          <a className="btn solid lg" href={site.hero.primary.href}>
            {site.hero.primary.label}
          </a>
          <a className="btn lg" href={site.hero.secondary.href}>
            {site.hero.secondary.label}
          </a>
        </div>
      </div>
    </div>
  );
}
