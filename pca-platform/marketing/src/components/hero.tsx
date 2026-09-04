import type { SiteContent } from "@/content";

export default function Hero({ site }: { site: SiteContent }) {
  const h = site.hero;
  return (
    <div className="hero" id="top">
      <div className="wrap inner">
        <span className="eyebrow">{h.eyebrow}</span>
        <p className="display">
          {h.display.map((line, i) => (
            <span key={line}>
              {line}
              {i < h.display.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
        <h1>{h.title}</h1>
        <p className="lead">{h.lead}</p>
        <div className="cta">
          <a className="btn solid lg" href={h.primary.href}>{h.primary.label}</a>
          <a className="btn lg ghost" href={h.secondary.href}>{h.secondary.label}</a>
        </div>
      </div>
    </div>
  );
}
