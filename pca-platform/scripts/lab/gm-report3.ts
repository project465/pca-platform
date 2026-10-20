/**
 * **PDF GOLD MASTER 3차 미리보기.** 운영 PDF 경로(`/v3/{id}/result/pdf`)는 건드리지 않는다.
 *
 *   CASES=RICH:462,POOR:463,CONTRA:464 npx tsx scripts/lab/gm-report3.ts
 *
 * 2차와 같은 세 번 뽑기다: 본문 → 쪽마다 장 읽기 → 차례에 쪽 번호를 적어 다시 뽑기 → 덧판 겹치기.
 * 장 목록은 사례마다 다르다(`chaptersOf`): 근거가 적은 사례는 성장 설계 장이 들어온다.
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { queryOne } from "../../src/lib/db";
import { coreOf, type ResultModel } from "../../src/lib/me-v3/result/model";
import { resultMeta } from "../../src/lib/me-v3/result/meta";
import { experiencesOf } from "../../src/lib/me-v3/platform";
import { build3, type Report3 } from "../../src/lib/me-v3/report-gm/report3";
import { render3, overlay3, chaptersOf } from "../../src/lib/me-v3/report-gm/render3";

const WORK = path.resolve("var/pdf-gm");
const OUT = process.env.OUT ?? "docs/metri/review/pdf-gm/v3";
const FONTS = "fonts/pretendard";
const CASES = (process.env.CASES ?? "RICH:462,POOR:463,CONTRA:464").split(",").map((x) => x.split(":"));

export async function load3(id: string): Promise<Report3> {
  const row = await queryOne<{ result_model: ResultModel; tier: string; user_id: string }>(
    `SELECT s.result_model, a.tier, a.user_id::text FROM v3_snapshots s JOIN v3_attempts a ON a.id = s.attempt_id
      WHERE s.attempt_id = $1 ORDER BY s.created_at DESC LIMIT 1`, [id]);
  if (!row) throw new Error(`${id}: 굳은 결과가 없다`);
  const core = coreOf(row.result_model);
  const meta = await resultMeta(id, core);
  const exps = await experiencesOf(row.user_id, core);
  return build3(row.result_model, { ...meta, tier: row.tier }, exps);
}

async function print(html: string, file: string, name: string): Promise<void> {
  const tmp = path.join(WORK, name + ".html");
  writeFileSync(tmp, html);
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.goto("file://" + tmp, { waitUntil: "load" });
  await p.evaluate(() => (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready);
  if (!name.endsWith(".over") && process.env.FIT !== "0") { const lg = await fit(p); if (process.env.FIT_LOG) console.log(name, "fit", lg.join(" ")); }
  await p.pdf({ path: file, format: "A4", printBackground: true, preferCSSPageSize: true });
  await b.close();
}
/**
 * 쪽을 새로 여는 묶음(장 · 영역 · 직무 · 기업 · 경험 기록)이 마지막 쪽을 몇 줄만 넘기면 그 쪽이 거의 빈 채로 뽑힌다.
 * 글을 덜어내지 않고, 그 묶음만 글자를 줄여 그 앞 쪽 안에 넣는다(최대 14%).
 * 화면 배치로 재면 인쇄의 틈(`break-inside: avoid`)을 못 본다: 묶음마다 따로 인쇄해 실제 쪽 수를 센다.
 * 묶음은 늘 쪽 머리에서 시작하므로 따로 뽑은 쪽 수가 전체에서의 쪽 수와 같다.
 */
const SEG_JS = `(() => {
  const sel = ".ch, .dm:not(.first), .jb:not(.first), .co:not(.first), .rc+.rc";
  if (!document.getElementById("gm-fit")) { const st = document.createElement("style"); st.id = "gm-fit"; st.textContent = ".gm-hide{display:none!important}"; document.head.appendChild(st); }
  const starts = () => [...document.querySelectorAll(sel)];
  const reset = () => document.querySelectorAll(".gm-hide").forEach((e) => e.classList.remove("gm-hide"));
  const parts = (i) => {
    const t = starts()[i];
    if (t.classList.contains("ch")) {
      const kids = [...t.children]; const cut = kids.findIndex((c) => c.matches(sel) || c.querySelector(sel));
      return { show: t, zoom: kids.filter((c, k) => !c.classList.contains("ch-h") && (cut < 0 || k < cut)), hide: cut < 0 ? [] : kids.slice(cut) };
    }
    const hide = []; let e = t;
    while (e && !e.classList.contains("ch")) { for (const sib of e.parentElement.children) if (sib !== e) hide.push(sib); e = e.parentElement; }
    return { show: e, zoom: [t], hide };
  };
  window.__gm = {
    count: () => starts().length,
    only: (i) => { reset(); const pr = parts(i); for (const c of document.body.children) if (c !== pr.show && !c.contains(pr.show)) c.classList.add("gm-hide"); pr.hide.forEach((h) => h.classList.add("gm-hide")); },
    zoom: (i, z) => { for (const c of parts(i).zoom) c.style.zoom = z === 1 ? "" : String(z); },
    reset,
  };
})()`;
async function fit(p: import("playwright").Page): Promise<string[]> {
  const log: string[] = [];
  await p.evaluate(SEG_JS);
  const n = await p.evaluate("window.__gm.count()") as number;
  const tmp = path.join(WORK, "_seg.pdf");
  const shot = async (): Promise<{ pages: number; last: number; avg: number }> => {
    await p.pdf({ path: tmp, format: "A4", printBackground: true, preferCSSPageSize: true });
    const k = pagesOf(tmp);
    const chars = Array.from({ length: k }, (_, i) => execFileSync("pdftotext", ["-f", String(i + 1), "-l", String(i + 1), tmp, "-"]).toString().replace(/\s/g, "").length);
    return { pages: k, last: chars[k - 1], avg: chars.slice(0, -1).reduce((a, b) => a + b, 0) / Math.max(1, k - 1) };
  };
  for (let i = 0; i < n; i++) {
    await p.evaluate(`window.__gm.only(${i})`);
    const base = await shot();
    // 마지막 쪽이 앞 쪽 평균의 30%도 안 되면 꼬리다
    if (base.pages < 2 || base.last > base.avg * 0.3) continue;
    let done = false;
    for (const z of [0.96, 0.92, 0.89, 0.86]) {
      await p.evaluate(`window.__gm.zoom(${i}, ${z})`);
      const r = await shot();
      if (r.pages < base.pages) { log.push(`${i}:${z}`); done = true; break; }
    }
    if (!done) { await p.evaluate(`window.__gm.zoom(${i}, 1)`); log.push(`${i}:그대로`); }
  }
  await p.evaluate("window.__gm.reset()");
  return log;
}
const pagesOf = (f: string) => Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [f]).toString())![1]);

function sectionsByPage(file: string, r: Report3): { starts: Record<string, number>; per: string[] } {
  const n = pagesOf(file);
  const chs = chaptersOf(r);
  const starts: Record<string, number> = {};
  const per: string[] = ["표지"];
  let cur = "표지";
  for (let i = 2; i <= n; i++) {
    const t = execFileSync("pdftotext", ["-f", String(i), "-l", String(i), "-layout", file, "-"]).toString();
    // 차례 쪽은 장 머리 열셋을 전부 들고 있다: 거기서 세면 모든 장이 2쪽에서 시작한다
    if (/^\s*차례\s*$/m.test(t) || /^\s*이 보고서에서 쓰는 말\s*$/m.test(t)) { per.push("차례"); continue; }
    for (const c of chs) {
      if (starts[c.no]) continue;
      const head = c.title.slice(0, 6).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`^\\s*${c.no}\\s+${head}`, "m").test(t)) { starts[c.no] = i; cur = `${c.no} ${c.title}`; }
    }
    per.push(cur);
  }
  return { starts, per };
}

async function main(): Promise<void> {
  mkdirSync(WORK, { recursive: true }); mkdirSync(OUT, { recursive: true });
  for (const [tag, id] of CASES) {
    const r = await load3(id);
    writeFileSync(path.join(WORK, `${tag}.r3.json`), JSON.stringify(r, null, 1));
    const body = path.join(WORK, `BIZ-GM3-${tag}.body.pdf`);
    await print(render3(r, { fontsHref: FONTS }), body, `BIZ-GM3-${tag}`);
    let s = sectionsByPage(body, r);
    await print(render3(r, { fontsHref: FONTS, pages: s.starts }), body, `BIZ-GM3-${tag}`);
    s = sectionsByPage(body, r);
    const over = path.join(WORK, `BIZ-GM3-${tag}.over.pdf`);
    await print(overlay3(r, s.per, FONTS), over, `BIZ-GM3-${tag}.over`);
    const file = path.join(OUT, `BIZ-GM-${tag}.pdf`);
    execFileSync("python3", ["scripts/lab/gm-stamp.py", body, over, file]);
    writeFileSync(path.join(WORK, `${tag}.pages3.json`), JSON.stringify(s, null, 1));
    console.log(`${tag} ${id} → ${file} · ${pagesOf(file)}쪽 · 장 ${JSON.stringify(s.starts)}`);
  }
  process.exit(0);
}
if (process.argv[1]?.endsWith("gm-report3.ts")) main().catch((e) => { console.error(e); process.exit(1); });
