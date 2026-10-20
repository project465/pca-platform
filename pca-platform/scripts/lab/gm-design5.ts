/**
 * **80쪽 설계 · 핵심 디자인 쪽 여덟.** 설계표(`data/report-gm/biz-pro-toc.v1.json`)에서 새 쪽 틀이 필요한
 * 자리 가운데 대표 여덟 쪽만 한 사례로 뽑는다. 80쪽 전체를 뽑지 않고 운영 PDF 와 연결하지 않는다.
 *
 *   CASE=RICH:1 npx tsx scripts/lab/gm-design5.ts
 *     → docs/metri/review/pdf-gm/v5-plan/BIZ-PRO-DESIGN-PAGES.pdf · pages/d5-p-N.png
 *
 * 공시 자료는 `scripts/lab/dart-verify.mjs` · `dart_overview.py` 가 만든 파일을 읽기만 한다(여기서 API 를 부르지 않는다).
 * 쪽마다 A4 한 장 안에서 끝나야 한다. 넘친 쪽이 있으면 적고 1 로 끝난다.
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { load3 } from "./gm-report3";
import type { Fonts } from "../../src/lib/me-v3/report-gm/render4";
import { design5, DESIGN5_PAGES, type Lib } from "../../src/lib/me-v3/report-gm/render5";

const [TAG, ID] = (process.env.CASE ?? "RICH:1").split(":");
const WORK = path.resolve("var/pdf-gm");
const OUT = process.env.OUT ?? "docs/metri/review/pdf-gm/v5-plan";
const J = (p: string) => JSON.parse(readFileSync(p, "utf8"));

const OVERFLOW_JS = `(() => [...document.querySelectorAll(".pg")].map((pg) => {
  const box = pg.querySelector(".bd").getBoundingClientRect();
  let max = 0;
  for (const e of pg.querySelectorAll(".bd *")) { const b = e.getBoundingClientRect(); if (b.height) max = Math.max(max, b.bottom); }
  return { page: Number(pg.dataset.page), over: Math.round(max - box.bottom), free: Math.round(box.bottom - max) };
}))()`;

function fonts(): Fonts {
  const pre = path.join(WORK, "fonts/pretendard");
  if (existsSync(path.join(pre, "Pretendard-Regular.woff2")) || existsSync(path.join(pre, "Pretendard-Regular.otf"))) return { href: "fonts/pretendard", family: "Pretendard" };
  return { href: "fonts/nanum", family: "NanumGothic" };
}

async function main(): Promise<void> {
  mkdirSync(path.join(OUT, "pages"), { recursive: true });
  const r = await load3(ID);
  const lib: Lib = {
    toc: J("data/report-gm/biz-pro-toc.v1.json"), dart: J("data/region/dart-checks.v1.json"), overview: J("data/region/dart-overview.v1.json"),
    roles: J("data/report-gm/biz-role-guide.json"), orgs: J("data/region/kr-chungcheong-orgs.v2.json"),
    domains: r.map.map((m) => ({ code: m.code, name: m.name })), versions: r.versions,
  };
  const f = fonts();
  const html = path.join(WORK, `BIZ-PRO-DESIGN-${TAG}.html`);
  writeFileSync(html, design5(r, lib, f));
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.goto("file://" + html, { waitUntil: "load" });
  await p.evaluate("document.fonts.ready");
  await p.emulateMedia({ media: "print" });
  const over = await p.evaluate(OVERFLOW_JS) as { page: number; over: number; free: number }[];
  const pdf = path.join(OUT, "BIZ-PRO-DESIGN-PAGES.pdf");
  await p.pdf({ path: pdf, format: "A4", printBackground: true, preferCSSPageSize: true });
  await b.close();
  const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [pdf]).toString())![1]);
  for (const n of DESIGN5_PAGES) rmSync(path.join(OUT, "pages", `d5-p-${n}.png`), { force: true });
  execFileSync("pdftoppm", ["-r", "110", "-png", pdf, path.join(OUT, "pages", "tmp")]);
  DESIGN5_PAGES.forEach((n, i) => execFileSync("mv", [path.join(OUT, "pages", `tmp-${i + 1}.png`), path.join(OUT, "pages", `d5-p-${n}.png`)]));
  console.log(`${TAG} ${ID} → ${pdf} · ${pages}쪽 · 글꼴 ${f.family}`);
  for (const o of over) console.log(`  설계 ${o.page}쪽 ${o.over > 0 ? `넘침 ${o.over}px` : `남은 높이 ${o.free}px`}`);
  process.exit(pages === DESIGN5_PAGES.length && over.every((o) => o.over <= 0) ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
