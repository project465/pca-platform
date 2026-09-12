import type { SiteContent } from "@/content";

/**
 * 히어로.
 *
 * 제목에 강조색 낱말을 두지 않는다. 한 낱말만 색을 입히는 것은 소개 페이지의
 * 관용구이고, 마감 배너에서는 그 표시가 중괄호째로 찍히고 있었다.
 *
 * 오른쪽은 실제 결과지의 앞부분이다. 문의 폼이 아니라 제품을 둔 이유 —
 * 처음 온 사람이 5초 안에 "무엇을 파는가" 를 알아야 하고, 그 답은 폼이 아니라
 * 학생이 받아 드는 문서다. 문의는 상단 버튼과 각 절 끝에서 계속 받는다.
 */
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
                {line}
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
          {/* 값은 버튼 옆에 붙여 둔다. 요금 페이지까지 내려가야 알 수 있는
              가격은 대부분 안 읽힌다. */}
          {h.priceline ? <p className="priceline">{h.priceline}</p> : null}

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
            {/* 1군만 싣는다. 표지에서 등수를 매기면 안쪽 결과지와 어긋난다 —
                이 묶음 안은 이 검사로 우열을 가릴 수 없다는 것이 요지다. */}
            {site.sample.jobs
              .filter((j) => j.tier === 1)
              .slice(0, 4)
              .map((j) => (
                <div className="hr-row" key={j.name}>
                  <span>{j.name}</span>
                  <i>
                    <b
                      style={{
                        marginLeft: `${j.band[0]}%`,
                        width: `${Math.max(j.band[1] - j.band[0], 1)}%`,
                      }}
                    />
                  </i>
                  <em>{j.score}</em>
                </div>
              ))}
            <span className="hr-tier">{site.sample.tierNote}</span>
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
