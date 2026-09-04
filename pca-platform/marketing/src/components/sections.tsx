import type { SiteContent } from "@/content";

export function About({ site }: { site: SiteContent }) {
  const a = site.about;
  return (
    <section id="about" className="tinted bordered">
      <div className="wrap">
        <div className="about-grid">
          <div>
            <span className="label-sm">{a.label}</span>
            <div className="org-mark" style={{ marginTop: 10 }}>
              <b>{site.org}</b>
              <span>Education &amp; Conference</span>
            </div>
            <h2 style={{ marginBottom: 12 }}>{a.heading}</h2>
            <p className="lead">{a.body}</p>
            <p className="highlight">{a.highlight}</p>

            <div className="meta-rows">
              <div className="meta-row">
                <b>{a.brandsLabel}</b>
                <span className="v">
                  {a.brands.map((b) => (
                    <span className="bn" key={b.name}>
                      {b.name}
                      <em>{b.note}</em>
                    </span>
                  ))}
                </span>
              </div>
              <div className="meta-row">
                <b>{a.partnersLabel}</b>
                <span className="v">
                  {a.partners.map((p) => (
                    <span className="pt" key={p}>
                      {p}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          </div>

          <div className="svc">
            {a.services.map((s) => (
              <div key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Evidence({ site }: { site: SiteContent }) {
  const e = site.evidence;
  return (
    <section id="evidence">
      <div className="wrap">
        <div className="sec-head">
          <h2>{e.heading}</h2>
          <p className="lead">{e.lead}</p>
        </div>
        <div className="stats">
          {e.stats.map((s) => (
            <div className="stat" key={s.label}>
              <b>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Questions({ site }: { site: SiteContent }) {
  const q = site.questions;
  return (
    <section className="tinted bordered">
      <div className="wrap">
        <div className="sec-head">
          <h2>{q.heading}</h2>
          <p className="lead">{q.lead}</p>
        </div>
        <ul className="qs">
          {q.items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
        <p className="lead" style={{ marginTop: 26 }}>
          {q.note}
        </p>
      </div>
    </section>
  );
}

export function Analysis({ site }: { site: SiteContent }) {
  const a = site.analysis;
  return (
    <section id="analysis" className="bordered">
      <div className="wrap">
        <div className="sec-head">
          <h2>{a.heading}</h2>
          <p className="lead">{a.lead}</p>
        </div>
        <div className="pillars">
          {a.pillars.map((p, i) => (
            <div className="pillar" key={p.title}>
              <span className="n">{i + 1}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
        <p className="lead" style={{ marginTop: 26 }}>
          {a.note}
        </p>
      </div>
    </section>
  );
}

export function Compare({ site }: { site: SiteContent }) {
  const c = site.compare;
  return (
    <section className="bordered">
      <div className="wrap">
        <div className="sec-head">
          <h2>{c.heading}</h2>
          <p className="lead">{c.lead}</p>
        </div>
        <div className="cmp">
          {[c.before, c.after].map((col, idx) => (
            <div className={`cmp-col${idx === 1 ? " on" : ""}`} key={col.title}>
              <span className="tag">{col.tag}</span>
              <h3>{col.title}</h3>
              <ol>
                {col.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <p className="verdict">{col.verdict}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Report({ site }: { site: SiteContent }) {
  const r = site.report;
  const max = 100;
  return (
    <section id="report" className="tinted bordered">
      <div className="wrap">
        <div className="sec-head">
          <h2>{r.heading}</h2>
          <p className="lead">{r.lead}</p>
        </div>

        <div className="repgrid">
          <div>
            <span className="volume">{r.volume}</span>
            <ul className="toc">
              {r.sections.map((s) => (
                <li key={s.no}>
                  <span className="no">{s.no}</span>
                  <span className="t">{s.title}</span>
                  <span className="b">{s.body}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rankbox">
            <div className="cap">
              <b>{r.rankTitle}</b>
              <span className="ex">{r.exampleLabel}</span>
            </div>
            <ul>
              {r.ranks.map((k) => (
                <li key={k.name}>
                  <span className="nm">{k.name}</span>
                  <span className="track">
                    <span className="fill" style={{ width: `${(k.score / max) * 100}%` }} />
                  </span>
                  <span className="val">{k.score}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Region({ site }: { site: SiteContent }) {
  const r = site.region;
  return (
    <section id="region" className="bordered">
      <div className="wrap">
        <div className="region-hd">
          <span className="label-sm">{r.label}</span>
          <h2>{r.heading}</h2>
          <p className="lead">{r.lead}</p>
        </div>

        <div className="ba">
          <div className="cell">
            <b>{r.beforeValue}</b>
            <span>{r.beforeLabel}</span>
          </div>
          <span className="arrow" aria-hidden="true">
            →
          </span>
          <div className="cell on">
            <b>{r.afterValue}</b>
            <span>{r.afterLabel}</span>
          </div>
        </div>

        <div>
          <span className="small" style={{ fontWeight: 700 }}>
            {r.clustersLabel}
          </span>
          <div className="clusters">
            {r.clusters.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </div>

        <div className="rpoints">
          {r.points.map((p, i) => (
            <div className="rpoint" key={p.title}>
              <span className="n">{i + 1}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          ))}
        </div>

        <blockquote className="quote">
          <p>{r.quote}</p>
          <cite>{r.quoteSource}</cite>
        </blockquote>
      </div>
    </section>
  );
}

export function University({ site }: { site: SiteContent }) {
  const u = site.university;
  return (
    <section id="university" className="tinted bordered">
      <div className="wrap">
        <div className="sec-head">
          <span className="label-sm">{u.label}</span>
          <h2>{u.heading}</h2>
          <p className="lead">{u.lead}</p>
        </div>
        <div className="upoints">
          {u.points.map((p) => (
            <div className="upoint" key={p.title}>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
        <p className="closing-line">{u.closing}</p>
      </div>
    </section>
  );
}

export function Process({ site }: { site: SiteContent }) {
  const p = site.process;
  return (
    <section id="process" className="bordered">
      <div className="wrap">
        <div className="sec-head">
          <h2>{p.heading}</h2>
          <p className="lead">{p.lead}</p>
        </div>
        <ol className="steps3">
          {p.steps.map((s) => (
            <li key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="lead" style={{ marginTop: 24 }}>
          {p.note}
        </p>
      </div>
    </section>
  );
}

export function Audience({ site }: { site: SiteContent }) {
  const a = site.audience;
  return (
    <section className="tinted bordered">
      <div className="wrap">
        <div className="sec-head">
          <h2>{a.heading}</h2>
        </div>
        <div className="aud">
          {a.items.map((t, i) => (
            <div key={t}>
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              <p>{t}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq({ site }: { site: SiteContent }) {
  return (
    <section id="faq" className="bordered">
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
        <p className="closing">{site.footer.closing}</p>
        <div className="row">
          <div style={{ minWidth: 230 }}>
            <div className="bmark">
              {site.brand} <span style={{ opacity: 0.5, fontWeight: 500 }}>· {site.org}</span>
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
