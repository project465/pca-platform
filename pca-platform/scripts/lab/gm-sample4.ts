/**
 * **PDF GOLD MASTER 4차 · 대표 5쪽.** 50쪽 전체를 다시 뽑지 않고 한 사례(RICH)로 다섯 쪽만 뽑아
 * v3 의 같은 자리와 나란히 놓는다. 운영 PDF 경로(`/v3/{id}/result/pdf`)는 건드리지 않는다.
 *
 *   CASE=RICH:1 npx tsx scripts/lab/gm-sample4.ts
 *     → docs/metri/review/pdf-gm/v4-sample/BIZ-GM4-SAMPLE.pdf · pages/v4-p-N.png · pairs/pair-N.jpg
 *
 * 쪽마다 A4 한 장 안에서 끝나야 한다. 넘친 쪽이 있으면 그 쪽과 넘친 높이를 적고 1 로 끝난다(넘친 글을 숨기지 않는다).
 * 글꼴은 `var/pdf-gm/fonts/pretendard/` 에 Pretendard 가 있으면 그것을, 없으면 `var/pdf-gm/fonts/nanum/` 의 NanumGothic 을 쓴다.
 * v3 쪽 그림은 `docs/metri/review/pdf-gm/v3/pages/RICH/` 의 같은 자리(표지 1 · 역량 6 · 영역 8 · 기업 30 · 계획 45)를 쓴다.
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { load3 } from "./gm-report3";
import { sample4, SAMPLE4_PAGES, type Fonts } from "../../src/lib/me-v3/report-gm/render4";

const [TAG, ID] = (process.env.CASE ?? "RICH:1").split(":");
const WORK = path.resolve("var/pdf-gm");
const OUT = process.env.OUT ?? "docs/metri/review/pdf-gm/v4-sample";
const V3 = (process.env.V3_PAGES ?? "1,6,8,30,45").split(",").map(Number);

const OVERFLOW_JS = `(() => [...document.querySelectorAll(".pg")].map((pg) => {
  const box = (pg.querySelector(".bd") || pg).getBoundingClientRect();
  const limit = pg.classList.contains("cover") ? pg.querySelector(".cv-review").getBoundingClientRect().top : box.bottom;
  let max = 0;
  for (const e of pg.querySelectorAll(".bd *, .cv-low > *:not(.cv-review)")) { const b = e.getBoundingClientRect(); if (b.height) max = Math.max(max, b.bottom); }
  return { page: Number(pg.dataset.page), over: Math.round(max - limit), free: Math.round(limit - max) };
}))()`;

function fonts(): Fonts {
  const pre = path.join(WORK, "fonts/pretendard");
  if (existsSync(path.join(pre, "Pretendard-Regular.woff2")) || existsSync(path.join(pre, "Pretendard-Regular.otf"))) return { href: "fonts/pretendard", family: "Pretendard" };
  if (!existsSync(path.join(WORK, "fonts/nanum/NanumGothic.ttf"))) throw new Error("글꼴이 없다: var/pdf-gm/fonts/pretendard 또는 var/pdf-gm/fonts/nanum");
  return { href: "fonts/nanum", family: "NanumGothic" };
}

async function main(): Promise<void> {
  mkdirSync(WORK, { recursive: true });
  for (const d of ["", "pages", "pairs"]) mkdirSync(path.join(OUT, d), { recursive: true });
  const r = await load3(ID);
  const f = fonts();
  const html = path.join(WORK, `BIZ-GM4-SAMPLE-${TAG}.html`);
  writeFileSync(html, sample4(r, f));
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.goto("file://" + html, { waitUntil: "load" });
  await p.evaluate("document.fonts.ready");
  await p.emulateMedia({ media: "print" });
  const over = await p.evaluate(OVERFLOW_JS) as { page: number; over: number; free: number }[];
  const pdf = path.join(OUT, "BIZ-GM4-SAMPLE.pdf");
  await p.pdf({ path: pdf, format: "A4", printBackground: true, preferCSSPageSize: true });
  await b.close();
  const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [pdf]).toString())![1]);
  execFileSync("pdftoppm", ["-r", "110", "-png", pdf, path.join(OUT, "pages", "v4-p")]);
  for (const s of SAMPLE4_PAGES) {
    const v4 = path.join(OUT, "pages", `v4-p-${s.no}.png`);
    const v3 = path.resolve(`docs/metri/review/pdf-gm/v3/pages/${TAG}/${TAG}-p-${String(V3[s.no - 1]).padStart(2, "0")}.jpg`);
    if (existsSync(v3)) execFileSync("python3", ["scripts/lab/gm-pair.py", v3, v4, path.join(OUT, "pairs", `pair-${s.no}.jpg`), `v3 · ${V3[s.no - 1]}쪽`, `v4 · ${s.title}`]);
  }
  writeFileSync(path.join(WORK, `BIZ-GM4-SAMPLE-${TAG}.fit.json`), JSON.stringify({ font: f.family, pages, over }, null, 1));
  console.log(`${TAG} ${ID} → ${pdf} · ${pages}쪽 · 글꼴 ${f.family}`);
  for (const o of over) console.log(`  ${o.page}쪽 ${o.over > 0 ? `넘침 ${o.over}px` : `남은 높이 ${o.free}px`}`);
  process.exit(pages === SAMPLE4_PAGES.length && over.every((o) => o.over <= 0) ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
