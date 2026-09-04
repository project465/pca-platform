import type { SiteContent } from "@/content";

/**
 * 2축 분석 — 직무 영역과 업무 성향.
 *
 * 제안서가 이 둘을 한 장에 놓고 설명하므로 화면에서도 붙여 둔다.
 * 왼쪽은 순위(크기), 오른쪽은 성향(모양). 둘 다 한 사람의 결과라 계열이 하나여서
 * 색을 나누지 않고, 이름과 숫자를 직접 붙여 도형만으로 읽지 않아도 되게 했다.
 */

const SIZE = 460;
const CX = SIZE / 2;
const CY = SIZE / 2 + 6;
const R = 150;
const RINGS = [0.25, 0.5, 0.75, 1];
/** 눈금 숫자는 두 개만. 네 개를 다 적으면 데이터 점과 겹친다 */
const TICKS = [0.5, 1];

function point(i: number, r: number): [number, number] {
  const a = (Math.PI / 3) * i - Math.PI / 2;
  return [
    Math.round((CX + Math.cos(a) * r) * 10) / 10,
    Math.round((CY + Math.sin(a) * r) * 10) / 10,
  ];
}
const polygon = (r: number) =>
  Array.from({ length: 6 }, (_, i) => point(i, r).join(",")).join(" ");

export default function TwoAxis({ site }: { site: SiteContent }) {
  const t = site.traits;
  const items = t.items.slice(0, 6);
  const area = items.map((it, i) => point(i, (it.score / 100) * R).join(",")).join(" ");

  return (
    <section id="traits" className="tinted bordered">
      <div className="wrap">
        <div className="sec-head">
          <h2>{t.heading}</h2>
          <p className="lead">{t.lead}</p>
        </div>

        <div className="axis2">
          {/* 축 1 — 직무 영역 순위 */}
          <div className="rankbox">
            <div className="cap">
              <b>{t.fitTitle}</b>
              <span className="ex">{t.exampleLabel}</span>
            </div>
            <ul>
              {site.report.ranks.map((k) => (
                <li key={k.name}>
                  <span className="nm">{k.name}</span>
                  <span className="track">
                    <span className="fill" style={{ width: `${k.score}%` }} />
                  </span>
                  <span className="val">{k.score}</span>
                </li>
              ))}
            </ul>
            <p className="boxnote">{t.fitNote}</p>
          </div>

          {/* 축 2 — 업무 성향 */}
          <figure className="hexfig">
            <figcaption className="cap">
              <b>{t.chartTitle}</b>
              <span className="ex">{t.exampleLabel}</span>
            </figcaption>
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              role="img"
              aria-label={`${t.chartTitle}: ${items.map((i) => `${i.name} ${i.score}`).join(", ")}`}
            >
              {RINGS.map((f) => (
                <polygon key={f} className="ring" points={polygon(R * f)} />
              ))}
              {items.map((_, i) => {
                const [x, y] = point(i, R);
                return <line key={i} className="spoke" x1={CX} y1={CY} x2={x} y2={y} />;
              })}
              {TICKS.map((f) => (
                <text key={`n${f}`} className="num" x={CX + 10} y={CY - R * f + 4}>
                  {f * 100}
                </text>
              ))}
              <polygon className="area" points={area} />
              {items.map((it, i) => {
                const [x, y] = point(i, (it.score / 100) * R);
                return <circle key={it.code} className="pt" cx={x} cy={y} r={5.5} />;
              })}
              {items.map((it, i) => {
                const [x, y] = point(i, R + 30);
                const anchor = x > CX + 8 ? "start" : x < CX - 8 ? "end" : "middle";
                return (
                  <text key={`l${it.code}`} className="axis" x={x} y={y + 4} textAnchor={anchor}>
                    {it.name}
                  </text>
                );
              })}
            </svg>
          </figure>
        </div>

        <p className="small" style={{ marginTop: 24, marginBottom: -4 }}>{t.scaleNote}</p>
        <ul className="traitlist wide">
          {items.map((it) => (
            <li key={it.code}>
              <span className="nm">{it.name}</span>
              <span className="sc">{it.score}</span>
              <span className="bd">{it.body}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
