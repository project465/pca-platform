/**
 * **BIZ 전체 보고서(70~80쪽) 검토판을 뽑는다.** 80쪽 설계표의 쪽마다, 굳은 결과(`v3_snapshots`)에서
 * 읽은 학생 한 사람의 값으로 그린다. 운영 PDF 경로와 연결하지 않는다(파일만 쓴다).
 *
 *   CASES=RICH:1,POOR:2,CONTRA:3 npx tsx scripts/lab/gm-full6.ts
 *     → docs/metri/review/pdf-gm/v6-full/BIZ-PRO-<TAG>.pdf · pages/<TAG>/p-NN.png · BUILD_<TAG>.md
 *
 * 쪽이 A4 한 장을 넘치면 그 쪽의 글만 줄여(최대 17%) 맞춘다. 숨기지 않는다. 그래도 넘치면 적고 1 로 끝난다.
 * 공시 자료는 `dart-verify.mjs` · `dart_overview.py` 가 만든 파일을 읽기만 한다(여기서 API 를 부르지 않는다).
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import path from "node:path";
import { load3 } from "./gm-report3";
import type { Fonts } from "../../src/lib/me-v3/report-gm/render4";
import type { Lib } from "../../src/lib/me-v3/report-gm/render5";
import { full6 } from "../../src/lib/me-v3/report-gm/render6";

const CASES = (process.env.CASES ?? "RICH:1,POOR:2,CONTRA:3").split(",").map((x) => x.split(":") as [string, string]);
const WORK = path.resolve("var/pdf-gm");
const OUT = process.env.OUT ?? "docs/metri/review/pdf-gm/v6-full";
const J = (p: string) => JSON.parse(readFileSync(p, "utf8"));

/* 쪽마다 넘친 높이를 재고, 넘치면 .bd 의 자식만 줄인다(.bd 상자는 그대로라 머리·꼬리와 겹치지 않는다) */
/* v9: 줄이는 하한. v8 은 0.83 까지 줄여 8pt 글자가 6.6pt 로 찍혔다. 글자 바닥(8.9pt)과 짝을 맞춰 0.96 까지만 줄인다 */
const MIN_ZOOM = Number(process.env.GM_MIN_ZOOM ?? "0.96");
const FIT_JS = `(() => {
  const over = (pg) => { const box = pg.querySelector(".bd").getBoundingClientRect(); let max = 0;
    for (const e of pg.querySelectorAll(".bd *")) { const b = e.getBoundingClientRect(); if (b.height) max = Math.max(max, b.bottom); }
    return Math.round(max - box.bottom); };
  return [...document.querySelectorAll(".pg")].map((pg, i) => {
    const bd = pg.querySelector(".bd"); if (!bd) return { i: i + 1, n: Number(pg.dataset.page), over: 0, zoom: 1 };
    let o = over(pg), z = 1;
    while (o > 0 && z > __MINZ__) { z = Math.round((z - 0.01) * 100) / 100; for (const c of bd.children) c.style.zoom = String(z); o = over(pg); }
    return { i: i + 1, n: Number(pg.dataset.page), over: o, zoom: z };
  });
})()`;

/* v9: 쪽마다 실제로 찍히는 글자 크기를 잰다. 줄여 맞춘 쪽은 .bd 자식에 zoom 이 걸려 있으니 조상의 zoom 을 곱한 값이 종이 위 크기다.
   글자가 직접 들어 있는 요소만 센다(빈 상자는 뺀다). 결과는 pt 로 적는다(1px = 0.75pt). */
const FONT_JS = `(() => {
  const out = [];
  document.querySelectorAll(".pg").forEach((pg, i) => {
    const seen = new Map();
    for (const el of pg.querySelectorAll("*")) {
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").replace(/\\s+/g, " ").trim();
      if (!own) continue;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      let z = 1; for (let a = el; a && a !== document.documentElement; a = a.parentElement) { const v = parseFloat(getComputedStyle(a).zoom); if (v && v !== 1) z *= v; }
      let raw = parseFloat(getComputedStyle(el).fontSize) * 0.75;
      if (el instanceof SVGElement && el.getScreenCTM) { const m = el.getScreenCTM(); if (m) raw = raw * Math.sqrt(m.a * m.a + m.b * m.b); }
      const eff = Math.round(raw * z * 100) / 100;
      const where = el.closest(".rh,.rf") ? "머리·꼬리" : "본문";
      const cls = (el.className && typeof el.className === "string" ? el.className.split(" ")[0] : "") || el.tagName.toLowerCase();
      const k = where + "|" + el.tagName.toLowerCase() + "." + cls + "|" + eff;
      if (!seen.has(k)) seen.set(k, { page: i + 1, n: Number(pg.dataset.page), where, sel: el.tagName.toLowerCase() + "." + cls, raw: Math.round(raw * 100) / 100, zoom: z, eff, text: own.slice(0, 48), count: 0 });
      seen.get(k).count++;
    }
    out.push(...seen.values());
  });
  return out;
})()`;

function fonts(): Fonts {
  const pre = path.join(WORK, "fonts/pretendard");
  if (existsSync(path.join(pre, "Pretendard-Regular.woff2")) || existsSync(path.join(pre, "Pretendard-Regular.otf"))) return { href: "fonts/pretendard", family: "Pretendard" };
  return { href: "fonts/nanum", family: "NanumGothic" };
}

async function one(TAG: string, ID: string, b: Awaited<ReturnType<typeof chromium.launch>>): Promise<boolean> {
  const r = await load3(ID);
  const lib: Lib = {
    toc: J("data/report-gm/biz-pro-toc.v1.json"), dart: J("data/region/dart-checks.v1.json"), overview: J("data/region/dart-overview.v1.json"),
    roles: J("data/report-gm/biz-role-guide.json"), orgs: J("data/region/kr-chungcheong-orgs.v2.json"),
    domains: r.map.map((m) => ({ code: m.code, name: m.name })), versions: r.versions,
  };
  const f = fonts();
  const out = full6(r, lib, f);
  const html = path.join(WORK, `BIZ-PRO-${TAG}.html`);
  writeFileSync(html, out.html);
  const p = await b.newPage();
  await p.goto("file://" + html, { waitUntil: "load" });
  await p.evaluate("document.fonts.ready");
  await p.emulateMedia({ media: "print" });
  const fit = await p.evaluate(FIT_JS.replace("__MINZ__", String(MIN_ZOOM))) as { i: number; n: number; over: number; zoom: number }[];
  mkdirSync(OUT, { recursive: true });
  const pdf = path.join(OUT, `BIZ-PRO-${TAG}.pdf`);
  const sizes = await p.evaluate(FONT_JS) as { page: number; n: number; where: string; sel: string; raw: number; zoom: number; eff: number; text: string; count: number }[];
  await p.pdf({ path: pdf, format: "A4", printBackground: true, preferCSSPageSize: true });
  await p.close();
  const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [pdf]).toString())![1]);
  const dir = path.join(OUT, "pages", TAG);
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  execFileSync("pdftoppm", ["-r", "60", "-png", pdf, path.join(dir, "p")]);
  for (const fn of readdirSync(dir)) { const m = /^p-0*(\d+)\.png$/.exec(fn); if (m && fn !== `p-${m[1].padStart(2, "0")}.png`) execFileSync("mv", [path.join(dir, fn), path.join(dir, `p-${m[1].padStart(2, "0")}.png`)]); }
  const bad = fit.filter((x) => x.over > 0);
  const md = [
    `# BIZ PRO 전체 보고서 · ${TAG} (응시 ${ID})`, "",
    `- 쪽 수: **${pages}** (설계 80쪽 가운데 ${out.pages.length}쪽이 섬 · ${out.skipped.length}쪽 뺌)`,
    `- 글꼴: ${f.family} · 학생 판단 유형: ${r.kind} · 목표 직무: ${r.strategy.roleName} · 깊게 본 기업: ${r.companies.map((c) => c.name).join(", ")}`,
    `- 넘친 쪽: ${bad.length ? bad.map((x) => `${x.i}쪽(설계 ${x.n}) ${x.over}px`).join(", ") : "없음"} · 글을 줄여 맞춘 쪽: ${fit.filter((x) => x.zoom < 1).map((x) => `${x.i}(${Math.round(x.zoom * 100)}%)`).join(", ") || "없음"}`, "",
    "## 선 쪽", "", "| 쪽 | 설계 | 제목 |", "|---|---|---|", ...out.pages.map((x) => `| ${x.i} | ${x.n} | ${x.title} |`), "",
    "## 뺀 쪽과 까닭", "", "| 설계 | 제목 | 까닭 |", "|---|---|---|", ...out.skipped.map((x) => `| ${x.n} | ${x.title} | ${x.why} |`), "",
  ].join("\n");
  writeFileSync(path.join(OUT, `BUILD_${TAG}.md`), md);
  /* 글자 크기 감사: 8.5pt 아래로 찍힌 글자(본문)를 쪽·선택자·글 첫머리와 함께 적는다 */
  const MIN = 8.5;
  const small = sizes.filter((x) => x.eff < MIN - 0.01);
  const body = small.filter((x) => x.where === "본문");
  writeFileSync(path.join(OUT, `FONTS_${TAG}.md`), [
    `# 글자 크기 감사 · ${TAG} (기준 ${MIN}pt · 줄여 맞춘 쪽의 zoom 을 곱한 종이 위 크기)`, "",
    `- 본문에서 ${MIN}pt 아래: **${body.reduce((a, x) => a + x.count, 0)}개 요소 · ${new Set(body.map((x) => x.page)).size}쪽** · 가장 작은 값 ${body.length ? Math.min(...body.map((x) => x.eff)) : "—"}pt`,
    `- 머리·꼬리(쪽 번호·학교 이름)에서 ${MIN}pt 아래: ${small.filter((x) => x.where !== "본문").reduce((a, x) => a + x.count, 0)}개 요소`, "",
    "| 쪽 | 설계 | 선택자 | 지정 크기 | zoom | 종이 위 | 개수 | 글 첫머리 |", "|---|---|---|---|---|---|---|---|",
    ...body.sort((a, b) => a.page - b.page || a.eff - b.eff).map((x) => `| ${x.page} | ${x.n} | ${x.sel} | ${x.raw}pt | ${x.zoom} | **${x.eff}pt** | ${x.count} | ${x.text.replace(/\|/g, "/")} |`), "",
  ].join("\n"));
  console.log(`${TAG} ${ID} → ${pdf} · ${pages}쪽 · 뺀 쪽 ${out.skipped.length} · 넘침 ${bad.length} · 줄인 쪽 ${fit.filter((x) => x.zoom < 1).length}`);
  return pages === out.pages.length && !bad.length;
}

async function main(): Promise<void> {
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  let ok = true;
  for (const [TAG, ID] of CASES) ok = (await one(TAG, ID, b)) && ok;
  await b.close();
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
