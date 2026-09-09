import Radar from "@/components/radar";
import { loginUrl, platformUrl } from "@/lib/platform";
import type { SiteContent } from "@/content";

export function Who({ site }: { site: SiteContent }) {
  const w = site.who;
  return (
    <section id="who" className="divided">
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
            <h4>{site.nav.login}</h4>
            <ul>
              <li>
                <a href={loginUrl(site)}>{site.nav.login}</a>
              </li>
              <li>
                <span className="soon">{site.nav.loginNote}</span>
              </li>
              {site.footer.privacyLabel ? (
                <li>
                  <a href={`${platformUrl(site)}/privacy`}>{site.footer.privacyLabel}</a>
                </li>
              ) : null}
            </ul>
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

/* ── 홈페이지 절 ───────────────────────────────── */

export function About({ site }: { site: SiteContent }) {
  const a = site.about;
  return (
    <section id="about" className="divided">
      <div className="wrap">
        <div className="aboutgrid">
          <div>
            <span className="label-sm">{a.label}</span>
            <h2 style={{ margin: "16px 0 16px" }}>{a.heading}</h2>
            <p className="lead">{a.body}</p>
            <p className="highlight">{a.highlight}</p>
          </div>
          <div className="metalist">
            <div>
              <h4>{a.brandsLabel}</h4>
              <ul className="brands">
                {a.brands.map((b) => (
                  <li key={b.name}>
                    <b>{b.name}</b>
                    <span>{b.note}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>{a.partnersLabel}</h4>
              <div className="chips">
                {a.partners.map((p) => (
                  <span key={p}>{p}</span>
                ))}
              </div>
              <p className="small" style={{ marginTop: 12 }}>
                {a.partnersNote}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProgramSection({ site }: { site: SiteContent }) {
  const p = site.program;
  return (
    <section id="program" className="divided tinted">
      <div className="wrap">
        <div className="sec-head">
          <span className="label-sm">{p.label}</span>
          <h2>{p.heading}</h2>
          <p className="lead">{p.lead}</p>
        </div>
        <div className="cardgrid c2">
          {p.items.map((i) => (
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

/** 한국 전용 — 앵커사업 맥락 */
export function University({ site }: { site: SiteContent }) {
  const u = site.university;
  if (!u) return null;
  return (
    <section id="university" className="divided">
      <div className="wrap">
        <div className="sec-head">
          <span className="label-sm">{u.label}</span>
          <h2>{u.heading}</h2>
          <p className="lead">{u.lead}</p>
        </div>

        <div className="facts">
          {u.facts.map((f) => (
            <div key={f.label}>
              <span className="l">{f.label}</span>
              <b>
                {f.value}
                <em>{f.unit}</em>
              </b>
            </div>
          ))}
        </div>
        <p className="source">{u.source}</p>

        <div className="cardgrid c2" style={{ marginTop: 30 }}>
          {u.points.map((p) => (
            <div className="card" key={p.title}>
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

export function ProcessSection({ site }: { site: SiteContent }) {
  const p = site.process;
  if (!p) return null;
  return (
    <section id="process" className="divided tinted">
      <div className="wrap">
        <div className="sec-head">
          <span className="label-sm">{p.label}</span>
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
        <p className="lead" style={{ marginTop: 26 }}>
          {p.note}
        </p>
      </div>
    </section>
  );
}

/** 글로벌 전용 — 무엇이 공유되고 무엇을 다시 만드는가 */
export function Localisation({ site }: { site: SiteContent }) {
  const l = site.localisation;
  if (!l) return null;
  return (
    <section id="localisation" className="divided">
      <div className="wrap">
        <div className="sec-head">
          <span className="label-sm">{l.label}</span>
          <h2>{l.heading}</h2>
          <p className="lead">{l.lead}</p>
        </div>
        <div className="layers">
          {l.layers.map((la, i) => (
            <div className={`layer${i === 0 ? " shared" : ""}`} key={la.tag}>
              <span className="tag">{la.tag}</span>
              <h3>{la.title}</h3>
              <p>{la.body}</p>
              <ul>
                {la.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="lead" style={{ marginTop: 30 }}>
          {l.note}
        </p>
      </div>
    </section>
  );
}

/** 글로벌 전용 — 역할 분담과 단계 */
export function Partnership({ site }: { site: SiteContent }) {
  const p = site.partnership;
  if (!p) return null;
  return (
    <section id="partnership" className="divided tinted">
      <div className="wrap">
        <div className="sec-head">
          <span className="label-sm">{p.label}</span>
          <h2>{p.heading}</h2>
          <p className="lead">{p.lead}</p>
        </div>
        <div className="splitgrid">
          {p.columns.map((c) => (
            <div className="splitcol" key={c.title}>
              <h3>{c.title}</h3>
              <ul>
                {c.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <ol className="steps4">
          {p.steps.map((s) => (
            <li key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function FaqSection({ site }: { site: SiteContent }) {
  const f = site.faq;
  return (
    <section id="faq" className="divided">
      <div className="wrap">
        <div className="sec-head">
          <span className="label-sm">{f.label}</span>
          <h2>{f.heading}</h2>
        </div>
        <div className="faq">
          {f.items.map((q, i) => (
            <details key={q.q} open={i === 0}>
              <summary>{q.q}</summary>
              <p className="a">{q.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** 나라별 사이트 진입 (글로벌판) */
export function RegionsSection({ site }: { site: SiteContent }) {
  const r = site.regions;
  if (!r) return null;
  return (
    <section id="regions" className="divided tinted">
      <div className="wrap">
        <div className="sec-head">
          <span className="label-sm">{r.label}</span>
          <h2>{r.heading}</h2>
          <p className="lead">{r.lead}</p>
        </div>
        <div className="regiongrid">
          {r.items.map((c) => (
            <a
              key={c.code}
              className={`region${c.live ? " live" : " soon"}`}
              href={c.href}
              {...(c.live ? { rel: "noopener" } : {})}
            >
              <span className="code">{c.code}</span>
              <span className="nm">{c.native}</span>
              <span className="dm">{c.domain}</span>
              <span className="st">{c.live ? r.liveLabel : r.soonLabel}</span>
            </a>
          ))}
        </div>
        <p className="small" style={{ marginTop: 20 }}>
          {r.note}
        </p>
      </div>
    </section>
  );
}

/** 헤더의 국가 선택기. <details> 라 자바스크립트 없이 열린다 */
export function RegionPicker({ site }: { site: SiteContent }) {
  const r = site.regions;
  if (!r) return null;
  return (
    <details className="regionpick">
      <summary>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.4" />
          <path d="M1.8 8h12.4M8 1.6c3.4 3.6 3.4 9.2 0 12.8-3.4-3.6-3.4-9.2 0-12.8z" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        {r.label}
      </summary>
      <div className="menu">
        {r.items.map((c) => (
          <a key={c.code} href={c.href} className={c.live ? "" : "soon"}>
            <b>{c.native}</b>
            <span>{c.live ? c.domain : r.soonLabel}</span>
          </a>
        ))}
      </div>
    </details>
  );
}

/** 요금제. 가격이 채워지면 문의가 아니라 신청 버튼이 된다 */
export function PricingSection({ site }: { site: SiteContent }) {
  const p = site.pricing;
  return (
    <section id="pricing" className="divided">
      <div className="wrap">
        <div className="sec-head">
          <span className="label-sm">{p.label}</span>
          <h2>{p.heading}</h2>
          <p className="lead">{p.lead}</p>
        </div>

        <div className="plangrid">
          {p.plans.map((pl) => (
            <div className={`plan${pl.featured ? " featured" : ""}`} key={pl.key}>
              <span className="who">{pl.who}</span>
              <h3>{pl.name}</h3>
              <div className="price">
                {pl.price ? (
                  <>
                    <b>{pl.price}</b>
                    <em>{pl.unit}</em>
                  </>
                ) : (
                  <span className="ask">{pl.cta.ask}</span>
                )}
              </div>
              <ul>
                {pl.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p className="note">{pl.note}</p>
              <a className={`btn${pl.featured ? " solid" : ""}`} href="/contact">
                {pl.price ? pl.cta.ready : pl.cta.ask}
              </a>
            </div>
          ))}
        </div>
        <p className="small" style={{ marginTop: 22 }}>
          {p.note}
        </p>
      </div>
    </section>
  );
}
