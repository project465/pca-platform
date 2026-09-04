import type { SiteContent } from "@/content";

/**
 * 이 제품이 무엇인지 한 번에 보여주는 자리.
 * 세 번째 칸의 빗금은 결과지에서 부족분을 그리는 방식 그대로다.
 */
export default function Pipeline({ site }: { site: SiteContent }) {
  const { pipeline } = site;

  return (
    <section className="pipeline" id="how">
      <div className="wrap">
        <div className="sec-head">
          <h2>{pipeline.heading}</h2>
          <p className="lead">{pipeline.lead}</p>
        </div>

        <div className="steps">
          {pipeline.steps.map((s, idx) => (
            <div className="step" key={s.stage}>
              <span className="stage">{s.stage}</span>
              <span className="value">{s.value}</span>

              {idx === 2 ? (
                <>
                  <div
                    className="gapbar"
                    role="img"
                    aria-label={pipeline.gapCaption}
                  >
                    <i className="held" />
                    <i className="held" />
                    <i className="short" />
                    <i className="short" />
                    <i className="none" />
                  </div>
                  <span className="gapcap">{pipeline.gapCaption}</span>
                </>
              ) : null}

              <span className="body">{s.body}</span>
              <span className="src">{s.source}</span>
            </div>
          ))}
        </div>

        <p className="foot">{pipeline.footnote}</p>
      </div>
    </section>
  );
}
