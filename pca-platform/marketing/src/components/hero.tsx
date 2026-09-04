import InquiryForm from "@/components/inquiry-form";
import type { SiteContent } from "@/content";

/**
 * 히어로.
 *
 * 오른쪽은 문의 카드다. 처음 본 사람이 스크롤을 한 번도 하지 않고
 * 남길 수 있어야 한다는 요구가 이 배치의 이유다.
 * 리포트 축소판은 리포트 섹션으로 옮겼다 — 거기가 제자리이기도 하다.
 */
export default function Hero({ site }: { site: SiteContent }) {
  const h = site.hero;

  return (
    <div className="hero" id="top">
      <div className="wrap herogrid">
        <div className="inner">
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
            <a className="btn lg ghost" href={h.secondary.href}>
              {h.secondary.label}
            </a>
          </div>
        </div>

        <aside className="quickbox" aria-labelledby="quick-h">
          <h2 id="quick-h">{site.contact.quickHeading}</h2>
          <p>{site.contact.quickNote}</p>
          <InquiryForm site={site} variant="compact" idPrefix="q" />
        </aside>
      </div>
    </div>
  );
}
