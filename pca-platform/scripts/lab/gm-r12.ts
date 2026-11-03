/**
 * R6 문서판을 뽑는다: 세 사례 × (표식 판 → 쪽 번호 찾기 → 본 판) → PDF · 쪽 그림 · 검사.
 *   DATABASE_URL=postgres:///cm_dev V3_PREVIEW_OPEN='*' OUT=docs/metri/review/r6/pdf npx tsx scripts/lab/gm-r12.ts
 * 기업 자료는 읽지 않는다(빈 목록). 글꼴은 var/pdf-gm/fonts/pretendard/.
 */
import path from "node:path";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { chromium } from "playwright";
import { queryOne, query } from "../../src/lib/db";
import { coreOf, type ResultModel } from "../../src/lib/me-v3/result/model";
import { resultMeta } from "../../src/lib/me-v3/result/meta";
import { experiencesOf } from "../../src/lib/me-v3/platform";
import { build3 } from "../../src/lib/me-v3/report-gm/report3";
import type { OrgSet2 } from "../../src/lib/me-v3/report-gm/companies";
import { edit8 } from "../../src/lib/me-v3/report-gm/editorial8";
import { render12, type Doc12, type RawResponse, type RawPick } from "../../src/lib/me-v3/report-gm/render12";

const CASES = (process.env.CASES ?? "RICH:1,POOR:2,CONTRA:3").split(",").map((x) => x.split(":") as [string, string]);
const WORK = path.resolve("var/pdf-gm");
const OUT = process.env.OUT ?? "docs/metri/review/r6/pdf";
const EMPTY: OrgSet2 = { schema: "none", checked_on: "", status: "EXCLUDED", note: "R6 문서판: 기업 자료를 읽지 않는다", region_facts: [], orgs: [] };

const FORBIDDEN = ["DART", "OpenDART", "전자공시", "공시", "사업보고서", "반기보고서", "분기보고서", "매출액", "영업이익", "순이익", "재무제표", "접수번호", "사업자등록번호", "법인등록번호", "KODATA", "(주)", "주식회사", "확인 수준", "적합도", "합격률", "합격 가능", "채용 확률", "연봉", "지역 기업"];
const TEMPLATE = ["로 해석할 수 있습니다", "으로 해석할 수 있습니다", "확인할 필요가 있습니다", "현재 결과에서는", "가능성을 보여줍니다", "활용할 수 있습니다", "이 보고서는", "보여줍니다", "연결될 수 있습니다", "중요합니다", "확인해볼 필요", "역량을 강화", "성장 방향", "핵심 포인트", "강점이 드러납니다", "Evidence", "Insight", "Summary"];
const ASSERT = ["강점입니다", "능력이 있습니다", "역량이 있습니다", "잘합니다", "뛰어납니다", "갖추고 있습니다", "경험이 있습니다", "강점 세 가지", "지금 강한 쪽"];
const FONT_JS = `(() => { let min = 99, at = ""; for (const el of document.querySelectorAll("body *")) {
  if (el.classList.contains("mk")) continue;
  const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim(); if (!own) continue;
  const cs = getComputedStyle(el); const pt = parseFloat(cs.fontSize) * 0.75; if (pt < min) { min = pt; at = own.slice(0, 20); }
  if (/serif|Myeongjo|Batang/i.test(cs.fontFamily) && !/sans/i.test(cs.fontFamily)) return { min: -1, at: cs.fontFamily }; }
  return { min: Math.round(min * 100) / 100, at }; })()`;

async function load(id: string): Promise<Omit<Doc12, "fonts">> {
  const row = await queryOne<{ result_model: ResultModel; tier: string; user_id: string }>(
    `SELECT s.result_model, a.tier, a.user_id::text FROM v3_snapshots s JOIN v3_attempts a ON a.id = s.attempt_id WHERE s.attempt_id = $1 ORDER BY s.created_at DESC LIMIT 1`, [id]);
  if (!row) throw new Error(`${id}: 굳은 결과가 없다`);
  const core = coreOf(row.result_model);
  const meta = await resultMeta(id, core);
  const exps = await experiencesOf(row.user_id, core);
  const r = build3(row.result_model, { ...meta, tier: row.tier }, exps, EMPTY);
  if (r.companies.length) throw new Error("기업 목록이 비어 있지 않다");
  const responses = await query<RawResponse>(`SELECT item_id, kind, value_int, value_text, answered_at, change_count FROM v3_responses WHERE attempt_id = $1 ORDER BY answered_at, item_id`, [id]);
  const picks = await query<RawPick>(`SELECT domain_code, slot, item_text FROM v3_evidence_picks WHERE attempt_id = $1`, [id]);
  return { r, e: edit8(r), model: row.result_model, core, stage: (row.result_model as unknown as { stage?: string }).stage ?? "bachelor", responses, picks };
}

async function print(b: Awaited<ReturnType<typeof chromium.launch>>, html: string, name: string, pdf: string) {
  const file = path.join(WORK, name + ".html"); writeFileSync(file, html);
  const p = await b.newPage();
  await p.goto("file://" + file, { waitUntil: "load" }); await p.evaluate("document.fonts.ready");
  await p.emulateMedia({ media: "print" });
  const font = (await p.evaluate(FONT_JS)) as { min: number; at: string };
  await p.pdf({ path: pdf, format: "A4", printBackground: true, preferCSSPageSize: true });
  await p.close();
  return font;
}
const pageTexts = (pdf: string) => execFileSync("pdftotext", ["-layout", pdf, "-"]).toString().split("\f");

(async () => {
  mkdirSync(WORK, { recursive: true }); mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const report: string[] = [`# R6 문서판 검사 (${new Date().toISOString().slice(0, 10)})`, "", "자동 검사는 디자인 PASS 가 아니다.", ""];
  for (const [TAG, ID] of CASES) {
    const d0 = { ...(await load(ID)), fonts: { href: "fonts/pretendard" } };
    const tmp = path.join(WORK, `r12-${TAG}-mk.pdf`);
    const first = render12({ ...d0, marks: true });
    await print(b, first.html, `r12-${TAG}-mk`, tmp);
    const pages: Record<string, number> = {};
    pageTexts(tmp).forEach((t, i) => { for (const m of t.matchAll(/\[\[([a-z0-9]+)\]\]/g)) pages[m[1]] ??= i + 1; });
    const fin = render12({ ...d0, pages });
    const pdf = path.join(OUT, `${TAG}.pdf`);
    const font = await print(b, fin.html, `r12-${TAG}`, pdf);
    const txt = pageTexts(pdf); const all = txt.join("\n");
    const n = txt.filter((t) => t.trim()).length;
    const miss = fin.toc.filter((s) => !pages[s.id]).map((s) => s.title);
    const hit = (ws: string[]) => ws.filter((w) => all.includes(w));
    const fails: string[] = [];
    if (hit(FORBIDDEN).length) fails.push(`금지어 ${hit(FORBIDDEN).join(", ")}`);
    if (hit(TEMPLATE).length) fails.push(`상투 ${hit(TEMPLATE).join(", ")}`);
    if (hit(ASSERT).length) fails.push(`단정 ${hit(ASSERT).join(", ")}`);
    if (font.min < 8.5) fails.push(`8.5pt 아래 ${font.min} (${font.at})`);
    if (/\[\[[a-z0-9]+\]\]/.test(all)) fails.push("표식 글자가 남음");
    if (miss.length) fails.push(`차례 쪽 번호를 못 찾음 ${miss.length}`);
    if (TAG === "POOR" && all.includes("강점")) fails.push("POOR 강점");
    const dir = path.join(OUT, "pages", TAG); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
    execFileSync("pdftoppm", ["-r", "60", "-png", pdf, path.join(dir, "p")]);
    for (const fn of readdirSync(dir)) { const m = /^p-0*(\d+)\.png$/.exec(fn); if (m && fn !== `p-${m[1].padStart(2, "0")}.png`) execFileSync("mv", [path.join(dir, fn), path.join(dir, `p-${m[1].padStart(2, "0")}.png`)]); }
    const ait = JSON.parse(execFileSync("python3", ["-I", "scripts/lab/gm_aitell.py", pdf]).toString())[0];
    console.log(`${TAG} ${ID} → ${pdf} · ${n}쪽 · 걸림 ${fails.length}${fails.length ? " · " + fails.join(" / ") : ""}`);
    report.push(`## ${TAG} (응시 ${ID})`, "", `- 쪽 수 **${n}** · 가장 작은 글자 ${font.min}pt · 차례 항목 ${fin.toc.length}`, `- 걸림 ${fails.length}${fails.length ? ": " + fails.join(" / ") : ""}`,
      `- AI 버릇(한글 1000자당): 띄운 가운뎃점 ${ait.sep} · 화살표 ${ait.arrow} · 동그라미 숫자 ${ait.circled} · 기호 ${ait.sym} · 대시 ${ait.dash} · 영어 라벨 ${ait.latin} · 세 쪽 넘게 되풀이된 문장 ${ait.dup3} · 토막 줄 비율 ${ait.short_line_ratio}`, "");
  }
  await b.close();
  writeFileSync(path.join(OUT, "LINT_R6.md"), report.join("\n") + "\n");
  process.exit(0);
})();
