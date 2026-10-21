import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSite } from "@/content";
import { Shell } from "@/components/chrome";
import { Button, Closing, FaqList, SectionHead } from "@/components/blocks";
import { Icon, type IconName } from "@/components/icons";

export function generateMetadata(): Metadata {
  const a = getSite().assistant;
  return a ? { title: a.meta.title, description: a.meta.description } : {};
}

/**
 * AI 취업비서(앱 안의 이름은 Track).
 *
 * **한국 시장에만 판다.** 원고에 `assistant` 가 없는 판(글로벌)에서는 이
 * 쪽이 없다: 메뉴에도 서지 않고 주소를 쳐도 404 다.
 *
 * **준비 중인 것을 산 것처럼 적지 않는다.** 월간 변화 리포트는 테를
 * 두르지 않고 한 줄로만 적는다. 카드로 그리면 있는 기능처럼 보인다.
 *
 * 값은 `lib/prices.ts` 한 곳에서 온다. 결제는 앱에서 한다.
 */
const FEATURE_ICON: IconName[] = ["bell", "pencil", "compare", "swap"];

export default function Assistant() {
  const site = getSite();
  const a = site.assistant;
  if (!a) notFound();

  return (
    <Shell site={site}>
      <section className="hero hero-sub hero-assistant">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="pill">{a.hero.eyebrow}</span>
            <h1>
              {a.hero.title.map((t, i) => (
                <span key={t} className={i === a.hero.title.length - 1 ? "hl" : undefined}>
                  {t}
                </span>
              ))}
            </h1>
            <p className="hero-lead">{a.hero.lead}</p>
            <div className="hero-acts">
              <Button link={a.hero.primary} size="lg" arrow />
              <Button link={a.hero.secondary} kind="ghost" size="lg" />
            </div>
            <p className="hero-note">{a.hero.note}</p>
          </div>
          <div className="hero-visual">
            <div className="week" role="img" aria-label={a.features.items.map((f) => f.title).join(", ")}>
              {a.features.items.map((f, i) => (
                <div className="week-row" key={f.title} aria-hidden="true">
                  <span className="feature-ico">
                    <Icon name={FEATURE_ICON[i] ?? "check"} size={18} />
                  </span>
                  <div>
                    <b>{f.title}</b>
                    <small>{f.body}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="wrap">
          <SectionHead label={a.features.label} title={a.features.title} />
          <div className="feature-grid feature-grid-2">
            {a.features.items.map((f, i) => (
              <article className="card feature" key={f.title}>
                <span className="feature-ico">
                  <Icon name={FEATURE_ICON[i] ?? "check"} size={18} />
                </span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
          <p className="planned">
            <span>{a.features.planned}</span>
            {a.features.plannedNote}
          </p>
        </div>
      </section>

      <section className="section section-tint" id="plans">
        <div className="wrap">
          <SectionHead label={a.plans.label} title={a.plans.title} lead={a.plans.lead} center />
          <div className="plans">
            {a.plans.items.map((p) => (
              <article key={p.name} className={`card plan${p.featured ? " is-featured" : ""}`}>
                <h3>{p.name}</h3>
                <div className="plan-price">
                  <b>{p.price}</b>
                  <span>{p.unit}</span>
                </div>
                <p>{p.body}</p>
                <Button link={p.cta} kind={p.featured ? "primary" : "ghost"} arrow />
              </article>
            ))}
          </div>
          <div className="plan-notes">
            <p className="plan-trial">
              <Icon name="sparkle" size={18} />
              {a.plans.trial}
            </p>
            <ul>
              {a.plans.notes.map((n) => (
                <li key={n}>
                  <Icon name="check" size={16} stroke={2.2} />
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section" id="faq">
        <div className="wrap faq-wrap">
          <SectionHead label={a.faq.label} title={a.faq.title} />
          <FaqList items={a.faq.items} />
        </div>
      </section>

      <Closing {...a.closing} />
    </Shell>
  );
}
