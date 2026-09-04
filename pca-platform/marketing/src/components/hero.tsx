import type { SiteContent } from "@/content";

/**
 * 히어로.
 *
 * 오른쪽의 리포트 축소판은 장식이 아니다. 이 제품이 파는 것은 점수가 아니라
 * 15–20페이지짜리 문서이므로, 그 문서가 어떻게 생겼는지 첫 화면에서 보여준다.
 * 이미지가 아니라 실제 목차 데이터를 줄여 그린 것이라 원고가 바뀌면 같이 바뀐다.
 */
export default function Hero({ site }: { site: SiteContent }) {
  const h = site.hero;
  const toc = site.report.sections.slice(0, 6);

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
            <a className="btn solid lg" href={h.primary.href}>{h.primary.label}</a>
            <a className="btn lg ghost" href={h.secondary.href}>{h.secondary.label}</a>
          </div>
        </div>

        <div className="cover" aria-hidden="true">
          <div className="sheet back">
            <span className="k">{site.brand}</span>
            <ul>
              {toc.map((s) => (
                <li key={s.no}>
                  <b>{s.no}</b>
                  <i>{s.title}</i>
                </li>
              ))}
            </ul>
          </div>
          <div className="sheet front">
            <span className="k">{h.coverKicker}</span>
            <strong>
              {h.display.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </strong>
            <span className="n">{h.coverNote}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
