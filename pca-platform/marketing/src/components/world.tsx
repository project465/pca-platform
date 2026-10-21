import { geoArea, geoCentroid, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";

/**
 * 해외 진행 지도. **서버에서 한 번 그린다**: 빌드할 때 SVG 경로가 굳어
 * 나가므로 브라우저는 지도 자료(약 100KB)를 받지 않고, 인쇄와 미리보기에서도
 * 그대로 선다.
 *
 * 칠하는 나라는 원고가 정한다. 여기서는 모양만 그린다: 진행은 짙게, 예정은
 * 옅게 빗금으로. 한국처럼 작은 나라는 면만으로는 안 보여서 점을 함께 찍는다.
 */
const W = 960;
const H = 470;

type Country = { iso: string; name: string; status: "done" | "planned" };

/**
 * 점은 가장 큰 땅덩이 한가운데에 찍는다. 나라 전체의 무게중심을 쓰면 해외
 * 영토를 가진 나라(프랑스 · 프랑스령 기아나)의 점이 바다 위에 선다
 */
function mainland(f: Feature<Geometry>): Feature<Geometry> {
  if (f.geometry.type !== "MultiPolygon") return f;
  const polys = f.geometry.coordinates.map((c) => ({ type: "Polygon" as const, coordinates: c }));
  const big = polys.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a));
  return { ...f, geometry: big };
}

export function WorldMap({ countries, label }: { countries: Country[]; label: string }) {
  const topo = world as unknown as Topology;
  const all = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
  /* 남극은 뺀다: 아래 3분의 1을 차지하고 아무것도 말하지 않는다 */
  const land = { ...all, features: all.features.filter((f) => String(f.id) !== "010") };
  const proj = geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], land);
  const path = geoPath(proj);
  const by = new Map(countries.map((c) => [c.iso, c]));

  const dots = countries
    .map((c) => {
      const f = land.features.find((x) => String(x.id) === c.iso) as Feature<Geometry> | undefined;
      if (!f) return null;
      const p = proj(geoCentroid(mainland(f)));
      return p ? { ...c, x: p[0], y: p[1] } : null;
    })
    .filter((d): d is Country & { x: number; y: number } => !!d);

  return (
    <svg className="world" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <defs>
        <pattern id="world-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" className="w-planned-bg" />
          <line x1="0" y1="0" x2="0" y2="6" className="w-planned-line" />
        </pattern>
      </defs>
      <g>
        {land.features.map((f) => {
          const c = by.get(String(f.id));
          const cls = c ? (c.status === "done" ? "w-done" : "w-planned") : "w-land";
          return <path key={String(f.id) + f.properties.name} d={path(f) ?? ""} className={cls} />;
        })}
      </g>
      <g>
        {dots.map((d) =>
          d.status === "done" ? (
            <g key={d.iso}>
              <circle cx={d.x} cy={d.y} r={11} className="w-ring" />
              <circle cx={d.x} cy={d.y} r={5} className="w-dot" />
            </g>
          ) : (
            <circle key={d.iso} cx={d.x} cy={d.y} r={4.5} className="w-dot-planned" />
          ),
        )}
      </g>
    </svg>
  );
}
