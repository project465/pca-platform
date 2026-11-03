import type { Metadata } from "next";
import { getSite, type Lang } from "@/content";
import { pageMeta, type PageParams } from "@/lib/seo";
import { Shell } from "@/components/chrome";
import { Button, Closing, FaqList, SectionHead } from "@/components/blocks";
import { Icon, type IconName } from "@/components/icons";
import { CampusMockView } from "@/components/mocks";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { lang } = await params;
  const site = getSite(lang);
  return pageMeta(lang as Lang, "/universities", site.universities.meta);
}

/**
 * 대학·기관 쪽.
 *
 * 담당자가 실제로 하는 일(계정 발급 · 진행 현황 · 집계 · CSV)을 적고,
 * 보이지 않는 것(학생 개인의 답과 결과지 · 5명 미만 칸)을 같은 무게로
 * 적는다. 학교가 사기 전에 가장 먼저 묻는 것이 뒤엣것이다.
 *
 * **실제 학교 이름을 예시로 쓰지 않는다.** 학교 전용 주소도 `학교코드` 로
 * 적는다: 계약 여부를 확인받지 않은 학교 이름이 홈페이지에 서면 그 학교가
 * 우리 고객이라는 말이 된다.
 */
const FEATURE_ICON: IconName[] = ["users", "key", "pause", "list", "chart", "bell", "download", "refresh"];

export default async function Universities({ params }: PageParams) {
  const { lang } = await params;
  const site = getSite(lang);
  const u = site.universities;

  return (
    <Shell site={site} path="/universities">
      <section className="hero hero-sub">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="pill">{u.hero.eyebrow}</span>
            <h1>
              {u.hero.title.map((t, i) => (
                <span key={t} className={i === u.hero.title.length - 1 ? "hl" : undefined}>
                  {t}
                </span>
              ))}
            </h1>
            <p className="hero-lead">{u.hero.lead}</p>
            <div className="hero-acts">
              <Button link={u.hero.primary} size="lg" arrow />
              <Button link={u.hero.secondary} kind="ghost" size="lg" />
            </div>
          </div>
          <div className="hero-visual">
            <CampusMockView m={u.mock} />
          </div>
        </div>
      </section>

      <section className="section" id="flow">
        <div className="wrap">
          <SectionHead label={u.flow.label} title={u.flow.title} lead={u.flow.lead} />
          <ol className="flow">
            {u.flow.steps.map((s, i) => (
              <li key={s.title}>
                <span className="flow-no">{String(i + 1).padStart(2, "0")}</span>
                <b>{s.title}</b>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section-tint" id="features">
        <div className="wrap">
          <SectionHead label={u.features.label} title={u.features.title} />
          <div className="feature-grid">
            {u.features.items.map((f, i) => (
              <article className="card feature" key={f.title}>
                <span className="feature-ico">
                  <Icon name={FEATURE_ICON[i] ?? "check"} size={18} />
                </span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="access">
        <div className="wrap split split-even">
          <div>
            <SectionHead label={u.access.label} title={u.access.title} lead={u.access.body} />
            <div className="urlbox">
              <Icon name="globe" size={18} />
              <code>{u.access.url}</code>
            </div>
            <p className="fine">{u.access.urlNote}</p>
            <div className="mt-24">
              <Button link={u.access.login} kind="ghost" arrow />
            </div>
          </div>
          <div className="privacy-card">
            <span className="eyebrow">{u.privacy.label}</span>
            <h3>{u.privacy.title}</h3>
            <ul>
              {u.privacy.items.map((p) => (
                <li key={p}>
                  <Icon name="shield" size={18} />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section section-tint" id="faq">
        <div className="wrap faq-wrap">
          <SectionHead label={u.faq.label} title={u.faq.title} />
          <FaqList items={u.faq.items} />
        </div>
      </section>

      <Closing {...u.closing} />
    </Shell>
  );
}
