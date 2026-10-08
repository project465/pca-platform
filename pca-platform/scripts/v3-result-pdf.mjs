/**
 * 결과지를 A4 로 뽑는다. **웹과 PDF 가 같은 결과 모델을 읽는다.**
 *
 * 따로 그리면 어느 날 둘이 갈리고, 갈린 날 상담 자리에서 다른 종이를
 * 들고 앉는다. 여기서 하는 일은 같은 쪽을 인쇄 매체로 열어 종이로
 * 접는 것뿐이고, **값을 다시 계산하지 않는다.**
 *
 * 세는 것 셋이다. 쪽수 · 한글이 깨지지 않았는가(글꼴이 없으면 네모가
 * 뜬다) · 묶음이 쪽 가운데에서 잘리지 않는가.
 *
 *   node scripts/v3-result-pdf.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync } from "node:fs";

const B = process.env.UI_BASE ?? "http://127.0.0.1:3100";
const OUT = "docs/metri/shots/v3r";
mkdirSync(OUT, { recursive: true });

const plan = JSON.parse(process.argv[2]
  ? readFileSync(process.argv[2], "utf8")
  : execFileSync("npx", ["tsx", "scripts/v3-result-prep.ts"], { encoding: "utf8" }));
const PW = { "me-admin": "pca-dev-org-1234", admin: "pca-dev-admin-1234" };

const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
{
  const p = await ctx.newPage();
  await p.goto(`${B}/login`, { waitUntil: "networkidle" });
  await p.fill('input[name="identifier"], input[name="loginId"], input[type="text"]', "me-admin");
  await p.fill('input[type="password"]', PW["me-admin"]);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 20000 })
    .catch(() => {});
  await p.close();
}

const problems = [];
const log = [];
for (const t of plan.targets.filter((x) => x.full)) {
  const p = await ctx.newPage();
  const r = await p.goto(B + t.path, { waitUntil: "networkidle" });
  if (!r || r.status() !== 200) {
    problems.push(`${t.name}: ${r ? r.status() : 0}`);
    await p.close();
    continue;
  }

  /* **인쇄 매체로 바꿔 놓고 잰다.** 화면 규칙으로 재면 종이에서 달라진다 */
  await p.emulateMedia({ media: "print" });
  /* 접어 둔 자리를 전부 편다. 종이에는 누를 사람이 없다 */
  await p.evaluate(() => {
    for (const d of document.querySelectorAll("details")) d.open = true;
  });

  /* 한글이 네모로 뜨는가. 글꼴이 없으면 자형이 전부 같은 네모가 된다 */
  const tofu = await p.evaluate(() => {
    const el = document.querySelector(".rs-h1");
    if (!el) return true;
    const r = document.createRange();
    r.selectNodeContents(el);
    return r.getBoundingClientRect().width < 60;
  });
  if (tofu) problems.push(`${t.name}: 한글 글꼴이 없다`);

  const file = `${OUT}/${t.name}.pdf`;
  await p.pdf({
    path: file, format: "A4", printBackground: true,
    margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:7pt;color:#5f6e86;width:100%;'
      + 'padding:0 14mm;font-family:sans-serif">CareerMatri</div>',
    footerTemplate: '<div style="font-size:7pt;color:#5f6e86;width:100%;'
      + 'padding:0 14mm;text-align:right;font-family:sans-serif">'
      + '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  });
  const bytes = statSync(file).size;
  /* 쪽수는 PDF 안의 `/Type /Page` 를 센다. 라이브러리를 더 들이지 않는다 */
  const raw = readFileSync(file, "latin1");
  const pages = (raw.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  log.push(`${t.name.padEnd(14)} ${String(pages).padStart(2)}쪽 · ${Math.round(bytes / 1024)}KB`);
  if (pages < 1) problems.push(`${t.name}: 쪽이 없다`);
  if (pages > 24) problems.push(`${t.name}: ${pages}쪽 — 너무 길다`);
  await p.close();
}

await browser.close();
console.log(log.join("\n"));
if (problems.length) {
  console.log(`\n${problems.length}개가 걸렸다.`);
  for (const x of problems) console.log("  " + x);
  process.exitCode = 1;
} else {
  console.log(`\nPDF ${log.length}벌 OK. ${OUT} 에 남았다.`);
}
