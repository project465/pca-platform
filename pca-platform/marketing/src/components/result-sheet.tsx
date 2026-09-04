import Radar from "@/components/radar";
import type { SheetBlock, SiteContent } from "@/content";

/**
 * 결과지 구성 뷰어.
 *
 * 목차를 누르면 해당 결과지가 나온다. 라디오 버튼과 CSS 로만 만들어
 * 자바스크립트 없이 동작한다. 정적 미리보기에서도 눌러볼 수 있어야 하기 때문이다.
 * 사이트는 어두운데 결과지 문서만 흰 종이로 띄운다 — 실제 결과지가 그렇다.
 */
function Block({ b }: { b: SheetBlock }) {
  return (
    <div className="blk">
      {b.sub ? <span className="sub">{b.sub}</span> : null}
      {b.title ? <h4>{b.title}</h4> : null}
      {b.fields ? (
        <div className="fields">
          {b.fields.map((f) => (
            <div key={f.label}>
              <span className="l">{f.label}</span>
              <span className="v">{f.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {b.body?.map((p, i) => <p key={i}>{p}</p>)}
      {b.bullets ? (
        <ul>
          {b.bullets.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      ) : null}
      {b.table ? (
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                {b.table.head.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export default function ResultSheet({ site }: { site: SiteContent }) {
  const s = site.sheet;

  return (
    <section id="sheet" className="divided">
      <div className="wrap">
        <div className="sec-head">
          <span className="label-sm">{s.label}</span>
          <h2>{s.heading}</h2>
          <p className="lead">
            {s.lead.map((l, i) => (
              <span key={i}>
                {l}
                {i < s.lead.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        </div>

        <div className="sheetwrap">
          {s.tabs.map((t, i) => (
            <input
              key={t.no}
              type="radio"
              name="sheet"
              id={`sh-${i + 1}`}
              defaultChecked={i === 0}
            />
          ))}

          <div className="sheetgrid">
            <div className="tabs">
              {s.tabs.map((t, i) => (
                <label key={t.no} htmlFor={`sh-${i + 1}`}>
                  <b>{t.no}</b>
                  {t.nav}
                </label>
              ))}
            </div>

            <div className="panels">
              {s.tabs.map((t) => (
                <div className="panel" key={t.no}>
                  <div className="doc">
                    <div className="dhead">
                      <h3>{t.title}</h3>
                      <span className="n">{t.no}</span>
                    </div>

                    {t.meta ? (
                      <div className="metarow">
                        {t.meta.map((m) => (
                          <div key={m.label}>
                            <span className="l">{m.label}</span>
                            <span className="v">{m.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {t.chart ? (
                      <div className="chartbox">
                        <span className="ct">{t.title}</span>
                        <Radar
                          axes={t.chart === "jobs" ? s.jobAxes : s.styleAxes}
                          scores={t.chart === "jobs" ? s.jobScores : s.styleScores}
                          width={t.chart === "jobs" ? 700 : 560}
                          height={t.chart === "jobs" ? 470 : 420}
                          radius={t.chart === "jobs" ? 150 : 140}
                          labelGap={t.chart === "jobs" ? 30 : 26}
                          ariaLabel={`${t.title}: ${(t.chart === "jobs" ? s.jobAxes : s.styleAxes)
                            .map((a, i) => `${a} ${(t.chart === "jobs" ? s.jobScores : s.styleScores)[i]}`)
                            .join(", ")}`}
                        />
                        {t.chartNote ? <p className="cn">{t.chartNote}</p> : null}
                      </div>
                    ) : null}

                    {t.blocks?.map((b, i) => <Block key={i} b={b} />)}

                    <p className="more">{s.more}</p>
                  </div>

                  <div className="cap">
                    <span className="no">
                      {t.no} · {t.capTitle}
                    </span>
                    <h4>{t.capTitle}</h4>
                    <p>{t.capBody}</p>
                    <span className="arrow">→ {t.capArrow}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="sheetnote">{s.disclaimer}</p>
      </div>
    </section>
  );
}
