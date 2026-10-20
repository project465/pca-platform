/**
 * **R5 긴 판(A안)을 뽑는다.** R5 쪽 + v9 의 기업 외 쪽을 R5 겉모양으로 한 권에. 운영 PDF 경로와 연결하지 않는다.
 *
 *   DATABASE_URL=postgres:///cm_dev V3_PREVIEW_OPEN='*' CASES=RICH:1,POOR:2,CONTRA:3 \
 *     OUT=docs/metri/review/r5/pdf-long npx tsx scripts/lab/gm-r5long.ts
 *
 * 1. 굳은 결과를 **기업 목록 없이** 다시 읽는다(`build3(..., EMPTY_ORGS)`): 기업 이름이 요약 · 계획 · 면접 재료에 끼지 않는다
 * 2. R5 쪽(`pages9`)과 v9 쪽(`full6`, 기업 · 지역 · 공시 쪽은 차례에서 뺌)을 따로 인쇄하고, 차례(`plan10`) 대로 이어 붙인다
 * 3. v9 쪽이 A4 를 넘으면 그 쪽 글만 줄인다(0.96 까지 · v9 규칙 그대로). 그래도 넘치면 걸림
 * 4. 검사 → `LINT_LONG.md`: 넘침 · 8.5pt 아래(줄인 쪽은 줄인 크기로) · 명조 · 금지어 · 상투 · 단정 · 쪽마다 채움(보고)
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { queryOne } from "../../src/lib/db";
import { coreOf, type ResultModel } from "../../src/lib/me-v3/result/model";
import { resultMeta } from "../../src/lib/me-v3/result/meta";
import { experiencesOf } from "../../src/lib/me-v3/platform";
import { build3, type Report3 } from "../../src/lib/me-v3/report-gm/report3";
import type { OrgSet2 } from "../../src/lib/me-v3/report-gm/companies";
import { edit8 } from "../../src/lib/me-v3/report-gm/editorial8";
import { pages9 } from "../../src/lib/me-v3/report-gm/render9";
import { full6 } from "../../src/lib/me-v3/report-gm/render6";
import type { Lib } from "../../src/lib/me-v3/report-gm/render5";
import { plan10, merge10, r5Doc, v9Doc, KEEP9, DROP9, type LongPage } from "../../src/lib/me-v3/report-gm/render10";

const CASES = (process.env.CASES ?? "RICH:1,POOR:2,CONTRA:3").split(",").map((x) => x.split(":") as [string, string]);
const WORK = path.resolve("var/pdf-gm");
const OUT = process.env.OUT ?? "docs/metri/review/r5/pdf-long";
const J = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const EMPTY_ORGS: OrgSet2 = { schema: "none", checked_on: "", status: "EXCLUDED", note: "R5 긴 판: 기업 자료를 읽지 않는다", region_facts: [], orgs: [] };

async function load(id: string): Promise<Report3> {
  const row = await queryOne<{ result_model: ResultModel; tier: string; user_id: string }>(
    `SELECT s.result_model, a.tier, a.user_id::text FROM v3_snapshots s JOIN v3_attempts a ON a.id = s.attempt_id
      WHERE s.attempt_id = $1 ORDER BY s.created_at DESC LIMIT 1`, [id]);
  if (!row) throw new Error(`${id}: 굳은 결과가 없다`);
  const core = coreOf(row.result_model);
  const meta = await resultMeta(id, core);
  const exps = await experiencesOf(row.user_id, core);
  return build3(row.result_model, { ...meta, tier: row.tier }, exps, EMPTY_ORGS);
}

const FIT_JS = `(() => [...document.querySelectorAll(".pg")].map((pg) => {
  const bd = pg.querySelector(".bd"); if (!bd) return { key: pg.dataset.key, zoom: 1, over: 0 };
  const over = () => { const box = bd.getBoundingClientRect(); let max = 0; for (const e of bd.querySelectorAll("*")) { const b = e.getBoundingClientRect(); if (b.height) max = Math.max(max, b.bottom); } return Math.round(max - box.bottom); };
  let o = over(), z = 1;
  if (pg.dataset.key.startsWith("v9-")) while (o > 0 && z > 0.96) { z = Math.round((z - 0.01) * 100) / 100; for (const c of bd.children) c.style.zoom = String(z); o = over(); }
  return { key: pg.dataset.key, zoom: z, over: o };
}))()`;
const FILL_JS = `(() => [...document.querySelectorAll(".pg")].map((pg) => {
  const bd = pg.querySelector(".bd") || pg; const box = bd.getBoundingClientRect();
  const iv = [...bd.querySelectorAll("*")].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || e.matches("i,.x-ln,.x-lines i,.wl")).map((e) => { const b = e.getBoundingClientRect(); return [Math.max(b.top, box.top), Math.min(b.bottom, box.bottom)]; }).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  let cov = 0, cur = null; for (const [a, b] of iv) { if (!cur || a > cur[1]) { if (cur) cov += cur[1] - cur[0]; cur = [a, b]; } else cur[1] = Math.max(cur[1], b); } if (cur) cov += cur[1] - cur[0];
  let last = 0; for (const [, b] of iv) last = Math.max(last, b);
  return { key: pg.dataset.key, fill: Math.round((cov / box.height) * 100), reach: Math.round(((last - box.top) / box.height) * 100) };
}))()`;
const FONT_JS = `(() => { const out = []; document.querySelectorAll(".pg").forEach((pg) => {
  for (const el of pg.querySelectorAll("*")) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
    if (!own) continue; const r = el.getBoundingClientRect(); if (!r.width) continue;
    let z = 1; for (let a = el; a && a !== document.documentElement; a = a.parentElement) { const v = parseFloat(getComputedStyle(a).zoom); if (v && v !== 1) z *= v; }
    const cs = getComputedStyle(el);
    let raw = parseFloat(cs.fontSize) * 0.75;
    if (el instanceof SVGElement && el.getScreenCTM) { const m = el.getScreenCTM(); if (m) raw = raw * Math.sqrt(m.a * m.a + m.b * m.b); }
    out.push({ key: pg.dataset.key, pt: Math.round(raw * z * 100) / 100, family: cs.fontFamily, text: own.slice(0, 30) });
  } }); return out; })()`;

const FORBIDDEN = ["DART", "OpenDART", "전자공시", "공시", "사업보고서", "반기보고서", "분기보고서", "매출액", "영업이익", "순이익", "재무제표", "접수번호", "사업자등록번호", "법인등록번호", "KODATA", "(주)", "주식회사", "확인 수준", "적합도", "합격률", "합격 가능", "채용 확률", "연봉", "지역 기업"];
const TEMPLATE = ["로 해석할 수 있습니다", "으로 해석할 수 있습니다", "확인할 필요가 있습니다", "현재 결과에서는", "가능성을 보여줍니다", "활용할 수 있습니다", "이 보고서는", "보여줍니다", "연결될 수 있습니다", "중요합니다", "확인해볼 필요", "역량을 강화", "성장 방향", "핵심 포인트", "강점이 드러납니다", "Evidence", "Insight", "Summary"];
const ASSERT = ["강점입니다", "능력이 있습니다", "역량이 있습니다", "잘합니다", "뛰어납니다", "갖추고 있습니다", "경험이 있습니다", "강점 세 가지", "지금 강한 쪽"];

type Got = { fit: { key: string; zoom: number; over: number }[]; fill: { key: string; fill: number; reach: number }[]; fonts: { key: string; pt: number; family: string; text: string }[] };
async function print(b: Awaited<ReturnType<typeof chromium.launch>>, html: string, name: string, pdf: string, fit: boolean): Promise<Got> {
  const file = path.join(WORK, name + ".html");
  writeFileSync(file, html);
  const p = await b.newPage();
  await p.goto("file://" + file, { waitUntil: "load" });
  await p.evaluate("document.fonts.ready");
  await p.emulateMedia({ media: "print" });
  const f = fit ? (await p.evaluate(FIT_JS)) as Got["fit"] : [];
  const fill = (await p.evaluate(FILL_JS)) as Got["fill"];
  const fonts = (await p.evaluate(FONT_JS)) as Got["fonts"];
  await p.pdf({ path: pdf, format: "A4", printBackground: true, preferCSSPageSize: true });
  await p.close();
  return { fit: f, fill, fonts };
}
const pageCount = (pdf: string) => Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [pdf]).toString())![1]);

async function one(TAG: string, ID: string, b: Awaited<ReturnType<typeof chromium.launch>>) {
  const r = await load(ID);
  if (r.companies.length) throw new Error("기업 목록이 비어 있지 않다");
  const e = edit8(r);
  const r5 = pages9(e);
  const toc = J("data/report-gm/biz-pro-toc.v1.json");
  const keep = new Set([1, 2, 79, 80, ...KEEP9]); // 79 는 full6 가 늘 그리므로 차례에 둔다(이 판에는 넣지 않는다)
  const lib: Lib = {
    toc: { ...toc, pages: toc.pages.filter((p: { n: number }) => keep.has(p.n)) },
    dart: J("data/region/dart-checks.v1.json"), overview: J("data/region/dart-overview.v1.json"),
    roles: J("data/report-gm/biz-role-guide.json"), orgs: { ...J("data/region/kr-chungcheong-orgs.v2.json"), orgs: [] },
    domains: r.map.map((m) => ({ code: m.code, name: m.name })), versions: r.versions,
  };
  const out6 = full6(r, lib, { href: "fonts/pretendard", family: "Pretendard" });
  const css6 = /<style>([\s\S]*?)<\/style>/.exec(out6.html)![1];
  const v9 = new Map<number, { title: string; html: string }>();
  for (const m of out6.html.matchAll(/<section class="pg[^"]*"[^>]*data-page="(\d+)"[\s\S]*?<\/section>/g)) {
    const n = Number(m[1]); const t = out6.pages.find((x) => x.n === n)?.title;
    if (t && KEEP9.includes(n)) v9.set(n, { title: t, html: m[0] });
  }
  const plan0 = plan10(e, r5, v9);
  const tmp = path.join(WORK, `long-${TAG}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  /* 1차: 합치기 전 쪽마다 글이 닿는 높이를 잰다 */
  const c0 = await print(b, v9Doc(e, plan0, css6, { href: "fonts/pretendard" }), `long-${TAG}-v9-0`, path.join(tmp, "v9-0.pdf"), true);
  const reach = new Map(c0.fill.map((x) => [x.key, (c0.fit.find((f) => f.key === x.key)?.over ?? 0) > 0 ? 100 : x.reach]));
  /* 2차: 반쪽이 빈 이웃 쪽을 합치고, 합친 쪽이 넘치면 그 짝만 다시 가른다 */
  if (process.env.DEBUG_REACH) console.log([...reach]);
  const undo = new Set<string>();
  let plan: LongPage[] = [], c: Got = c0;
  for (let k = 0; k < 4; k++) {
    plan = merge10(plan0.map((p) => ({ ...p })), reach, 92, undo);
    c = await print(b, v9Doc(e, plan, css6, { href: "fonts/pretendard" }), `long-${TAG}-v9`, path.join(tmp, "v9.pdf"), true);
    const bad = plan.filter((p) => p.more?.length && (c.fit.find((f) => f.key === p.key)?.over ?? 0) > 0);
    if (!bad.length) break;
    for (const p of bad) undo.add(p.key);
  }
  const merged = plan.filter((p) => p.more?.length);
  const a = await print(b, r5Doc(e, r, plan, { sans: "fonts/pretendard" }), `long-${TAG}-r5`, path.join(tmp, "r5.pdf"), false);
  const nR5 = plan.filter((p) => p.src === "r5").length, nV9 = plan.filter((p) => p.src === "v9").length;
  const okCount = pageCount(path.join(tmp, "r5.pdf")) === nR5 && pageCount(path.join(tmp, "v9.pdf")) === nV9;
  /* 쪽마다 떼어 붙이면(pdfseparate · pdfunite) 쪽마다 글꼴이 한 벌씩 들어가 한 권이 17MB 가 된다.
     같은 원본에서 온 쪽은 글꼴 개체를 함께 쓰도록 pypdf 로 차례만 바꿔 붙인다. */
  const order = plan.map((p) => p.src === "r5" ? "a" : "b").join("");
  mkdirSync(OUT, { recursive: true });
  const pdf = path.join(OUT, `${TAG}.pdf`);
  execFileSync("python3", ["-I", "-c", `
import sys
from pypdf import PdfReader, PdfWriter
a, b, order, out = PdfReader(sys.argv[1]), PdfReader(sys.argv[2]), sys.argv[3], sys.argv[4]
w, ia, ib = PdfWriter(), 0, 0
for c in order:
    if c == "a": w.add_page(a.pages[ia]); ia += 1
    else: w.add_page(b.pages[ib]); ib += 1
w.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
with open(out, "wb") as f: w.write(f)
`, path.join(tmp, "r5.pdf"), path.join(tmp, "v9.pdf"), order, pdf]);
  const pages = pageCount(pdf);
  const dir = path.join(OUT, "pages", TAG); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  execFileSync("pdftoppm", ["-r", "60", "-png", pdf, path.join(dir, "p")]);
  for (const fn of readdirSync(dir)) { const m = /^p-0*(\d+)\.png$/.exec(fn); if (m && fn !== `p-${m[1].padStart(2, "0")}.png`) execFileSync("mv", [path.join(dir, fn), path.join(dir, `p-${m[1].padStart(2, "0")}.png`)]); }

  /* 검사 */
  const fit = [...a.fit, ...c.fit]; const fill = [...a.fill, ...c.fill]; const fonts = [...a.fonts, ...c.fonts];
  const over = fit.filter((x) => x.over > 0);
  const zoomed = fit.filter((x) => x.zoom < 1);
  const small = fonts.filter((x) => x.pt < 8.5 - 0.01);
  const serif = fonts.filter((x) => /serif/i.test(x.family.replace(/sans-serif/gi, "")));
  const pf = execFileSync("pdffonts", [pdf]).toString().split("\n").slice(2).filter((l) => /Serif|Myeongjo|Batang/i.test(l));
  const perPage = plan.map((p) => ({ p, txt: execFileSync("pdftotext", ["-f", String(p.i), "-l", String(p.i), "-layout", pdf, "-"]).toString() }));
  const hits = (ws: string[]) => perPage.flatMap(({ p, txt }) => ws.filter((w) => txt.includes(w)).map((w) => `${p.i}쪽(${p.title}) ‘${w}’`));
  const forb = hits(FORBIDDEN), tmpl = hits(TEMPLATE), asrt = hits(ASSERT);
  const poorStrength = TAG === "POOR" ? perPage.filter(({ txt }) => /강점/.test(txt)).map(({ p }) => `${p.i}쪽`) : [];
  const low = fill.filter((x) => x.key !== "cover" && !x.key.startsWith("div-") && x.reach < 60);
  const fails = [!okCount && "쪽 수 어긋남", over.length && "넘침", small.length && "8.5pt 아래", serif.length + pf.length && "명조", forb.length && "금지어", tmpl.length && "상투", asrt.length && "단정", poorStrength.length && "POOR 강점"].filter(Boolean);
  const keyOf = (k: string) => plan.find((p) => p.key === k);
  const lines = [
    `## ${TAG} (응시 ${ID} · ${r.kind} · 목표 ${r.strategy.roleName})`, "",
    `- 쪽 수 **${pages}** (R5 쪽 ${nR5} · v9 내용 쪽 ${nV9} · 꼭지 ${plan.reduce((t, p) => t + 1 + (p.more?.length ?? 0), 0)}) · 장 7 · 기업 목록 ${r.companies.length}곳(빈 목록으로 읽음)`,
    `- 반쪽이 빈 이웃 쪽을 합친 곳 ${merged.length ? merged.map((p) => `${p.i}쪽(설계 ${[p.n9, ...p.more!.map((m) => m.n9)].join("+")})`).join(", ") : "없음"}${undo.size ? ` · 합치면 넘쳐 다시 가른 곳 ${undo.size}` : ""}`,
    `- 넘침 ${over.length ? over.map((x) => `${keyOf(x.key)?.i}쪽 ${x.over}px`).join(", ") : "0 · PASS"} · 글을 줄인 쪽 ${zoomed.length ? zoomed.map((x) => `${keyOf(x.key)?.i}쪽 ${Math.round(x.zoom * 100)}%`).join(", ") : "없음"}`,
    `- 8.5pt 아래 ${small.length ? `FAIL ${small.length} — ${[...new Set(small.map((x) => `${keyOf(x.key)?.i}쪽 ${x.pt}pt ‘${x.text}’`))].slice(0, 8).join(" · ")}` : "0 · PASS"} · 가장 작은 ${Math.min(...fonts.map((x) => x.pt))}pt`,
    `- 명조(계산된 글꼴 · PDF 글꼴 목록) ${serif.length + pf.length ? "FAIL" : "0 · PASS"}`,
    `- 금지어 ${forb.length ? "FAIL " + forb.join(" · ") : "0 · PASS"}`,
    `- 상투 문장 ${tmpl.length ? "FAIL " + tmpl.join(" · ") : "0 · PASS"}`,
    `- 단정 표현 ${asrt.length ? "FAIL " + asrt.join(" · ") : "0 · PASS"}${TAG === "POOR" ? ` · POOR ‘강점’ ${poorStrength.length ? "FAIL " + poorStrength.join(", ") : "0 · PASS"}` : ""}`,
    `- 아래가 빈 쪽(글이 쪽 높이 60% 앞에서 끝남 · 보고) ${low.length ? low.map((x) => `${keyOf(x.key)?.i}쪽 ${x.reach}%`).join(", ") : "없음"}`, "",
    "| 쪽 | 장 | 출처 | 제목 | 쪽 문법 | 글이 닿는 높이 |", "|---|---|---|---|---|---|",
    ...plan.map((p) => `| ${p.i} | ${p.chap || "—"} | ${p.src === "r5" ? "R5" : `v9 설계 ${[p.n9, ...(p.more ?? []).map((m) => m.n9)].join("+")}`} | ${[p.title, ...(p.more ?? []).map((m) => m.title)].join(" / ")} | ${p.grammar} | ${fill.find((x) => x.key === p.key)?.reach ?? "—"}% |`), "",
  ];
  console.log(`${TAG} ${ID} → ${pdf} · ${pages}쪽 · 걸림 ${fails.length ? fails.join(", ") : "0"}`);
  return { TAG, pages, plan, fails, md: lines.join("\n") };
}

async function main() {
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const res = [];
  for (const [TAG, ID] of CASES) res.push(await one(TAG, ID, b));
  await b.close();
  const bad = res.filter((x) => x.fails.length);
  writeFileSync(path.join(OUT, "LINT_LONG.md"), [
    `# R5 긴 판 검사 (${new Date().toISOString().slice(0, 10)})`, "",
    `걸린 사례 ${bad.length} / ${res.length} · 쪽 수 ${res.map((x) => `${x.TAG} ${x.pages}`).join(" · ")}`, "",
    "자동 검사는 디자인 PASS 가 아니다. 사람 검수는 `../02_HUMAN_REVIEW.md`.", "",
    "## 이 판에 넣지 않은 v9 쪽", "", "| 설계 | 까닭 |", "|---|---|", ...DROP9.map((d) => `| ${d.ns} | ${d.why} |`), "",
    ...res.map((x) => x.md),
  ].join("\n"));
  process.exit(bad.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
