/**
 * **PDF GOLD MASTER 미리보기.** 굳은 결과 하나를 새 PDF 전용 템플릿으로 뽑는다.
 * 운영 PDF 경로(`/v3/{id}/result/pdf`)는 건드리지 않는다.
 *
 *   CASES=RICH:457,POOR:458,CONTRA:431 npx tsx scripts/lab/gm-report.ts
 *
 * 두 번 뽑는다: 첫 판에서 장마다 몇 쪽에서 시작하는지 읽고 그 쪽 번호를 차례에
 * 적어 다시 뽑는다.
 *
 * 글꼴: 이 컨테이너에는 한글 굵은 판이 없다. `npm pack @fontsource/noto-sans-kr@5.1.1`
 * 의 400·500·700 css 와 woff2 를 `var/pdf-gm/fonts/` 에 두면 그것을 쓴다(저장소에
 * 넣지 않는다). 없으면 깔린 글꼴로 떨어진다.
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
import { assemble } from "../../src/lib/me-v3/report-gm/assemble";
import { CHAPTERS, footerHtml, headerHtml, renderReport } from "../../src/lib/me-v3/report-gm/render";

const WORK = path.resolve("var/pdf-gm");
const OUT = process.env.OUT ?? "docs/metri/review/pdf-gm/after";
const CASES = (process.env.CASES ?? "RICH:457,POOR:458,CONTRA:431").split(",").map((x) => x.split(":"));

async function print(html: string, file: string, header: string): Promise<void> {
  const tmp = path.join(WORK, path.basename(file, ".pdf") + ".html");
  writeFileSync(tmp, html);
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.goto("file://" + tmp, { waitUntil: "load" });
  await p.evaluate(() => (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready);
  await p.pdf({ path: file, format: "A4", printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: header, footerTemplate: footerHtml() });
  await b.close();
}

function chapterPages(file: string): Record<string, number> {
  const n = Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [file]).toString())![1]);
  const out: Record<string, number> = {};
  for (let i = 2; i <= n; i++) {
    const t = execFileSync("pdftotext", ["-f", String(i), "-l", String(i), "-layout", file, "-"]).toString();
    for (const [no, title] of CHAPTERS) {
      if (out[no]) continue;
      const head = title.slice(0, 8);
      if (new RegExp(`^\\s*${no}\\s+${head.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m").test(t)) out[no] = i;
    }
  }
  return out;
}

async function main(): Promise<void> {
  mkdirSync(WORK, { recursive: true }); mkdirSync(OUT, { recursive: true });
  for (const [tag, id] of CASES) {
    const row = await queryOne<{ result_model: ResultModel; tier: string }>(
      `SELECT s.result_model, a.tier FROM v3_snapshots s JOIN v3_attempts a ON a.id = s.attempt_id
        WHERE s.attempt_id = $1 ORDER BY s.created_at DESC LIMIT 1`, [id]);
    if (!row) throw new Error(`${id}: 굳은 결과가 없다`);
    const core = coreOf(row.result_model);
    const meta = await resultMeta(id, core);
    const r = assemble(row.result_model, { ...meta, tier: row.tier });
    writeFileSync(path.join(WORK, `${tag}.report.json`), JSON.stringify(r, null, 1));
    const file = path.join(OUT, `BIZ-GM-${tag}.pdf`);
    await print(renderReport(r, { fontsHref: "fonts" }), file, headerHtml(r));
    const pages = chapterPages(file);
    await print(renderReport(r, { fontsHref: "fonts", pages }), file, headerHtml(r));
    const n = /Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [file]).toString())![1];
    console.log(`${tag} ${id} → ${file} · ${n}쪽 · 장 ${JSON.stringify(pages)}`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
