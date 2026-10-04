/**
 * 결과지 PDF 를 뽑는다.
 *
 * **브라우저로 그냥 찍지 않는다.** A4 여백을 따로 주고 머리말·꼬리말·쪽
 * 번호를 우리가 그린다. 브라우저가 붙이는 주소와 날짜는 `displayHeaderFooter`
 * 를 켜고 우리 틀로 덮어쓴다.
 *
 *   node scripts/v2-pdf.mjs
 */
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const ROOT = "sites/pca-platform";
const OUT = "docs/metri/shots/v2/pdf";
const PORT = 8242;
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png",
};
function serve() {
  return new Promise((ok) => {
    const s = createServer((req, res) => {
      const rel = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
      let f = join(ROOT, rel === "/" ? "index.html" : rel);
      if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
      if (!existsSync(f)) { res.writeHead(404); res.end("no"); return; }
      res.writeHead(200, { "content-type": MIME[extname(f)] || "text/plain; charset=utf-8" });
      res.end(readFileSync(f));
    });
    s.listen(PORT, "127.0.0.1", () => ok(s));
  });
}

const EVIDENCE = {
  kinds: ["course", "project", "tool"],
  courses: ["정역학", "재료역학", "유한요소해석", "기계요소설계"].map((n) => ({ n })),
  projects: [{
    id: "p1", title: "브래킷 경량화 캡스톤", type: "capstone",
    period: { start: "2025-03", end: "2025-12" }, team_size: "4",
    my_role: "구조 검토", objective: "강성 유지하며 무게 줄이기",
    what_i_did: "요구조건을 치수로 옮기고 하중 경로를 나눠 설계안 세 개를 비교했습니다",
    decisions_i_made: "가공비가 덜 오르는 쪽으로 리브 배치와 두께를 골랐습니다",
    tools: ["SolidWorks"], methods: ["하중 경로 분석", "메시 민감도", "수렴 확인"],
    outputs: ["도면", "해석 리포트"], result: "",
    measurable_result: "시험 결과 허용 응력 기준 대비 15% 여유",
    difficulty: "", what_changed: "최종 설계안으로 채택됐습니다", what_i_learned: "",
  }],
  tools: [
    { cat: "cad", name: "SolidWorks", level: "used", where: "", why: "형상안 비교",
      exp_id: "p1", decision: "리브 배치 선택", output: "도면",
      validation: "허용 응력 기준과 비교" },
    { cat: "cae", name: "ANSYS Mechanical", level: "used", where: "", why: "",
      exp_id: "", decision: "", output: "", validation: "" },
  ],
};

const FILL = (it, fam) => {
  const hit = fam.includes("ME_DESIGN_PRODUCT") || fam.includes("ME_CAE_SIM");
  if (it.construct === "actual_work_interest") return hit ? 5 : 2;
  if (it.construct === "exposure") return hit ? 4 : 2;
  if (it.construct === "learning_intent") return hit ? 5 : 2;
  return 4;
};

const srv = await serve();
const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox"] });
mkdirSync(OUT, { recursive: true });

/* 머리말과 꼬리말을 우리가 그린다. 주소도 브라우저 날짜도 안 들어간다 */
const HEADER = `<div style="width:100%;font-size:7pt;color:#76859b;
  font-family:'Pretendard',sans-serif;padding:0 14mm;
  display:flex;justify-content:space-between;letter-spacing:.06em">
  <span>CAREERMATRI</span><span>진로 결정 자료</span></div>`;
const FOOTER = `<div style="width:100%;font-size:7pt;color:#76859b;
  font-family:'Pretendard',sans-serif;padding:0 14mm;
  display:flex;justify-content:space-between">
  <span>합격 가능성이나 실력을 잰 값이 아닙니다</span>
  <span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;

async function run(tier, stage, name) {
  const c = await browser.newContext({ viewport: { width: 1180, height: 1000 } });
  const p = await c.newPage();
  const B = `http://127.0.0.1:${PORT}/v2.html`;
  await p.goto(B, { waitUntil: "networkidle" });
  await p.evaluate(() => { try { localStorage.clear(); } catch {} });
  await p.evaluate((e) => {
    const EV = window.PCAEvidence;
    EV.saveEvidence(Object.assign(EV.emptyEvidence(), e));
    EV.saveResearch([]);
    EV.saveTarget(Object.assign(EV.loadTarget(), { target_org_type: "private_company" }));
  }, EVIDENCE);
  await p.goto(`${B}?fresh=1&tier=${tier}&stage=${stage}`, { waitUntil: "networkidle" });
  await p.click("#v2ToStage"); await p.click("#v2ToQ");
  let g = 0;
  while (g++ < 40) {
    const done = await p.evaluate((src) => {
      const by = new Function("it", "fam", "return (" + src + ")(it, fam)");
      const bk = window.PCA_V2_ITEMS.ME;
      const all = [].concat(bk.core.items, bk.standard.items, bk.pro.items);
      for (const n of document.querySelectorAll("#v2QBody .v2q")) {
        const it = all.find((x) => x.item_id === n.getAttribute("data-id"));
        const fam = Object.keys(it.career_family_weights || {});
        if (it.options) n.querySelector(".v2chip")?.click();
        else n.querySelector(`.v2opt[data-v="${Math.max(1, Math.min(5, by(it, fam)))}"]`)?.click();
      }
      return !!document.getElementById("v2Next");
    }, FILL.toString());
    if (!done) break;
    await p.click("#v2Next"); await p.waitForTimeout(90);
    const at = await p.evaluate(() =>
      [...document.querySelectorAll(".screen")].find((s) => s.classList.contains("active"))?.id);
    if (at !== "s2-question") break;
  }
  const at = await p.evaluate(() =>
    [...document.querySelectorAll(".screen")].find((s) => s.classList.contains("active"))?.id);
  if (at === "s2-evidence") {
    await p.evaluate(() => window.PCAV2App.showResult());
    await p.waitForTimeout(400);
  }
  const file = join(OUT, `${name}.pdf`);
  await p.emulateMedia({ media: "print" });
  await p.pdf({
    path: file, format: "A4", printBackground: true,
    displayHeaderFooter: true, headerTemplate: HEADER, footerTemplate: FOOTER,
    margin: { top: "18mm", bottom: "18mm", left: "14mm", right: "14mm" },
  });
  const pages = await p.evaluate(() => document.querySelectorAll(".rpage").length);
  const apx = await p.evaluate(() => document.querySelectorAll(".apsec").length);
  /* **어느 묶음이 종이를 몇 장 먹는지 센다.** 묶음 수만 보면 규격을 지킨
     것처럼 보이는데 실제로 찍히면 한 묶음이 세 장을 먹는 일이 있다.
     A4 한 장의 글 들어가는 높이는 297-36mm, 폭은 210-28mm 다 */
  await p.setViewportSize({ width: 688, height: 986 });
  await p.waitForTimeout(250);
  const fit = await p.evaluate((DEEP) => {
    const H = 986;
    const one = (n) => ({
      t: (n.querySelector(".rptitle, h3")?.textContent || n.className).trim().slice(0, 28),
      h: n.scrollHeight, s: Math.max(1, Math.ceil(n.scrollHeight / H)),
    });
    /* 긴 묶음은 안쪽까지 내려가며 센다. 어느 줄이 종이를 먹는지 알아야
       깎을 자리를 고를 수 있다 */
    const kids = (n, d) => {
      d = d || 0;
      const out = [];
      for (const k of n.children) {
        if (k.offsetHeight <= 40) continue;
        out.push(`${"  ".repeat(d)}${String(k.offsetHeight).padStart(4)}px ` +
          `${k.className.split(" ")[0] || k.tagName}`);
        if (d < 4 && k.offsetHeight > DEEP) out.push(...kids(k, d + 1));
      }
      return out;
    };
    return {
      body: [...document.querySelectorAll(".rpage")].map((n) =>
        Object.assign(one(n), { k: kids(n, 0) })),
      apx: [...document.querySelectorAll(".apsec")].map((n) =>
        Object.assign(one(n), { k: kids(n, 0) })),
    };
  }, Number(process.env.DEEP) || 260);
  await c.close();
  /* **쪽 묶음과 실제 종이 장수는 다를 수 있다**: 한 묶음이 길면 두 장에
     걸친다. 규격은 종이 장수로 적혀 있으니 찍힌 것을 세어서 같이 낸다 */
  let sheets = 0;
  try {
    const o = execFileSync("pdfinfo", [file], { encoding: "utf8" });
    sheets = Number((o.match(/^Pages:\s+(\d+)/m) || [])[1] || 0);
  } catch { sheets = 0; }
  return { file, pages, apx, sheets, fit };
}

/* **규격을 사람 눈이 아니라 장수로 지킨다.**
   받은 규격: BASIC 네댓 장 · STANDARD 여섯에서 여덟 · PRO 여덟에서 열
   (본문 열하나까지 봐줌) · 스무 장 넘기면 안 됨.
   한 묶음이 종이 두 장을 먹기 시작하면 '한 쪽에 메시지 하나' 가 깨진
   것이므로 그것도 실패로 본다. */
const BOUND = { BASIC: [4, 5], STANDARD: [6, 8], PRO: [8, 11] };
const bad = [];
const out = [];
for (const [tier, stage, name] of [
  ["BASIC", "bachelor", "01_BASIC_학사"],
  ["STANDARD", "master", "02_STANDARD_석사"],
  ["PRO", "phd", "03_PRO_박사"],
]) {
  const r = await run(tier, stage, name);
  const body = r.fit.body.reduce((a, x) => a + x.s, 0);
  const [lo, hi] = BOUND[tier];
  if (body < lo || body > hi) bad.push(`${tier} 본문이 ${body}장 (규격 ${lo}~${hi})`);
  if (r.sheets >= 20) bad.push(`${tier} 전체가 ${r.sheets}장 (스무 장 넘김)`);
  const over = r.fit.body.filter((x) => x.s > 1);
  if (over.length) bad.push(`${tier} 한 묶음이 두 장을 먹는다: ` +
    over.map((x) => `${x.t}(${x.s}장)`).join(" · "));
  out.push(`${name}  본문 ${body}장 · 찍힌 장수 ${r.sheets} · 부록 ${r.apx}절  → ${r.file}`);
  if (process.env.FIT) {
    const line = (x) => `      ${String(x.s).padStart(2)}장 ${String(x.h).padStart(5)}px  ${x.t}` +
      (process.env.FIT === "2" ? `\n            ${x.k.join("\n            ")}` : "");
    out.push(`    [본문]`, ...r.fit.body.map(line));
    out.push(`    [부록]`, ...r.fit.apx.map(line));
  }
}
await browser.close(); srv.close();
console.log(out.join("\n"));
if (bad.length) {
  console.log("\n쪽수 규격이 깨졌다.");
  for (const b of bad) console.log("  " + b);
  process.exitCode = 1;
} else {
  console.log("\n쪽수 규격 OK.");
}
