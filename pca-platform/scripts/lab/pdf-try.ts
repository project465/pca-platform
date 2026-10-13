/**
 * 떠 둔 쪽에 CSS 를 덧대어 종이를 뽑고 **쪽마다 글자 수와 마지막 쪽이
 * 얼마나 찼는지**를 센다.
 *
 *   npx tsx scripts/lab/pdf-try.ts var/pdf-lab/x.html [덧댈.css]
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

async function main(): Promise<void> {
  const [file, extra] = process.argv.slice(2);
  if (!file) throw new Error("쪽 파일이 필요하다");
  const add = extra && existsSync(extra) ? readFileSync(extra, "utf8") : "";
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const p = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await p.goto(`file://${process.cwd()}/${file}`, { waitUntil: "load" });
  if (add) await p.addStyleTag({ content: add });
  await p.emulateMedia({ media: "print" });
  const pdf = await p.pdf({
    format: "A4", printBackground: true, preferCSSPageSize: false,
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:7pt;color:#5f6e86;width:100%;'
      + 'padding:0 14mm;font-family:sans-serif">CareerMatri</div>',
    footerTemplate: '<div style="font-size:7pt;color:#5f6e86;width:100%;'
      + 'padding:0 14mm;text-align:right;font-family:sans-serif">'
      + '<span class="pageNumber"></span>/<span class="totalPages"></span></div>',
    margin: { top: "14mm", bottom: "14mm", left: "14mm", right: "14mm" },
  });
  const out = "var/pdf-lab/try.pdf";
  writeFileSync(out, pdf);
  const raw = readFileSync(out, "latin1");
  const pages = (raw.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  const per: number[] = [];
  for (let n = 1; n <= pages; n += 1) {
    const t = execFileSync("pdftotext", ["-f", String(n), "-l", String(n), out, "-"],
      { encoding: "utf8" });
    per.push(t.replace(/\s+/g, "").length);
  }
  /* **글자 수는 얼마나 찼는지를 말하지 않는다.** 활자가 큰 쪽은 글자가
     적어도 꽉 차 있다. 그래서 글자의 아래쪽 좌표를 읽어 **세로로 어디까지
     찼는지**를 센다. 쪽머리와 쪽수는 여백 안에 찍히므로 글 자리 밖이다 */
  const bbox = execFileSync("pdftotext", ["-bbox", out, "-"], { encoding: "utf8" });
  const fill: number[] = [];
  for (const pg of bbox.split("<page").slice(1)) {
    const h = Number(/height="([\d.]+)"/.exec(pg)?.[1] ?? 842);
    const top = h * 0.047, bot = h * 0.955;
    let low = top;
    for (const m of pg.matchAll(/yMax="([\d.]+)"/g)) {
      const y = Number(m[1]);
      if (y > top && y < bot && y > low) low = y;
    }
    fill.push(Math.round(((low - top) / (bot - top)) * 100));
  }
  const last = per[per.length - 1] ?? 0;
  console.log(`${pages}쪽 · 글자 ${per.join("/")} · 찬 비율 ${fill.join("/")}% · `
    + `마지막 ${last}자 ${fill[fill.length - 1]}%`);
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
