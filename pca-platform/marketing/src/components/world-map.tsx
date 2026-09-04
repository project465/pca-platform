import type { DeployStatus, MapContent } from "@/content";
import {
  COUNTRY_CENTROIDS,
  COUNTRY_PATHS,
  WORLD_LAND,
  WORLD_VIEWBOX,
} from "@/generated/world-map";

/**
 * 전개 현황 지도.
 *
 * 상태를 색으로만 구분하지 않는다. 나라마다 지도 위에 이름이 붙고,
 * 표식의 모양이 다르고(채움 / 도넛 / 외곽선), 옆 목록에 상태가 글자로 적힌다.
 * 색각 이상이나 흑백 인쇄에서도 읽히게 하기 위한 것이다.
 */

const FILL: Record<DeployStatus, string> = {
  live: "#2F6B57",
  progress: "#A87F3F",
  planned: "#9AA7B6",
};

function Marker({ status, x, y }: { status: DeployStatus; x: number; y: number }) {
  const color = FILL[status];
  if (status === "planned") {
    return <circle cx={x} cy={y} r={5} fill="none" stroke={color} strokeWidth={2} />;
  }
  if (status === "progress") {
    return (
      <>
        <circle cx={x} cy={y} r={6} fill={color} />
        <circle cx={x} cy={y} r={2.4} fill="#FFFFFF" />
      </>
    );
  }
  return (
    <>
      <circle cx={x} cy={y} r={6.5} fill={color} />
      <circle cx={x} cy={y} r={10} fill="none" stroke={color} strokeWidth={1.5} opacity={0.45} />
    </>
  );
}

export default function WorldMap({ map }: { map: MapContent }) {
  const shown = map.countries.filter((c) => COUNTRY_PATHS[c.code]);

  return (
    <section id="where" className="where">
      <div className="wrap">
        <div className="sec-head">
          <h2>{map.heading}</h2>
          <p className="lead">{map.lead}</p>
        </div>

        <div className="mapgrid">
          <figure className="mapfig">
            <svg
              viewBox={WORLD_VIEWBOX}
              role="img"
              aria-label={`${map.heading}: ${shown
                .map((c) => `${c.name} — ${map.statusLabel[c.status]}`)
                .join(", ")}`}
            >
              <path className="land" d={WORLD_LAND} />

              {shown.map((c) => (
                <path
                  key={c.code}
                  d={COUNTRY_PATHS[c.code]}
                  fill={FILL[c.status]}
                  stroke={FILL[c.status]}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />
              ))}

              {shown.map((c) => {
                const [x, y] = COUNTRY_CENTROIDS[c.code];
                return <Marker key={c.code} status={c.status} x={x} y={y} />;
              })}

            </svg>
          </figure>

          <ul className="maplegend">
            {shown.map((c) => (
              <li key={c.code}>
                <span className={`dot ${c.status}`} aria-hidden="true" />
                <span className="nm">{c.name}</span>
                <span className={`st ${c.status}`}>{map.statusLabel[c.status]}</span>
                {c.note && c.note !== map.statusLabel[c.status] ? (
                  <span className="nt">{c.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <p className="small mapfoot">{map.footnote}</p>
      </div>
    </section>
  );
}
