import Radar from "@/components/radar";
import type { SiteContent } from "@/content";

/**
 * 예시 결과지.
 *
 * 홈에서 "PCA 는 세 가지를 분석합니다" 같은 설명이 먼저 나오면 사람은 결제까지
 * 가지 않는다. 그래서 결과물을 먼저 놓는다. 실제 결과지 세 장 — 직무 적합도,
 * 업무 성향, 12개월 할 일 — 을 한 화면에 옮겨 문서처럼 보이게 그린다.
 *
 * 지어낸 학생 자료를 진짜처럼 보이게 두면 안 되므로, 문서 머리와 아래에
 * 예시임을 밝히는 줄을 함께 둔다.
 */
export default function SampleReport({ site }: { site: SiteContent }) {
  const s = site.sample;

  return (
    <section className="divided tinted" id="sample">
      <div className="wrap">
        <div className="sec-head">
          <span className="label-sm">{s.label}</span>
          <h2>{s.heading}</h2>
          <p className="lead">{s.lead}</p>
        </div>

        <figure className="report">
          <div className="rhead">
            <span className="tag">{s.docTag}</span>
            <span className="pg">{s.page}</span>
          </div>

          <div className="rwho">
            <div className="nm">
              <b>{s.person.name}</b>
              <span>{s.person.dept}</span>
            </div>
            <dl>
              {s.person.meta.map((m) => (
                <div key={m.l}>
                  <dt>{m.l}</dt>
                  <dd>{m.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rgrid">
            <div className="rblock">
              <h3>{s.jobsLabel}</h3>
              {/* 등수가 아니라 묶음. 실제 결과지(BandBars)와 같은 모양이다 —
                  점 하나가 아니라 구간을 그리고, 묶음 번호는 머리에만 붙는다. */}
              <ol className="bars bands">
                {s.jobs.map((j, i) => {
                  const head = i === 0 || s.jobs[i - 1].tier !== j.tier;
                  const lo = j.band[0];
                  const hi = j.band[1];
                  return (
                    <li
                      key={j.name}
                      // thead = 묶음의 첫 줄(번호가 찍힌다) · tierhead = 그 위에 선을 긋는 줄.
                      // 첫 묶음은 번호는 찍되 선은 긋지 않는다 — 표 맨 위의 선은 뜻이 없다.
                      className={`${j.tier === 1 ? "hi" : ""}${head ? " thead" : ""}${
                        head && i > 0 ? " tierhead" : ""
                      }`}
                    >
                      <span className="r">{head ? s.tierLabel.replace("{n}", String(j.tier)) : ""}</span>
                      <span className="n">{j.name}</span>
                      <span className="track">
                        <span
                          className="fill"
                          style={{ left: `${lo}%`, width: `${Math.max(hi - lo, 1)}%` }}
                        />
                        <span className="dot" style={{ left: `${j.score}%` }} />
                      </span>
                      <span className="v">
                        {j.score}
                        {/* ±5.0 은 어색하다. 정수면 소수점을 떼어 적는다 */}
                        <em>
                          ±
                          {Number.isInteger((hi - lo) / 2)
                            ? (hi - lo) / 2
                            : ((hi - lo) / 2).toFixed(1)}
                        </em>
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="rnote">{s.jobsNote}</p>
              <p className="rnote rtier">{s.tierNote}</p>
            </div>

            <div className="rblock">
              <h3>{s.styleLabel}</h3>
              <div className="hexcard flat">
                <Radar
                  axes={s.styleAxes}
                  scores={s.styleScores}
                  width={420}
                  height={330}
                  radius={110}
                  labelGap={22}
                  ariaLabel={`${s.styleLabel} — ${s.styleAxes
                    .map((a, i) => `${a} ${s.styleScores[i]}`)
                    .join(", ")}`}
                />
              </div>
              <div className="rverdict">
                <span className="l">{s.styleTypeLabel}</span>
                <b>{s.styleType}</b>
                <p>{s.styleVerdict}</p>
              </div>
            </div>
          </div>

          <div className="rblock wide">
            <h3>{s.planLabel}</h3>
            <ol className="timeline">
              {s.plan.map((p) => (
                <li key={p.when}>
                  <span className="w">{p.when}</span>
                  <span className="t">{p.what}</span>
                  <span className="y">{p.why}</span>
                </li>
              ))}
            </ol>
            <p className="rnote">{s.planNote}</p>
          </div>

          <div className="rblock wide">
            <h3>{s.localLabel}</h3>
            <ul className="localrow">
              {s.local.map((l) => (
                <li key={l.name}>
                  <b>{l.name}</b>
                  <span>{l.note}</span>
                </li>
              ))}
            </ul>
            <p className="rnote">{s.localNote}</p>
          </div>

          <figcaption className="rfoot">{s.disclaimer}</figcaption>
        </figure>

        <div className="samplecta">
          <div>
            <b>{s.cta.line}</b>
            <span>{s.cta.sub}</span>
          </div>
          <div className="cta">
            <a className="btn lg solid" href={s.cta.primary.href}>
              {s.cta.primary.label}
            </a>
            <a className="btn lg" href={s.cta.secondary.href}>
              {s.cta.secondary.label}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
