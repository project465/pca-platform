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

/**
 * 종이에도 내부 코드가 없어야 한다.
 *
 * 화면만 재던 동안 `TR_TAG_1` 이 **종이로도** 나갔다. 그 자리는 상담에서
 * 손에 들리는 쪽이라 화면보다 오래 남는다. 그래서 뽑은 다음에 글자를 다시
 * 꺼내 센다(`pdftotext`). 한글은 글꼴에 따라 깨져 나올 수 있지만, 우리가
 * 찾는 것은 라틴 글자와 밑줄이라 그대로 걸린다.
 */
const INTERNAL = [
  /\bTD\d{2}\b/, /\bJ[1-8]\b/, /\bOC[1-7]\b/,
  /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/,
  /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/,
  /\bZ[1-4]\b/, /NOT_OBSERVED|PARTICIPATED|CONFIRMED|OWNED|NOT_EXPLORED/,
  /\b(?:undefined|null|NaN|TODO|TBD)\b/,
];

/**
 * 등급마다 몇 쪽이 알맞은가. 쪽수가 목표가 아니라 **한 쪽의 완성도**다.
 *
 * 이 범위는 결과지가 일곱 절이던 때에 적어 둔 값이라 아홉 절이 된 뒤로
 * 세 등급 모두 넘고 있었다. **본문을 깎아 옛 범위에 맞추지 않는다**:
 * 늘어난 두 절은 일부러 더한 것이다. 지금 뽑히는 쪽수로 옮긴다.
 */
const PAGES = { r1_basic: [4, 5], r2_standard: [8, 9], r3_pro: [11, 12] };

/**
 * 빈 쪽을 세는 선.
 *
 * 가운데 쪽이 손바닥만 하면 그 쪽은 비어 보인다. **마지막 쪽은 다르다**:
 * 어느 문서든 마지막 쪽은 남은 만큼만 차고, 여기에는 결과 기준 안내 두
 * 줄이 선다. 그래서 마지막 쪽은 **머리글밖에 없을 때만** 빈 쪽으로 센다.
 */
const THIN = 120, THIN_LAST = 40;

/** 쪽 하나의 글자. `pdftotext` 가 없으면 빈 글자를 돌려준다 */
function pageText(file, n) {
  try {
    return execFileSync("pdftotext", ["-f", String(n), "-l", String(n), file, "-"],
      { encoding: "utf8" });
  } catch {
    return "";
  }
}

const B = process.env.UI_BASE ?? "http://127.0.0.1:3100";
const OUT = "docs/metri/shots/v3r";
mkdirSync(OUT, { recursive: true });

const plan = JSON.parse(process.argv[2]
  ? readFileSync(process.argv[2], "utf8")
  : execFileSync("npx", ["tsx", "scripts/v3-result-prep.ts"], { encoding: "utf8" }));
/* 열쇠는 준비 쪽이 넘긴다. 여기 적지 않는다 */

const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
{
  const { loginAs } = await import("./_shot-identity.mjs");
  await loginAs(ctx, plan.users.shots, B);
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

  /* 뽑은 종이에서 글자를 다시 꺼내 **내부 코드와 빈 쪽**을 센다 */
  const perPage = [];
  for (let n = 1; n <= pages; n += 1) perPage.push(pageText(file, n));
  const all = perPage.join("\n");
  for (const re of INTERNAL) {
    const hit = (all.match(re) ?? [])[0];
    if (hit) problems.push(`${t.name}: 종이에 내부 코드 — ${hit}`);
  }
  /* 글자 수로 빈 쪽을 잰다. 마지막 쪽이 손바닥만 하면 그 쪽이 회색 바닥이
     된다. 한글이 안 뽑히는 환경에서는 글자가 0 이라 재지 않는다 */
  const len = perPage.map((x) => x.replace(/\s+/g, "").length);
  const thin = all.replace(/\s+/g, "").length > 200
    ? len.map((n, i) => [i + 1, n])
        .filter(([i, n]) => n < (i === len.length ? THIN_LAST : THIN))
        .map(([i]) => i)
    : [];
  if (thin.length) problems.push(`${t.name}: ${thin.join("·")}쪽이 거의 비어 있다`);
  const want = PAGES[t.name];
  if (want && (pages < want[0] || pages > want[1])) {
    problems.push(`${t.name}: ${pages}쪽 — ${want[0]}~${want[1]}쪽으로 맞춘다`);
  }

  log.push(`${t.name.padEnd(14)} ${String(pages).padStart(2)}쪽 · `
    + `${Math.round(bytes / 1024)}KB · 쪽별 글자 ${len.join("/")}`);
  if (pages < 1) problems.push(`${t.name}: 쪽이 없다`);
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
