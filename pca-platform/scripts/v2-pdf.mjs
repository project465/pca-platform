/**
 * 결과지 PDF 를 뽑는다.
 *
 * **브라우저로 그냥 찍지 않는다.** A4 여백을 따로 주고 머리말·꼬리말·쪽
 * 번호를 우리가 그린다. 브라우저가 붙이는 주소와 날짜는 `displayHeaderFooter`
 * 를 켜고 우리 틀로 덮어쓴다.
 *
 * **두 언어 × 두 입력을 센다.**
 *
 * 영어는 같은 내용을 적어도 한국어보다 길다. 처음 재 보니 PRO 가 한국어
 * 18장 · 영어 26장이었고, 조판을 영어 쪽만 조여 둘을 같은 장수로 맞췄다.
 *
 * 입력을 둘로 두는 것은 **쪽수가 언어 때문에 늘었는지 적어 주신 양 때문에
 * 늘었는지 가르기 위해서다.** 도구 둘을 판단·산출물·검증까지 채워 적은
 * 응시자를 넣어 보면 BASIC 의 '증거 + 공백' 한 쪽이 넘치는데, 그것은
 * **두 언어에서 똑같이** 넘친다. 지역화 탈이 아니라 그 쪽에 들어가는 양의
 * 한계다. 그래서 규격 장수는 보통 응시자로 지키고, 많이 적어 주신
 * 응시자에게는 **두 언어가 같은 장수인지**만 본다: 영어판만 번지는 것을
 * 잡는 것이 이 검사의 일이고, 많이 적으셨다고 결과지에서 글을 덜어내는
 * 것은 하지 않는다.
 *
 *   node scripts/v2-pdf.mjs
 *   node scripts/v2-pdf.mjs --lang=en      영어만
 *   EV=ko node scripts/v2-pdf.mjs          입력을 고정해서
 *   FIT=2 node scripts/v2-pdf.mjs          어느 묶음이 종이를 먹는지
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

/* **응시자가 영어로 적은 경우도 센다.** 글로벌 응시자는 경험을 영어로
   적고, 영어 글은 같은 내용이 한국어보다 길어서 쪽수가 더 번진다.
   한국어 입력으로만 재면 그 경우가 규격을 넘긴 채로 나간다 */
const EVIDENCE_EN = {
  kinds: ["course", "project", "tool"],
  courses: ["Statics", "Mechanics of materials", "Finite element analysis",
    "Machine element design"].map((n) => ({ n })),
  projects: [{
    id: "p1", title: "bracket weight reduction capstone", type: "capstone",
    period: { start: "2025-03", end: "2025-12" }, team_size: "4",
    my_role: "structural review", objective: "cut weight while holding stiffness",
    what_i_did: "turned the requirements into dimensions and compared three design options",
    decisions_i_made: "picked the rib layout and thickness that cost less to machine",
    tools: ["SolidWorks"], methods: ["load path", "mesh sensitivity", "convergence"],
    outputs: ["drawing", "analysis report"], result: "",
    measurable_result: "15% margin against the allowable stress in test",
    difficulty: "", what_changed: "adopted as the final design", what_i_learned: "",
  }],
  /* **한국어 입력과 같은 양으로 맞춘다.** 둘째 도구를 여기서 더 채우면
     쪽수 차이가 언어 때문인지 적어 주신 양 때문인지 가릴 수 없다 */
  tools: [
    { cat: "cad", name: "SolidWorks", level: "used", where: "",
      why: "compare geometry options", exp_id: "p1", decision: "rib layout",
      output: "drawing", validation: "compared against the allowable stress" },
    { cat: "cae", name: "ANSYS Mechanical", level: "used", where: "", why: "",
      exp_id: "", decision: "", output: "", validation: "" },
  ],
};

/* 많이 적어 주신 응시자. 둘째 도구까지 판단·산출물·검증을 채운다.
   **이 입력에는 규격 장수를 들이대지 않는다**(아래 설명) */
const fill2 = (ev, lang) => {
  const t = JSON.parse(JSON.stringify(ev));
  t.tools[1] = Object.assign(t.tools[1], lang === "en"
    ? { why: "compare design options", exp_id: "p1", decision: "rib layout",
        output: "analysis report",
        validation: "compared against the allowable stress" }
    : { why: "설계안 비교", exp_id: "p1", decision: "리브 배치 선택",
        output: "해석 리포트", validation: "허용 응력 기준과 비교" });
  return t;
};

const fixture = (lang, rich) => {
  const base = lang === "en" ? EVIDENCE_EN : EVIDENCE;
  return rich ? fill2(base, lang) : base;
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
const EDGE = {
  ko: { kind: "진로 결정 자료", note: "합격 가능성이나 실력을 잰 값이 아닙니다" },
  en: { kind: "Career decision material",
        note: "This is not a measure of ability or of your chances of being hired" },
};
const chrome = (lang) => {
  const t = EDGE[lang] || EDGE.ko;
  const base = "width:100%;font-size:7pt;color:#76859b;"
    + "font-family:'Pretendard',sans-serif;padding:0 16mm;"
    + "display:flex;justify-content:space-between";
  return {
    header: `<div style="${base};letter-spacing:.06em">`
      + `<span>CAREERMATRI</span><span>${t.kind}</span></div>`,
    footer: `<div style="${base}"><span>${t.note}</span>`
      + `<span><span class="pageNumber"></span> / `
      + `<span class="totalPages"></span></span></div>`,
  };
};

async function run(tier, stage, name, lang, rich) {
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
  }, fixture(lang, rich));
  await p.goto(`${B}?fresh=1&tier=${tier}&stage=${stage}&lang=${lang}`,
    { waitUntil: "networkidle" });
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
  const file = join(OUT, `${name}_${lang}${rich ? "_많이적음" : ""}.pdf`);
  const edge = chrome(lang);
  await p.emulateMedia({ media: "print" });
  await p.pdf({
    path: file, format: "A4", printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: edge.header, footerTemplate: edge.footer,
    margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
  });
  const pages = await p.evaluate(() => document.querySelectorAll(".rpage").length);
  const apx = await p.evaluate(() => document.querySelectorAll(".apsec").length);
  /* **어느 묶음이 종이를 몇 장 먹는지 센다.** 묶음 수만 보면 규격을 지킨
     것처럼 보이는데 실제로 찍히면 한 묶음이 세 장을 먹는 일이 있다.
     A4 한 장의 글 들어가는 높이는 297-36mm, 폭은 210-28mm 다 */
  await p.setViewportSize({ width: 673, height: 986 });
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
const onlyLang = (process.argv.find((x) => x.startsWith("--lang=")) || "").slice(7);
const LANGS = onlyLang ? [onlyLang] : ["ko", "en"];
/* `--plain` 을 주면 보통 응시자만 돈다 */
const RICHES = process.argv.includes("--plain") ? [false] : [false, true];
const TIERS = [
  ["BASIC", "bachelor", "01_BASIC_학사"],
  ["STANDARD", "master", "02_STANDARD_석사"],
  ["PRO", "phd", "03_PRO_박사"],
];
const bad = [];
const out = [];
/* 많이 적어 주신 응시자의 장수를 언어끼리 견주려고 모아 둔다 */
const rich = {};

for (const lang of LANGS) {
  for (const isRich of RICHES) {
    for (const [tier, stage, name] of TIERS) {
      const r = await run(tier, stage, name, lang, isRich);
      const body = r.fit.body.reduce((a, x) => a + x.s, 0);
      const who = `${tier}/${lang}${isRich ? "(많이 적음)" : ""}`;
      const over = r.fit.body.filter((x) => x.s > 1);
      if (!isRich) {
        const [lo, hi] = BOUND[tier];
        if (body < lo || body > hi) bad.push(`${who} 본문이 ${body}장 (규격 ${lo}~${hi})`);
        if (r.sheets >= 20) bad.push(`${who} 전체가 ${r.sheets}장 (스무 장 넘김)`);
        if (over.length) bad.push(`${who} 한 묶음이 두 장을 먹는다: ` +
          over.map((x) => `${x.t}(${x.s}장)`).join(" · "));
      } else {
        /* 많이 적어 주신 쪽은 **언어끼리만 견준다.** 규격 장수를 여기에
           들이대면 글을 덜어내는 쪽으로 고치게 된다 */
        rich[tier] = rich[tier] || {};
        rich[tier][lang] = { body, sheets: r.sheets };
        if (r.sheets >= 24) bad.push(`${who} 전체가 ${r.sheets}장 (손쓸 수 없이 길다)`);
      }
      out.push(`${name}_${lang}${isRich ? "_많이적음" : ""}  본문 ${body}장 · ` +
        `찍힌 장수 ${r.sheets} · 부록 ${r.apx}절  → ${r.file}`);
      if (process.env.FIT) {
        const line = (x) => `      ${String(x.s).padStart(2)}장 ` +
          `${String(x.h).padStart(5)}px  ${x.t}` +
          (process.env.FIT === "2" ? `\n            ${x.k.join("\n            ")}` : "");
        out.push(`    [본문]`, ...r.fit.body.map(line));
        out.push(`    [부록]`, ...r.fit.apx.map(line));
      }
    }
  }
}
/* **영어판만 번지면 실패다.** 많이 적어 주신 응시자에게 BASIC 한 쪽이
   넘치는 것은 두 언어에서 같이 일어나는 일이라 여기서 걸리지 않는다 */
for (const t of Object.keys(rich)) {
  const a = rich[t].ko, b = rich[t].en;
  if (!a || !b) continue;
  if (Math.abs(a.sheets - b.sheets) > 1) {
    bad.push(`${t} 많이 적어 주신 응시자의 장수가 언어마다 다르다 ` +
      `(ko ${a.sheets} · en ${b.sheets})`);
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
