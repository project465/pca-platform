/**
 * 같은 응답이 두 언어에서 같은 판정을 내는가.
 *
 * 규격 §16·§43 이 요구하는 것은 **글자만 갈리고 판단은 갈리지 않는다**이다.
 * 그래서 여기서 보는 것은 셋이다.
 *
 *   1. 한국어 결과지가 **예전과 한 글자도 다르지 않은가**(지역화 공사 회귀)
 *   2. 같은 응답 ID 가 두 언어에서 같은 직무·증거·격차·다음행동 ID 를 내는가
 *   3. 영어 결과지에 한글이 새지 않는가
 *
 *   node scripts/i18n-parity.mjs            대조
 *   node scripts/i18n-parity.mjs --bless    지금 한국어를 기준으로 굳힌다
 */
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { extname, join, normalize, dirname } from "node:path";

const ROOT = "sites/pca-platform";
const BASE = "docs/metri/generated/i18n-baseline.json";
const PORT = 8243;
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png",
};

function serve() {
  return new Promise((ok) => {
    const s = createServer((req, res) => {
      const rel = normalize(decodeURIComponent(req.url.split("?")[0]))
        .replace(/^(\.\.[/\\])+/, "");
      let f = join(ROOT, rel === "/" ? "index.html" : rel);
      if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
      if (!existsSync(f)) { res.writeHead(404); res.end("no"); return; }
      res.writeHead(200, { "content-type": MIME[extname(f)] || "text/plain; charset=utf-8" });
      res.end(readFileSync(f));
    });
    s.listen(PORT, "127.0.0.1", () => ok(s));
  });
}

/* 결정적인 응시자 하나. **무작위를 쓰지 않는다**: 두 언어를 견주려면 같은
   응답이어야 하고, 기준을 굳히려면 어제와도 같은 응답이어야 한다 */
const FILL = (it, fam) => {
  const hit = fam.includes("ME_DESIGN_PRODUCT") || fam.includes("ME_CAE_SIM");
  if (it.construct === "actual_work_interest") return hit ? 5 : 2;
  if (it.construct === "exposure") return hit ? 4 : 2;
  if (it.construct === "learning_intent") return hit ? 5 : 2;
  return 4;
};

const EVIDENCE = {
  kinds: ["course", "project", "tool"],
  courses: ["정역학", "재료역학", "유한요소해석"].map((n) => ({ n })),
  projects: [{
    id: "p1", title: "bracket weight reduction capstone", type: "capstone",
    period: { start: "2025-03", end: "2025-12" }, team_size: "4",
    my_role: "structural review", objective: "cut weight while holding stiffness",
    what_i_did: "turned the requirements into dimensions and compared three design options",
    decisions_i_made: "picked the rib layout and thickness that cost less to machine",
    tools: ["SolidWorks"], methods: ["load path", "mesh sensitivity"],
    outputs: ["drawing", "analysis report"], result: "",
    measurable_result: "15% margin against the allowable stress in test",
    difficulty: "", what_changed: "adopted as the final design", what_i_learned: "",
  }],
  tools: [{ cat: "cae", name: "ANSYS Mechanical", level: "used", where: "", why: "",
    exp_id: "p1", decision: "", output: "", validation: "" }],
};

const srv = await serve();
const { chromium } = await import("playwright");
const browser = await chromium.launch({
  args: ["--no-sandbox"],
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});

/** 한 등급 · 한 언어를 그려서 본문과 판정 ID 를 돌려준다 */
async function render(tier, stage, lang) {
  const c = await browser.newContext({ viewport: { width: 1180, height: 1000 } });
  const p = await c.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const B = `http://127.0.0.1:${PORT}/v2.html`;
  await p.goto(B, { waitUntil: "domcontentloaded" });
  await p.evaluate((s) => {
    try { localStorage.clear(); } catch { /* 꺼져 있을 수 있다 */ }
    const EV = window.PCAEvidence;
    EV.saveEvidence(Object.assign(EV.emptyEvidence(), s.ev));
    EV.saveResearch([]);
    EV.saveTarget(Object.assign(EV.loadTarget(), { target_org_type: "private_company" }));
  }, { ev: EVIDENCE });

  await p.goto(`${B}?fresh=0&lang=${lang}`, { waitUntil: "networkidle" });
  const got = await p.evaluate((a) => {
    const bk = window.PCA_V2_ITEMS.ME;
    const all = [].concat(bk.core.items, bk.standard.items, bk.pro.items);
    const pick = new Function("it", "fam", "return (" + a.fill + ")(it, fam)");
    const V2 = window.PCAV2;
    const items = V2.itemsFor(a.tier);
    const answers = {};
    for (const it of items) {
      const src = all.find((x) => x.item_id === it.item_id) || it;
      const fam = Object.keys(src.career_family_weights || {});
      answers[it.item_id] = Math.max(1, Math.min(5, pick(src, fam)));
    }
    if (window.PCAI18N) window.PCAI18N.setLang(a.lang);
    const S = { tier: a.tier, stage: a.stage, answers, profile: { name: "" },
      lang: a.lang };
    const v2 = V2.score(a.tier, a.stage, answers);
    const J = window.PCAV2ResultJSON.build(v2, S);
    const html = window.PCAV2Report.render(J);
    const sum = window.PCAV2Report.summary ? window.PCAV2Report.summary(J) : null;
    return {
      html,
      language: J.report_language,
      roles: (J.decision_table || []).map((r) => r.career_family_id),
      states: (J.decision_table || []).map((r) => r.status || r.decision_status || ""),
      coverage: Object.keys(J.role_evidence_coverage || {}).sort(),
      gap: sum && sum.critical_gap ? (sum.critical_gap.family_id || sum.critical_gap.family) : null,
      next: sum && sum.next_action ? (sum.next_action.id || sum.next_action.kind || "") : "",
      missing: window.PCAI18N ? window.PCAI18N.missing() : [],
    };
  }, { tier, stage, lang, fill: FILL.toString() });
  await c.close();
  return { ...got, errs };
}

const CASES = [
  ["BASIC", "bachelor"],
  ["STANDARD", "master"],
  ["PRO", "phd"],
];

const bad = [];
const out = [];
const baseline = existsSync(BASE) ? JSON.parse(readFileSync(BASE, "utf8")) : {};
const fresh = {};
const missingAll = new Set();
const leaked = new Set();

for (const [tier, stage] of CASES) {
  const ko = await render(tier, stage, "ko");
  const en = await render(tier, stage, "en");
  const key = `${tier}_${stage}`;
  const koHash = createHash("sha256").update(ko.html).digest("hex").slice(0, 16);
  fresh[key] = koHash;

  if (ko.errs.length) bad.push(`${key} ko 그리는 중 오류: ${ko.errs[0]}`);
  if (en.errs.length) bad.push(`${key} en 그리는 중 오류: ${en.errs[0]}`);

  /* 1. 한국어가 예전과 같은가 */
  if (baseline[key] && baseline[key] !== koHash) {
    bad.push(`${key} 한국어 결과지가 달라졌다 (${baseline[key]} → ${koHash})`);
  }

  /* 2. 판정이 두 언어에서 같은가 */
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (!same(ko.roles, en.roles)) bad.push(`${key} 직무 순서가 언어마다 다르다`);
  if (!same(ko.states, en.states)) bad.push(`${key} 결정 상태가 언어마다 다르다`);
  if (!same(ko.coverage, en.coverage)) bad.push(`${key} 증거 범위 키가 언어마다 다르다`);
  if (ko.gap !== en.gap) bad.push(`${key} 가장 큰 공백이 언어마다 다르다`);
  if (ko.next !== en.next) bad.push(`${key} 다음 할 일이 언어마다 다르다`);

  /* 3. 영어에 한글이 새지 않는가 */
  const text = en.html.replace(/<[^>]*>/g, " ");
  const han = [...new Set((text.match(/[가-힣][가-힣\s·]{0,24}/g) || []))];
  if (han.length) {
    bad.push(`${key} 영어 결과지에 한글이 ${han.length}군데 남았다: ` +
      han.slice(0, 4).map((s) => s.trim()).join(" | "));
  }
  for (const m of en.missing || []) missingAll.add(m);
  /* 샌 글자를 그대로 모아 둔다. 사전에 없는 것이 아니라 **사전을 거치지
     않는 자리**(데이터 파일)에서 오는 것이라, 세는 것만으로는 못 찾는다 */
  for (const h of han) leaked.add(h.trim());
  if (en.language !== "en") bad.push(`${key} 영어 결과지가 report_language=${en.language}`);

  out.push(`${key.padEnd(18)} ko ${koHash} · 직무 ${ko.roles.length} · ` +
    `영어 한글 ${han.length}`);
}

await browser.close();
srv.close();

if (process.argv.includes("--dump")) {
  mkdirSync(dirname(BASE), { recursive: true });
  writeFileSync("docs/metri/generated/i18n-leaked.json",
    JSON.stringify([...leaked].sort(), null, 1) + "\n");
  console.log(`영어에 샌 글자 ${leaked.size}가지 → docs/metri/generated/i18n-leaked.json`);
}

if (process.argv.includes("--bless")) {
  mkdirSync(dirname(BASE), { recursive: true });
  writeFileSync(BASE, JSON.stringify(fresh, null, 1) + "\n");
  console.log("한국어 기준을 굳혔다:", BASE);
}

console.log(out.join("\n"));
if (missingAll.size) {
  console.log(`\n번역이 빠진 문구 ${missingAll.size}가지`);
  for (const m of [...missingAll].slice(0, 20)) console.log("  " + JSON.stringify(m));
  if (missingAll.size > 20) console.log(`  … 그 밖에 ${missingAll.size - 20}가지`);
  bad.push(`번역이 빠진 문구 ${missingAll.size}가지`);
}
if (bad.length) {
  console.log(`\n${bad.length}개가 걸렸다.`);
  for (const b of bad) console.log("  " + b);
  process.exitCode = 1;
} else {
  console.log("\n두 언어 대조 OK.");
}
