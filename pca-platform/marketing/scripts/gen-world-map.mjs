/**
 * 세계지도를 빌드 전에 SVG 경로로 미리 뽑아 둔다.
 *
 * 나라별 국경을 전부 그리면 무거워지고 마케팅 페이지에서 읽히지도 않는다.
 * 그래서 바탕은 육지 실루엣 하나로 두고, 표시할 나라만 위에 얹는다.
 *
 *   node scripts/gen-world-map.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { feature, merge } from "topojson-client";
import { geoNaturalEarth1, geoPath } from "d3-geo";

const require = createRequire(import.meta.url);
const landTopo = JSON.parse(readFileSync(require.resolve("world-atlas/land-110m.json"), "utf8"));
const cTopo = JSON.parse(readFileSync(require.resolve("world-atlas/countries-110m.json"), "utf8"));

/** 표시 후보. CLAUDE.md 가 적어 둔 나라들(KR, TR, US, JP, KZ)을 미리 담아 둔다. */
const WANTED = { "410": "KR", "398": "KZ", "792": "TR", "392": "JP", "840": "US" };

const W = 1000;
const H = 480;

const land = feature(landTopo, landTopo.objects.land);
const projection = geoNaturalEarth1().fitExtent(
  [
    [6, 6],
    [W - 6, H - 6],
  ],
  land,
);
// 좌표를 소수 첫째 자리까지만 쓴다. 이 크기에서 눈에 띄는 차이가 없다.
const path = geoPath(projection).digits(1);

const countries = feature(cTopo, cTopo.objects.countries);

const paths = {};
const centroids = {};
for (const f of countries.features) {
  const code = WANTED[String(f.id)];
  if (!code) continue;
  paths[code] = path(f);
  const c = path.centroid(f);
  centroids[code] = [Math.round(c[0] * 10) / 10, Math.round(c[1] * 10) / 10];
}

const missing = Object.values(WANTED).filter((c) => !paths[c]);
if (missing.length) throw new Error(`지도에서 찾지 못한 나라: ${missing.join(", ")}`);

// 남극은 뺀다. 이 지도에서 전하는 정보가 없고 아래쪽을 크게 차지한다.
const landNoAntarctica = {
  type: "FeatureCollection",
  features: land.features.map((f) => ({
    ...f,
    geometry: {
      ...f.geometry,
      coordinates: f.geometry.coordinates.filter((poly) => {
        const ring = Array.isArray(poly[0][0]) ? poly[0] : poly;
        return !ring.every(([, lat]) => lat < -55);
      }),
    },
  })),
};

// 남극을 뺀 실제 육지 범위로 화면을 자른다. 안 그러면 아래쪽이 통째로 빈다.
const [[bx0, by0], [bx1, by1]] = path.bounds(landNoAntarctica);
const PAD = 10;
const vb = [
  Math.round((bx0 - PAD) * 10) / 10,
  Math.round((by0 - PAD) * 10) / 10,
  Math.round((bx1 - bx0 + PAD * 2) * 10) / 10,
  Math.round((by1 - by0 + PAD * 2) * 10) / 10,
].join(" ");

const out = `// 이 파일은 scripts/gen-world-map.mjs 가 만든다. 직접 고치지 않는다.
// 원본: world-atlas (Natural Earth, public domain) · 투영: geoNaturalEarth1

export const WORLD_VIEWBOX = "${vb}";

/** 육지 실루엣. 국경 없이 한 덩어리다 */
export const WORLD_LAND = ${JSON.stringify(path(landNoAntarctica))};

/** 표시할 나라만 따로 얹는다 */
export const COUNTRY_PATHS: Record<string, string> = ${JSON.stringify(paths, null, 2)};

/** 작은 나라도 보이도록 점을 하나 찍는다 */
export const COUNTRY_CENTROIDS: Record<string, [number, number]> = ${JSON.stringify(centroids, null, 2)};
`;

writeFileSync("src/generated/world-map.ts", out);
console.log(
  "wrote src/generated/world-map.ts",
  Math.round(out.length / 1024) + "KB",
  "· countries:", Object.keys(paths).join(", "),
);
