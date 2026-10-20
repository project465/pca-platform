/**
 * **PDF GOLD MASTER 2차 미리보기.** 운영 PDF 경로(`/v3/{id}/result/pdf`)는 건드리지 않는다.
 *
 *   CASES=RICH:462,POOR:463,CONTRA:464 npx tsx scripts/lab/gm-report2.ts
 *
 * 세 번 뽑는다: ① 본문만 뽑아 쪽마다 어느 장인지 읽고 ② 그 쪽 번호를 차례에 적어
 * 다시 뽑고 ③ 쪽마다 머리말·섹션명·쪽 번호를 그린 덧판을 겹친다(pypdf).
 * 글꼴: Pretendard 1.3.9 (OFL-1.1) 를 `var/pdf-gm/fonts/pretendard/` 에 둔다(저장소에 넣지 않는다).
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { load } from "./gm-dump2";
import { render2, overlayHtml, SECTIONS } from "../../src/lib/me-v3/report-gm/render2";

const WORK = path.resolve("var/pdf-gm");
const OUT = process.env.OUT ?? "docs/metri/review/pdf-gm/v2";
const FONTS = "fonts/pretendard";
const CASES = (process.env.CASES ?? "RICH:462,POOR:463,CONTRA:464").split(",").map((x) => x.split(":"));

async function print(html: string, file: string, name: string): Promise<void> {
  const tmp = path.join(WORK, name + ".html");
  writeFileSync(tmp, html);
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.goto("file://" + tmp, { waitUntil: "load" });
  await p.evaluate(() => (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready);
  await p.pdf({ path: file, format: "A4", printBackground: true, preferCSSPageSize: true });
  await b.close();
}
const pagesOf = (f: string) => Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [f]).toString())![1]);

/** 쪽마다 어느 장인지: 장 머리(`NN 제목`)가 선 쪽부터 다음 장 머리 전까지 */
function sectionsByPage(file: string): { starts: Record<string, number>; per: string[] } {
  const n = pagesOf(file);
  const starts: Record<string, number> = {};
  const per: string[] = ["표지"];
  let cur = "표지";
  for (let i = 2; i <= n; i++) {
    const t = execFileSync("pdftotext", ["-f", String(i), "-l", String(i), "-layout", file, "-"]).toString();
    for (const [no, title] of SECTIONS) {
      if (starts[no]) continue;
      const head = title.slice(0, 6).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`^\\s*${no}\\s+${head}`, "m").test(t)) { starts[no] = i; cur = `${no} ${title}`; }
    }
    per.push(cur);
  }
  return { starts, per };
}

async function main(): Promise<void> {
  mkdirSync(WORK, { recursive: true }); mkdirSync(OUT, { recursive: true });
  for (const [tag, id] of CASES) {
    const r = await load(id);
    writeFileSync(path.join(WORK, `${tag}.r2.json`), JSON.stringify(r, null, 1));
    const body = path.join(WORK, `BIZ-GM-${tag}.body.pdf`);
    await print(render2(r, { fontsHref: FONTS }), body, `BIZ-GM-${tag}`);
    let s = sectionsByPage(body);
    await print(render2(r, { fontsHref: FONTS, pages: s.starts }), body, `BIZ-GM-${tag}`);
    s = sectionsByPage(body);
    const over = path.join(WORK, `BIZ-GM-${tag}.over.pdf`);
    await print(overlayHtml(r, s.per, FONTS), over, `BIZ-GM-${tag}.over`);
    const file = path.join(OUT, `BIZ-GM-${tag}.pdf`);
    execFileSync("python3", ["scripts/lab/gm-stamp.py", body, over, file]);
    writeFileSync(path.join(WORK, `${tag}.pages.json`), JSON.stringify(s, null, 1));
    console.log(`${tag} ${id} → ${file} · ${pagesOf(file)}쪽 · 장 ${JSON.stringify(s.starts)}`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
