/* 지도를 점 뿌리기에서 윤곽선 있는 땅덩어리로 바꾼다.
   npm run metri:map

   원본 지오메트리(Natural Earth)는 이 저장소에 없고 받아올 수도 없다.
   대신 이미 박혀 있는 1,497개 점이 3.2도 격자로 뜬 땅 표본이라, 그 자체가
   래스터다. 격자를 되살리면 칸을 이어 붙여 실루엣을 만들 수 있고, 땅 칸이
   바다 칸과 맞닿는 변만 모으면 그게 해안선이다.

   점으로 두면 멀리서 회색 노이즈로 보인다. 면과 선으로 그리면 대륙이
   대륙으로 읽힌다. 해상도는 3.2도 그대로라 각져 있는데, 그건 숨기지 않는다
   — 이 지도는 항해용이 아니라 어디까지 갔는지 세는 표다. */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

/* 만든 쪽과 같은 수를 쓴다. 위도 80N..56S, 3.2도 간격. */
const STEP_DEG = 3.2;
const W = 1000, H = 470, LAT_TOP = 80, LAT_SPAN = 136;
const SX = (STEP_DEG / 360) * W;        // 8.888…
const SY = (STEP_DEG / LAT_SPAN) * H;   // 11.058…

function rebuild(file) {
  const src = readFileSync(file, "utf8");
  const g = src.match(/<g class="cm-map-land">([\s\S]*?)<\/g>/);
  if (!g) throw new Error("땅 묶음을 못 찾음: " + file);

  const pts = [...g[1].matchAll(/<use href="#d" x="([-\d.]+)" y="([-\d.]+)"\/>/g)]
    .map((m) => [Number(m[1]), Number(m[2])]);
  if (!pts.length) throw new Error("점이 없음: " + file);

  /* 좌표를 칸 번호로 되돌린다. 만들 때 반올림해 찍혔으므로 여기서도
     반올림해 같은 칸으로 모은다. */
  const cell = new Set();
  let minI = Infinity, minJ = Infinity, maxI = -Infinity, maxJ = -Infinity;
  for (const [x, y] of pts) {
    const i = Math.round(x / SX), j = Math.round(y / SY);
    cell.add(i + "," + j);
    if (i < minI) minI = i; if (i > maxI) maxI = i;
    if (j < minJ) minJ = j; if (j > maxJ) maxJ = j;
  }
  const has = (i, j) => cell.has(i + "," + j);

  /* 면: 칸마다 사각형 하나. 변을 정확히 맞대므로 채우면 한 덩어리가 된다. */
  const fill = [];
  /* 선: 땅 칸이 바다 칸과 맞닿는 변만. 그것이 해안선이다. */
  const edge = [];
  const f = (n) => Math.round(n * 10) / 10;
  for (const key of cell) {
    const [i, j] = key.split(",").map(Number);
    const x = i * SX - SX / 2, y = j * SY - SY / 2;
    fill.push(`M${f(x)} ${f(y)}h${f(SX)}v${f(SY)}h${f(-SX)}z`);
    if (!has(i, j - 1)) edge.push(`M${f(x)} ${f(y)}h${f(SX)}`);
    if (!has(i, j + 1)) edge.push(`M${f(x)} ${f(y + SY)}h${f(SX)}`);
    if (!has(i - 1, j)) edge.push(`M${f(x)} ${f(y)}v${f(SY)}`);
    if (!has(i + 1, j)) edge.push(`M${f(x + SX)} ${f(y)}v${f(SY)}`);
  }

  const out = src
    .replace(/<defs><circle id="d" r="[\d.]+"\/><\/defs>/, "")
    .replace(/<g class="cm-map-land">[\s\S]*?<\/g>/,
      `<g class="cm-map-land">` +
      `<path class="cm-land-fill" d="${fill.join("")}"/>` +
      `<path class="cm-land-edge" d="${edge.join("")}"/>` +
      `</g>`);

  writeFileSync(file, out);
  return { 칸: cell.size, 해안변: edge.length, 바이트: out.length };
}

for (const site of ["imweb-en", "imweb"]) {
  const f = join(root, "sites", "careermetri", site, "16-markets.html");
  try {
    const r = rebuild(f);
    console.log(`${site.padEnd(9)} 땅 칸 ${r.칸} · 해안 변 ${r.해안변} · ${(r.바이트/1024).toFixed(1)}KB`);
  } catch (e) { console.log(`${site.padEnd(9)} 건너뜀 — ${e.message}`); }
}
