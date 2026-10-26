import { getSite, type Lang } from "@/content";
import { pageMeta, type PageParams } from "@/lib/seo";
import { HTML_LANG } from "@/lib/i18n";
import { Shell } from "@/components/chrome";
import { Button, Closing, FaqList, SectionHead } from "@/components/blocks";
import { Icon, type IconName } from "@/components/icons";
import { ReportMockView, WorkspaceMockView } from "@/components/mocks";
import { WorldMap } from "@/components/world";
import type { Metadata } from "next";
import { getRates, localize } from "@/lib/fx";

/* 환율(`lib/fx.ts`) 때문에 요청마다 그린다. 환율 자체는 fetch 저장분으로 한 시간에 한 번만 받는다.
   미리 구워 두면 빌드할 때의 환율이 다음 배포까지 남는다 */
export const dynamic = "force-dynamic";

/**
 * 홈. 이 순서가 곧 설명의 순서다:
 *
 *   무엇을 하는가 → 어떻게 쓰나 → 결과지에 무엇이 담기나 → 어느 전공인가
 *   → 학교·기관 → 개인 → 자주 묻는 것 → 시작
 *
 * 검사도 결제도 여기 두지 않는다. 단추는 전부 앱으로 가거나(검사 시작 ·
 * 로그인 · 요금) 이 사이트의 다른 쪽으로 간다(대학·기관 · 문의).
 */
const STEP_ICON: IconName[] = ["clipboard", "doc", "layers"];
const REPORT_ICON: IconName[] = ["target", "check", "pencil", "link", "calendar", "doc"];
const CAMPUS_ICON: IconName[] = ["cap", "key", "chart", "download"];
export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { lang } = await params;
  const site = getSite(lang);
  return pageMeta(lang as Lang, "/", site.meta);
}

const TRUST_ICON: IconName[] = ["shield", "list", "building"];

export default async function Home({ params }: PageParams) {
  const { lang } = await params;
  const fx = lang === "ko" ? null : await getRates();
  const site = getSite(lang);
  const h = site.home;

  return (
    <Shell site={site} path="/">
      {/* ── 첫 화면 ─────────────────────────────────────────── */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="pill">{h.hero.eyebrow}</span>
            <h1>
              {h.hero.title.map((t, i) => (
                <span key={t} className={i === h.hero.title.length - 1 ? "hl" : undefined}>
                  {t}
                </span>
              ))}
            </h1>
            <p className="hero-lead">{h.hero.lead}</p>
            <div className="hero-acts">
              <Button link={h.hero.primary} size="lg" arrow />
              <Button link={h.hero.secondary} kind="ghost" size="lg" />
            </div>
            <p className="hero-note">
              {h.hero.note}{" "}
              <a href={h.hero.noteLink.href}>
                {h.hero.noteLink.label}
                <Icon name="arrow" size={15} />
              </a>
            </p>
          </div>
          <div className="hero-visual">
            <WorkspaceMockView m={h.mock} />
          </div>
        </div>
      </section>

      {/* ── 어떻게 쓰나 ─────────────────────────────────────── */}
      <section className="section" id="how">
        <div className="wrap">
          <SectionHead label={h.how.label} title={h.how.title} lead={h.how.lead} />
          <ol className="steps">
            {h.how.steps.map((s, i) => (
              <li key={s.no} className="step">
                <div className="step-top">
                  <span className="step-ico">
                    <Icon name={STEP_ICON[i] ?? "doc"} size={22} />
                  </span>
                  <span className="step-no">{s.no}</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <ul className="checks">
                  {s.points.map((p) => (
                    <li key={p}>
                      <Icon name="check" size={16} stroke={2.2} />
                      {p}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 결과지 ─────────────────────────────────────────── */}
      <section className="section section-tint" id="report">
        <div className="wrap split">
          <div>
            <SectionHead label={h.report.label} title={h.report.title} lead={h.report.lead} />
            <ul className="feature-list">
              {h.report.items.map((it, i) => (
                <li key={it.title}>
                  <span className="feature-ico">
                    <Icon name={REPORT_ICON[i] ?? "doc"} size={18} />
                  </span>
                  <div>
                    <b>{it.title}</b>
                    <p>{it.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="fine">
              <Icon name="shield" size={16} />
              {h.report.note}
            </p>
          </div>
          <div className="split-visual">
            <ReportMockView m={h.report.mock} />
          </div>
        </div>
      </section>

      {/* ── 전공 Core ──────────────────────────────────────── */}
      <section className="section" id="majors">
        <div className="wrap">
          <SectionHead label={h.majors.label} title={h.majors.title} lead={h.majors.lead} />
          <div className="majors">
            {h.majors.groups.map((g) => (
              <div className="major-group" key={g.name}>
                <h3>
                  {g.name}
                  <span>{g.items.length}</span>
                </h3>
                <ul>
                  {g.items.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="majors-foot">
            <p>{h.majors.note}</p>
            <Button link={h.majors.cta} arrow />
          </div>
        </div>
      </section>

      {/* ── 해외 ───────────────────────────────────────────── */}
      {h.global && (
        <section className="section section-tint" id="global">
          <div className="wrap">
            <SectionHead label={h.global.label} title={h.global.title} lead={h.global.lead} />
            <div className="world-grid">
              <figure className="world-fig">
                <WorldMap
                  countries={h.global.countries}
                  label={`${h.global.legend.done}: ${h.global.countries.filter((c) => c.status === "done").map((c) => c.name).join(", ")}. ${h.global.legend.planned}: ${h.global.countries.filter((c) => c.status === "planned").map((c) => c.name).join(", ")}.`}
                />
                <figcaption className="world-legend">
                  <span><i className="lg-done" />{h.global.legend.done}</span>
                  <span><i className="lg-planned" />{h.global.legend.planned}</span>
                </figcaption>
              </figure>
              <div className="world-list">
                {(["done", "planned"] as const).map((st) => (
                  <div key={st}>
                    <h3>{st === "done" ? h.global!.legend.done : h.global!.legend.planned}</h3>
                    <ul className={`country-list is-${st}`}>
                      {h.global!.countries.filter((c) => c.status === st).map((c) => (
                        <li key={c.iso}>
                          <b>{c.name}</b>
                          {c.schools?.map((s) => <span key={s}>{s}</span>)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p className="fine">
                  <Icon name="shield" size={16} />
                  {h.global.source}
                </p>
              </div>
            </div>

            <div className="sample-head">
              <h3>{h.global.samples.title}</h3>
              <p>{h.global.samples.lead}</p>
            </div>
            <div className="samples">
              {h.global.samples.items.map((s) => (
                <article key={s.code} className={`sample is-${s.status}`} lang={s.code}>
                  <header className="sample-top">
                    <b>{s.lang}</b>
                    {/* 그 말을 쓰는 판에서는 같은 이름이 두 번 선다 */}
                    {s.langKo !== s.lang && <span lang={HTML_LANG[lang as Lang]}>{s.langKo}</span>}
                    <em lang={HTML_LANG[lang as Lang]} className={`sample-status is-${s.status}`}>{s.statusLabel}</em>
                  </header>
                  <div className="sample-q">
                    <span className="sample-label">{s.question.label} · {s.question.area}</span>
                    <p>{s.question.text}</p>
                    <ol className="sample-scale">
                      {s.question.scale.map((l, i) => (
                        <li key={l} className={i === 3 ? "is-on" : undefined}>
                          <span>{i + 1}</span>
                          {l}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="sample-r">
                    <span className="sample-label">{s.result.label}</span>
                    <small>{s.result.areasLabel}</small>
                    <ul>
                      {s.result.areas.map((a) => <li key={a}>{a}</li>)}
                    </ul>
                    <small>{s.result.nextLabel}</small>
                    <p>{s.result.next}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 근거 ───────────────────────────────────────────── */}
      {h.trust && (
        <section className="section" id="trust">
          <div className="wrap">
            <SectionHead label={h.trust.label} title={h.trust.title} lead={h.trust.lead} />
            <div className="trust-cards">
              {h.trust.cards.map((c, i) => (
                <article key={c.title} className="trust-card">
                  <span className="feature-ico">
                    <Icon name={TRUST_ICON[i] ?? "shield"} size={18} />
                  </span>
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                  <ul>
                    {c.items.map((it) => (
                      <li key={it}>
                        <Icon name="check" size={15} stroke={2.2} />
                        {it}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <div className="verify">
              <div className="verify-head">
                <h3>{h.trust.verify.title}</h3>
                <p>{h.trust.verify.lead}</p>
              </div>
              <ol className="verify-steps">
                {h.trust.verify.steps.map((s) => (
                  <li key={s.title} className={`is-${s.status}`}>
                    <span className="verify-badge">{h.trust!.verify.statusLabel[s.status]}</span>
                    <b>{s.title}</b>
                    <p>{s.body}</p>
                  </li>
                ))}
              </ol>
              <p className="fine">
                <Icon name="shield" size={16} />
                {h.trust.note}
              </p>
            </div>

            {h.trust.math && (
              <div className="math">
                <div className="math-head">
                  <h3>{h.trust.math.title}</h3>
                  <p>{h.trust.math.lead}</p>
                </div>
                <ol className="math-steps">
                  {h.trust.math.steps.map((s) => (
                    <li key={s.no} className={s.status === "next" ? "is-next" : undefined}>
                      <div className="math-top">
                        <span className="math-no">{s.no}</span>
                        <b>{s.title}</b>
                        {s.status === "next" && <em className="verify-badge">{h.trust!.math!.nextLabel}</em>}
                      </div>
                      {/* 식은 이 사이트가 쓴 짧은 HTML 이다(sub · sup · frasl). 밖에서 받은 글을 담지 않는다 */}
                      {/* 식 둘을 쉼표로 이어 적은 자리는 줄을 나눈다. 한 줄에 두면 칸 폭을
                          넘어 뒤 식이 잘려 보인다 */}
                      <div className="math-f" dangerouslySetInnerHTML={{ __html: s.formula.replace(/,&ensp;/g, "<br>") }} />
                      <p>{s.body}</p>
                    </li>
                  ))}
                </ol>
                <div className="weights">
                  <div className="weights-head">
                    <h4>{h.trust.math.weights.title}</h4>
                    <p>{h.trust.math.weights.lead}</p>
                  </div>
                  <div className="weights-grid">
                    {h.trust.math.weights.areas.map((a) => (
                      <figure key={a.name} className="weight-card">
                        <figcaption>{a.name}</figcaption>
                        <ul>
                          {a.rows.map((r) => (
                            <li key={r.axis}>
                              <span className="w-axis">{r.axis}</span>
                              <span className="w-bar" aria-hidden="true">
                                <i style={{ width: `${Math.round(r.w * 200)}%` }} />
                              </span>
                              <span className="w-val">{r.w.toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      </figure>
                    ))}
                  </div>
                  <p className="fine">
                    <Icon name="list" size={16} />
                    {h.trust.math.weights.note}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── 대학·기관 ──────────────────────────────────────── */}
      <section className="section section-navy" id="campus">
        <div className="wrap">
          <div className="campus-grid">
            <div>
              <SectionHead label={h.campus.label} title={h.campus.title} lead={h.campus.lead} invert />
              <div className="campus-acts">
                <Button link={h.campus.primary} kind="light" arrow />
                <Button link={h.campus.secondary} kind="outline-light" />
              </div>
            </div>
            <ul className="campus-points">
              {h.campus.points.map((p, i) => (
                <li key={p.title}>
                  <span className="feature-ico is-invert">
                    <Icon name={CAMPUS_ICON[i] ?? "check"} size={18} />
                  </span>
                  <div>
                    <b>{p.title}</b>
                    <p>{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── 개인 ───────────────────────────────────────────── */}
      <section className="section" id="personal">
        <div className="wrap">
          <SectionHead label={h.personal.label} title={h.personal.title} lead={h.personal.lead} />
          <div className="cards-2">
            {h.personal.cards.map((c, i) => (
              <article key={c.title} className={`card offer${i === 1 ? " is-accent" : ""}`}>
                <span className="tag">{c.tag}</span>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
                {c.price && (() => {
                  /* 영어·일본어·중국어 판은 그 나라 통화로 어림하고, 실제 결제되는 원화를 작게 적는다(`lib/fx.ts`) */
                  const lp = localize(c.price, lang as Lang, fx);
                  return (
                    <div className="offer-price">
                      <b>{lp.main}</b>
                      {c.priceNote && <span>{c.priceNote}</span>}
                      {lp.note && <small className="fx-note">{lp.note}</small>}
                    </div>
                  );
                })()}
                <ul className="checks">
                  {c.points.map((p) => (
                    <li key={p}>
                      <Icon name="check" size={16} stroke={2.2} />
                      {p}
                    </li>
                  ))}
                </ul>
                <div className="card-foot">
                  <Button link={c.cta} kind={i === 1 ? "primary" : "ghost"} arrow />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 자주 묻는 것 ───────────────────────────────────── */}
      <section className="section section-tint" id="faq">
        <div className="wrap faq-wrap">
          <SectionHead label={h.faq.label} title={h.faq.title} />
          <FaqList items={h.faq.items} />
        </div>
      </section>

      <Closing {...h.closing} />
    </Shell>
  );
}
