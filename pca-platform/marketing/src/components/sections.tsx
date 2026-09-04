import type { SiteContent } from "@/content";
import { CohortPreview, StudentPreview } from "@/components/report-preview";

export function Problem({ site }: { site: SiteContent }) {
  return (
    <section>
      <div className="wrap">
        <div className="sec-head">
          <h2>{site.problem.heading}</h2>
          <p className="lead">{site.problem.lead}</p>
        </div>
        <div className="items">
          {site.problem.items.map((i) => (
            <div className="item" key={i.title}>
              <h3>{i.title}</h3>
              <p>{i.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Outputs({ site }: { site: SiteContent }) {
  return (
    <section id="outputs">
      <div className="wrap">
        <div className="sec-head">
          <h2>{site.outputs.heading}</h2>
          <p className="lead">{site.outputs.lead}</p>
        </div>
        <div className="cards">
          {site.outputs.cards.map((c) => (
            <div className="card" key={c.title}>
              <span className="tag">{c.tag}</span>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
              <ul>
                {c.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              {c.kind === "student" ? (
                <StudentPreview site={site} />
              ) : (
                <CohortPreview site={site} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Process({ site }: { site: SiteContent }) {
  return (
    <section id="process">
      <div className="wrap">
        <div className="sec-head">
          <h2>{site.process.heading}</h2>
          <p className="lead">{site.process.lead}</p>
        </div>
        <ol className="steps-ol">
          {site.process.steps.map((s) => (
            <li key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="small" style={{ marginTop: 26 }}>
          {site.process.note}
        </p>
      </div>
    </section>
  );
}

export function Faq({ site }: { site: SiteContent }) {
  return (
    <section id="faq">
      <div className="wrap">
        <div className="sec-head">
          <h2>{site.faq.heading}</h2>
        </div>
        <div className="faq">
          {site.faq.items.map((f, i) => (
            <details key={f.q} open={i === 0}>
              <summary>{f.q}</summary>
              <p className="a">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SiteFooter({ site }: { site: SiteContent }) {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="row">
          <div style={{ minWidth: 220 }}>
            <div className="brand" style={{ fontSize: 17, fontWeight: 800 }}>
              {site.brand}
            </div>
            <p style={{ marginTop: 8 }}>{site.footer.note}</p>
          </div>
          <div>
            <h4>{site.footer.sitesLabel}</h4>
            <ul>
              {site.footer.sites.map((s) => (
                <li key={s.label}>
                  {s.ready ? (
                    <a href={s.href}>{s.label}</a>
                  ) : (
                    <span className="soon">
                      {s.label} <em>({site.footer.soonLabel})</em>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="note">{site.footer.platformNote}</p>
      </div>
    </footer>
  );
}
