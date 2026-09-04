import type { SiteContent } from "@/content";

/**
 * 업무 성향 육각형.
 *
 * 한 사람의 6개 점수라서 계열이 하나다. 색을 나누지 않고 한 가지 파랑으로 칠하며,
 * 범례 대신 축에 이름을 직접 붙인다. 점수는 옆 목록에 숫자로도 적혀 있어
 * 도형만으로 읽지 않아도 된다.
 */

const SIZE = 460;
const CX = SIZE / 2;
const CY = SIZE / 2 + 6;
const R = 150;
const RINGS = [0.25, 0.5, 0.75, 1];
/** 눈금 숫자는 두 개만 적는다. 네 개를 다 적으면 데이터 점과 겹친다 */
const TICKS = [0.5, 1];

/** 12시 방향에서 시계 방향으로 60도씩 */
function point(i: number, r: number): [number, number] {
  const a = (Math.PI / 3) * i - Math.PI / 2;
  return [
    Math.round((CX + Math.cos(a) * r) * 10) / 10,
    Math.round((CY + Math.sin(a) * r) * 10) / 10,
  ];
}

function polygon(r: number): string {
  return Array.from({ length: 6 }, (_, i) => point(i, r).join(",")).join(" ");
}

export default function Hexagon({ site }: { site: SiteContent }) {
  const t = site.traits;
  const items = t.items.slice(0, 6);

  const area = items
    .map((it, i) => point(i, (it.score / 100) * R).join(","))
    .join(" ");

  return (
    <section id="traits" className="tinted bordered">
      <div className="wrap">
        <div className="sec-head">
          <h2>{t.heading}</h2>
          <p className="lead">{t.lead}</p>
        </div>

        <div className="hexgrid">
          <figure className="hexfig">
            <figcaption className="cap">
              <b>{t.chartTitle}</b>
              <span className="ex">{t.exampleLabel}</span>
            </figcaption>

            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              role="img"
              aria-label={`${t.chartTitle}: ${items
                .map((i) => `${i.name} ${i.score}`)
                .join(", ")}`}
            >
              {RINGS.map((f) => (
                <polygon key={f} className="ring" points={polygon(R * f)} />
              ))}

              {items.map((_, i) => {
                const [x, y] = point(i, R);
                return <line key={i} className="spoke" x1={CX} y1={CY} x2={x} y2={y} />;
              })}

              {/* 눈금은 위쪽 축에만 적는다. 여섯 축에 전부 적으면 도형이 안 보인다 */}
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

          <ul className="traitlist">
            {items.map((it) => (
              <li key={it.code}>
                <span className="nm">{it.name}</span>
                <span className="sc">{it.score}</span>
                <span className="bd">{it.body}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
