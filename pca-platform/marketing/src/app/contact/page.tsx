import type { Metadata } from "next";
import { getSite } from "@/content";
import { Shell } from "@/components/chrome";
import { Icon } from "@/components/icons";
import CopyText from "@/components/copy-text";
import MailComposer from "@/components/mail-composer";

export function generateMetadata(): Metadata {
  const c = getSite().contact;
  return { title: c.meta.title, description: c.meta.description };
}

/**
 * 문의.
 *
 * **연락처를 먼저 적는다.** 문의를 받는 서버가 없으므로 이 쪽에서 가장
 * 확실한 길은 메일 주소와 전화번호다. 둘 다 고를 수 있는 글자로 두고
 * 복사 단추를 곁에 둔다. 값은 사업자 표시(`legal`)에서 읽어 두 곳이
 * 갈리지 않게 한다.
 */
export default function Contact() {
  const site = getSite();
  const c = site.contact;
  const L = site.legal;
  const tel = L.tel.replace(/[^\d+]/g, "");

  return (
    <Shell site={site}>
      <section className="page-head">
        <div className="wrap">
          <span className="pill">{c.eyebrow}</span>
          <h1>{c.title}</h1>
          <p className="hero-lead">{c.lead}</p>
        </div>
      </section>

      <section className="section section-tight">
        <div className="wrap contact-grid">
          <div className="contact-side">
            <div className="card contact-card">
              <h2>{c.direct.title}</h2>
              <div className="contact-line">
                <span className="feature-ico">
                  <Icon name="mail" size={18} />
                </span>
                <div>
                  <small>{c.direct.emailLabel}</small>
                  <a href={`mailto:${L.email}`} className="selectable">
                    {L.email}
                  </a>
                </div>
                <CopyText value={L.email} label={site.ui.copy} done={site.ui.copied} />
              </div>
              <div className="contact-line">
                <span className="feature-ico">
                  <Icon name="phone" size={18} />
                </span>
                <div>
                  <small>{c.direct.telLabel}</small>
                  <a href={`tel:${tel}`} className="selectable">
                    {L.tel}
                  </a>
                </div>
                <CopyText value={L.tel} label={site.ui.copy} done={site.ui.copied} />
              </div>
              <p className="fine">{c.direct.hoursNote}</p>
            </div>

            <div className="card contact-card">
              <h2>{c.after.title}</h2>
              <ol className="after">
                {c.after.items.map((a, i) => (
                  <li key={a}>
                    <span>{i + 1}</span>
                    {a}
                  </li>
                ))}
              </ol>
            </div>

            <div className="card contact-card">
              <h2>{c.company.title}</h2>
              <dl className="company">
                <div>
                  <dt>{L.labels.company}</dt>
                  <dd>{L.company}</dd>
                </div>
                <div>
                  <dt>{L.labels.ceo}</dt>
                  <dd>{L.ceo}</dd>
                </div>
                <div>
                  <dt>{L.labels.address}</dt>
                  <dd>{L.address}</dd>
                </div>
                <div>
                  <dt>{L.labels.bizNo}</dt>
                  <dd>{L.bizNo}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="contact-main">
            <MailComposer form={c.form} to={L.email} />
            <div className="card others">
              <h2>{c.others.title}</h2>
              <ul>
                {c.others.items.map((o) => (
                  <li key={o.label}>
                    <a href={o.href}>
                      {o.label}
                      <Icon name="chevron" size={16} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
