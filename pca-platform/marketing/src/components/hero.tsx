import InquiryForm from "@/components/inquiry-form";
import type { SiteContent } from "@/content";

/**
 * 히어로.
 *
 * 제목의 {중괄호} 안은 금색으로 강조한다. 원고에서 강조 위치를 정하기 위한 표시다.
 * 오른쪽은 문의 카드다 — 처음 본 사람이 스크롤을 한 번도 하지 않고
 * 남길 수 있어야 한다는 요구가 이 배치의 이유다.
 */
function Emphasised({ line }: { line: string }) {
  const parts = line.split(/(\{[^}]*\})/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("{") ? (
          <span className="gold" key={i}>
            {p.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export default function Hero({ site }: { site: SiteContent }) {
  const h = site.hero;

  return (
    <div className="hero" id="top">
      <span className="mark" aria-hidden="true">
        {h.watermark}
      </span>
      <div className="wrap herogrid">
        <div className="inner">
          <span className="eyebrow">{h.eyebrow}</span>
          <h1>
            {h.title.map((line, i) => (
              <span key={i}>
                <Emphasised line={line} />
                {i < h.title.length - 1 ? <br /> : null}
              </span>
            ))}
          </h1>
          <p className="lead">{h.lead}</p>
          <div className="cta">
            <a className="btn lg" href={h.secondary.href}>
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
