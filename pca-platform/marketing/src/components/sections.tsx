import Radar from "@/components/radar";
import type { SiteContent } from "@/content";

export function Who({ site }: { site: SiteContent }) {
  const w = site.who;
  return (
    <section id="about" className="divided">
      <div className="wrap">
        <div className="sec-head">
          <span className="label-sm">{w.label}</span>
          <h2>{w.heading}</h2>
        </div>
        <div className="cardgrid c3">
          {w.items.map((i) => (
            <div className="card" key={i.no}>
              <span className="no">{i.no}</span>
              <h3>{i.title}</h3>
              <p>{i.body}</p>
              <span className="tag">{i.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** 세 칸에 각각 다른 표식. 그림이 아니라 뜻이 있는 도형이다 */
function AnalyzeIcon({ n }: { n: number }) {
  if (n === 0)
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 2.5h8L16 6.5v11H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M11.5 2.5V7H16" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  if (n === 1)
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7.4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 5.6V10l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 13.5l4.2-4.4 3 2.6L17 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 5.5h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Analyze({ site }: { site: SiteContent }) {
  const a = site.analyze;
  return (
    <section id="analyze" className="divided">
      <div className="wrap">
        <div className="sec-head">
          <span className="label-sm">{a.label}</span>
          <h2>{a.heading}</h2>
          <p className="lead">{a.lead}</p>
        </div>
        <div className="cardgrid c3">
          {a.items.map((i, n) => (
            <div className="card" key={i.no}>
              <span className="ico">
                <AnalyzeIcon n={n} />
              </span>
              <span className="kick">
                {i.no} {i.kicker}
              </span>
              <h3>{i.title}</h3>
              <p>{i.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Why({ site }: { site: SiteContent }) {
  const w = site.why;
  return (
    <section className="divided">
      <div className="wrap">
        <div className="sec-head">
          <span className="label-sm">{w.label}</span>
          <h2>{w.heading}</h2>
        </div>
        <div className="vsgrid">
          {[w.before, w.after].map((col, i) => (
            <div className={`vscol${i === 1 ? " on" : ""}`} key={col.title}>
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
          <span className="vs" aria-hidden="true" style={{ order: 1 }}>
            {w.vs}
          </span>
        </div>
      </div>
    </section>
  );
}

export function Styles({ site }: { site: SiteContent }) {
  const s = site.styles;
  return (
    <section id="styles" className="divided">
      <div className="wrap">
        <div className="stylegrid">
          <div className="hexcard">
            <Radar
              axes={site.sheet.styleAxes}
              scores={site.sheet.styleScores}
              width={460}
              height={420}
              radius={126}
              labelGap={26}
              ariaLabel={`${s.heading}: ${site.sheet.styleAxes
                .map((a, i) => `${a} ${site.sheet.styleScores[i]}`)
                .join(", ")}`}
            />
            <p className="cn">{s.chartNote}</p>
          </div>
          <div>
            <span className="label-sm" style={{ marginBottom: 12 }}>
              {s.label}
            </span>
            <h2 style={{ marginBottom: 24 }}>{s.heading}</h2>
            <div className="stylelist">
              {s.items.map((i) => (
                <div key={i.name}>
                  <span className="dot" aria-hidden="true" />
                  <b>{i.name}</b>
                  <span>{i.body}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Evidence({ site }: { site: SiteContent }) {
  const e = site.evidence;
  return (
    <section id="evidence" className="divided">
      <div className="wrap">
        <div className="sec-head">
          <span className="label-sm">{e.label}</span>
          <h2>{e.heading}</h2>
          <p className="lead">{e.lead}</p>
        </div>

        <div className="stats">
          {e.stats.map((s) => (
            <div key={s.label}>
              <span className="l">{s.label}</span>
              <b>
                {s.value}
                {s.unit ? <em>{s.unit}</em> : null}
              </b>
            </div>
          ))}
        </div>

        <div className="panelbox">
          <h3>
            <span className="ic" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5l5 2v4c0 3-2.1 5.6-5 7-2.9-1.4-5-4-5-7v-4l5-2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
            </span>
            {e.copyright.title}
          </h3>
          {e.copyright.rows.map((r) => (
            <div className="crow" key={r.no}>
              <span>{r.name}</span>
              <span className="n">{r.no}</span>
            </div>
          ))}
          <p className="note">{e.copyright.note}</p>
        </div>

        <div className="panelbox">
          <h3>{e.standards.title}</h3>
          <div className="tablescroll">
            <table className="stdtable">
              <thead>
                <tr>
                  {e.standards.head.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {e.standards.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">{e.standards.note}</p>
        </div>
      </div>
    </section>
  );
}

export function Choose({ site }: { site: SiteContent }) {
  const c = site.choose;
  return (
    <section className="divided">
      <div className="wrap">
        <div className="sec-head">
          <span className="label-sm">{c.label}</span>
          <h2>{c.heading}</h2>
        </div>
        <div className="cardgrid c2">
          {c.items.map((i) => (
            <div className="card" key={i.title}>
              <h3>{i.title}</h3>
              <p>{i.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Closing({ site }: { site: SiteContent }) {
  const c = site.closing;
  return (
    <section className="closing">
      <div className="wrap">
        <p className="kick">{c.kicker}</p>
        <h2>
          {c.heading.map((l, i) => (
            <span key={l}>
              {l}
              {i < c.heading.length - 1 ? <br /> : null}
            </span>
          ))}
        </h2>
        <p>{c.lead}</p>
        <div className="cta">
          <a className="btn lg solid" href={c.primary.href}>
            {c.primary.label}
          </a>
          <a className="btn lg" href={c.secondary.href}>
            {c.secondary.label}
          </a>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter({ site }: { site: SiteContent }) {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <p className="closing-line">{site.footer.closing}</p>
        <div className="row">
          <div style={{ minWidth: 240 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>
              {site.brand} · {site.org}
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
      </div>
    </footer>
  );
}

export function FloatingCta({ site }: { site: SiteContent }) {
  return (
    <a className="floating" href="#contact">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 3.5h12v8H6.5L3 14v-2.5H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      {site.nav.floating}
    </a>
  );
}
