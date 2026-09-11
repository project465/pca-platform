import type { SiteContent } from "@/content";

/**
 * 히어로.
 *
 * 제목의 {중괄호} 안은 금색으로 강조한다. 원고에서 강조 위치를 정하기 위한 표시다.
 *
 * 오른쪽은 실제 결과지의 앞부분이다. 문의 폼이 아니라 제품을 둔 이유 —
 * 처음 온 사람이 5초 안에 "무엇을 파는가" 를 알아야 하고, 그 답은 폼이 아니라
 * 학생이 받아 드는 문서다. 문의는 상단 버튼과 각 절 끝에서 계속 받는다.
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
            <a className="btn lg solid" href={h.primary.href}>
              {h.primary.label}
            </a>
            <a className="btn lg" href={h.secondary.href}>
              {h.secondary.label}
            </a>
          </div>

          {h.proof ? (
            <ul className="proofbar">
              {h.proof.map((x) => (
                <li key={x.label}>
                  <b>{x.value}</b>
                  <span>{x.label}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <aside className="heroreport" aria-label={site.sample.docTag}>
          <div className="hr-top">
            <b>{site.sample.docTag}</b>
            <span>{site.sample.person.dept}</span>
          </div>
          <div className="hr-body">
            <span className="hr-cap">{site.sample.jobsLabel}</span>
            {site.sample.jobs.slice(0, 4).map((j) => (
              <div className="hr-row" key={j.name}>
                <span>{j.name}</span>
                <i>
                  <b style={{ width: `${j.score}%` }} />
                </i>
                <em>{j.score}</em>
              </div>
            ))}
            <span className="hr-cap hr-cap2">{site.sample.planLabel}</span>
            {site.sample.plan.slice(0, 3).map((x) => (
              <div className="hr-plan" key={x.when}>
                <b>{x.when}</b>
                <span>{x.what}</span>
              </div>
            ))}
          </div>
          <div className="hr-foot">{site.sample.disclaimer.split(".")[0]}.</div>
        </aside>
      </div>
    </div>
  );
}
