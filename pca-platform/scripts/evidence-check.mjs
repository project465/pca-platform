/**
 * 경험 입력이 지켜야 하는 열 가지.
 *
 * 가장 중요한 것은 첫 번째다. **경험을 넣어도 적합도가 바뀌면 안 된다.**
 * 바뀌는 순간 "같은 응답이면 같은 점수" 가 거짓이 되고, 그러면 학과 담당자가
 * 재계산해 볼 수 없다. 나머지 아홉은 지어내기를 막는 것들이다.
 *
 *   node scripts/evidence-check.mjs
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const ROOT = "sites/pca-platform";
const PORT = 8233;
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
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

/* 같은 답을 넣어야 비교가 성립한다 */
const PICK = (i) => 1 + ((i * 7) % 5);

async function run(browser, { stage, evidence }) {
  const c = await browser.newContext({ viewport: { width: 1100, height: 980 } });
  const p = await c.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  const at = () => p.evaluate(() =>
    [...document.querySelectorAll(".screen")].find((s) => s.classList.contains("active"))?.id);
  const B = `http://127.0.0.1:${PORT}/index.html`;
  await p.goto(B, { waitUntil: "networkidle" });
  await p.evaluate(() => { try { localStorage.clear(); } catch {} });
  if (evidence) {
    await p.evaluate((e) => {
      const EV = window.PCAEvidence;
      EV.saveEvidence(Object.assign(EV.emptyEvidence(), e.ev));
      EV.saveResearch(e.rp || []);
    }, evidence);
  }
  await p.goto(`${B}?major=ME&form=QUICK&fresh=1`, { waitUntil: "networkidle" });
  if ((await at()) === "s-stage") {
    await p.click(`#stageList .major[data-code="${stage}"]`).catch(() => p.click("#stageList .major"));
    await p.click("#btnStageNext");
  }
  if ((await at()) === "s-major") {
    await p.click("#majorList .major:not([disabled])"); await p.click("#btnMajorNext");
  }
  await p.fill("#pfName", "이수민"); await p.click('#pfGender .seg[data-v="F"]');
  await p.fill("#pfSid", "20231234"); await p.check("#pfAgree"); await p.click("#btnProfileNext");
  /* **문항 번호로 고른다.** 반복 횟수로 고르면 클릭이 늦게 먹힌 날
     같은 문항에 다른 보기를 눌러 응답 묶음이 통째로 달라진다. 그러면
     "경험을 넣었더니 점수가 바뀌었다" 로 보이는데 사실은 검사 쪽 문제다. */
  const qidx = () => p.evaluate(() => {
    try { return JSON.parse(localStorage.getItem("pca_session_v1")).idx; } catch { return -1; }
  });
  for (let guard = 0; guard < 600; guard++) {
    if ((await at()) === "s-result") break;
    const n = await p.$$eval("#opts .opt", (e) => e.length).catch(() => 0);
    if (!n) break;
    const at0 = await qidx();
    await p.click(`#opts .opt:nth-child(${Math.min(n, PICK(at0))})`).catch(() => {});
    for (let w = 0; w < 40; w++) {
      if ((await qidx()) !== at0 || (await at()) === "s-result") break;
      await p.waitForTimeout(25);
    }
  }
  await p.waitForTimeout(700);
  const r = await p.evaluate(() => ({
    json: window.PCA_RESULT_JSON,
    text: document.getElementById("resultBody")?.innerText || "",
    heads: [...document.querySelectorAll("#resultBody .section h2.sect")]
      .map((x) => x.textContent.replace(/^\d+\.\s*/, "").trim()),
  }));
  return { page: p, ctx: c, ...r, errs };
}

/* 설계·해석 쪽 경험 한 벌. 도구 이름은 있지만 숙련도를 말하지 않는다. */
const DESIGN_EV = {
  ev: {
    kinds: ["course", "project", "tool"],
    courses: ["정역학", "재료역학", "유한요소해석", "기계요소설계"].map((n) => ({ n })),
    projects: [{
      id: "p1", title: "브래킷 경량화 캡스톤", type: "capstone",
      period: { start: "2025-03", end: "2025-12" }, team_size: "4",
      my_role: "구조 검토", objective: "강성 유지하며 무게 줄이기",
      what_i_did: "하중 경로를 나누고 세 안을 비교했습니다",
      decisions_i_made: "가공비가 덜 오르는 쪽으로 리브 배치를 골랐습니다",
      tools: ["SolidWorks"], methods: ["하중 경로 분석", "메시 민감도", "수렴 확인"],
      outputs: ["도면", "해석 리포트"], result: "", measurable_result: "",
      difficulty: "", what_changed: "", what_i_learned: "",
    }],
    tools: [{ cat: "cad", name: "SolidWorks", level: "used", where: "", why: "형상 비교" }],
  },
  rp: [],
};

/* 연구 과제 한 건. 연구비와 공고는 **일부러 비워 둔다.** */
const RESEARCH_EV = {
  ev: { kinds: ["research", "paper"], publications: ["학회 포스터 1편"] },
  rp: [{
    id: "r1", project_title: "열교환기 성능 평가",
    funding_context: { sponsor_name: "", management_agency: "", program_name: "", call_name: "", rfp_reference: "" },
    period: { start_date: "2024-03", end_date: "2025-02" },
    budget: { total_amount: null, currency: "KRW", direct_cost: null, indirect_cost: null, my_budget_role: "" },
    team: { total_people: null, roles: [], my_role: "참여연구원", collaborating_orgs: [] },
    objective: { project_objective: "성능 향상", my_objective: "실험 조건 설계와 측정" },
    planning: {
      rfp_reviewed: "not_supplied", work_packages: [], timeline_role: "",
      milestones: [], kpis: [], deliverables: [], resource_planning: "", risk_planning: "",
    },
    execution: {
      methods: ["열전달 측정", "불확도 분석"], experiments: ["정상상태 시험"],
      simulations: [], equipment: [], data: [], key_decisions: ["측정 지점을 다섯 곳으로 줄였습니다"],
      plan_changes: [],
    },
    compliance: { safety: [], ethics: [], regulatory: [], security: [], quality: [], data_management: [], ip: [] },
    outputs: { papers: [], patents: [], reports: [], prototypes: [], datasets: [], software: [], other: [] },
  }],
};

const T = [];
const ok = (name, pass, detail) => T.push({ name, pass, detail: detail || "" });

const srv = await serve();
const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox"] });

const bare = await run(browser, { stage: "UNDERGRAD" });
const withEv = await run(browser, { stage: "UNDERGRAD", evidence: DESIGN_EV });
const phd = await run(browser, { stage: "PHD", evidence: RESEARCH_EV });
const bachelorRich = await run(browser, { stage: "UNDERGRAD", evidence: RESEARCH_EV });

/* 1. 경험 입력 전후 FIT 동일 */
{
  const a = (bare.json.job_fit || []).map((x) => `${x.job}:${x.fit}`).join(" ");
  const b = (withEv.json.job_fit || []).map((x) => `${x.job}:${x.fit}`).join(" ");
  ok("경험 입력 전후 FIT 동일", a === b, a === b ? "" : `${a}\n          ${b}`);
}
/* 2. 경험 추가 후 준비 정도만 달라진다 */
{
  const before = (bare.json.job_fit || [])[0].evidence_readiness;
  const after = (withEv.json.job_fit || [])[0].evidence_readiness;
  const itemSame = (bare.json.career_family_candidates || []).map((x) => x.item_readiness).join() ===
    (withEv.json.career_family_candidates || []).map((x) => x.item_readiness).join();
  ok("경험을 넣으면 준비 정도만 생긴다", !before && !!after && itemSame,
    `${before ? "전에 이미 있었다" : ""}${after ? "" : " 넣어도 안 생긴다"}`);
}
/* 3. 학사에게 고급 연구기획을 필수로 묻지 않는다 */
{
  const html = readFileSync(join(ROOT, "assets/evidence.js"), "utf8");
  const bach = /bachelor:\s*\{[\s\S]*?research_detail:\s*false/.test(html);
  const noAdv = !/연구비|성과지표|과제요청서/.test(bachelorRich.text.split("연구를 어떻게")[0]);
  ok("학사에게 연구기획을 필수로 묻지 않는다", bach && noAdv);
}
/* 4. 박사·포닥은 연구 과제 상세를 적을 수 있다 */
{
  const ask = readFileSync(join(ROOT, "assets/evidence.js"), "utf8");
  const has = /phd:\s*\{[\s\S]*?research_detail:\s*true/.test(ask) &&
    /postdoc:\s*\{[\s\S]*?research_detail:\s*true/.test(ask);
  const shown = /적어 주신 연구 과제/.test(phd.text);
  ok("박사·포닥은 연구 과제를 적고 결과지에서 받는다", has && shown);
}
/* 5. 연구비를 안 적었으면 금액이 생기지 않는다 */
{
  const bad = /\d[\d,]*\s*(?:원|만원|천원|억)/.test(phd.text) ||
    /총\s*연구비[^.\n]{0,12}\d/.test(phd.text);
  ok("연구비 미입력 시 금액을 만들지 않는다", !bad,
    bad ? (phd.text.match(/총\s*연구비[^\n]{0,40}/) || [""])[0] : "");
}
/* 6. 공고를 확인하지 않았으면 확인했다고 쓰지 않는다 */
{
  const m = phd.json.research_maturity;
  const claimed = (m?.evidence || []).some((x) => /공고|과제요청서/.test(x));
  ok("공고 미확인을 확인했다고 쓰지 않는다", !claimed, claimed ? JSON.stringify(m.evidence) : "");
}
/* 7. 도구 이름만으로 숙련을 단정하지 않는다 */
{
  const bad = withEv.text.split(/(?<=[.!?])\s+|\n+/).filter((s) =>
    /SolidWorks|ANSYS/.test(s) && /(?:능숙|숙련|잘 다|전문가|할 줄 아)/.test(s));
  ok("도구 이름으로 숙련을 단정하지 않는다", bad.length === 0, bad[0] || "");
}
/* 8. 프로젝트 결과 숫자를 임의로 만들지 않는다 */
{
  /* 응시자는 measurable_result 를 비워 뒀다. 본문에 % 가 붙은 성과가 나오면 지어낸 것이다 */
  const seg = withEv.text.split("이미 가지고 계신 것")[1] || "";
  const bad = /브래킷[^.\n]{0,40}\d+\s*%/.test(seg);
  ok("프로젝트 결과 숫자를 지어내지 않는다", !bad);
}
/* 9. 지운 경험은 결과지에서 빠진다 */
{
  const p = withEv.page;
  await p.evaluate(() => { window.PCAEvidence.clearAll(); });
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  const gone = await p.evaluate(() => {
    const EV = window.PCAEvidence;
    return !EV.has(EV.loadEvidence(), EV.loadResearch());
  });
  ok("지운 경험은 남지 않는다", gone);
}
/* 10. 경험이 없는 기존 응시자도 오류 없이 열린다 */
{
  const clean = bare.errs.length === 0 && !!bare.json && bare.heads.length > 10;
  const fallback = /경험이 아직 없습니다/.test(bare.text) && /경험 추가하기/.test(bare.text);
  ok("경험 없는 응시자도 열리고 안내가 뜬다", clean && fallback,
    `절 ${bare.heads.length} · 오류 ${bare.errs.length}`);
}

const jsErr = [...bare.errs, ...withEv.errs, ...phd.errs, ...bachelorRich.errs];
ok("JS 오류 없음", jsErr.length === 0, jsErr[0] || "");

await browser.close();
srv.close();

let bad = 0;
for (const t of T) {
  console.log(`  ${t.pass ? "OK  " : "실패"} ${t.name}${t.detail ? `  (${t.detail})` : ""}`);
  if (!t.pass) bad++;
}
console.log(bad ? `\n${bad}개가 깨졌다.` : "\n경험 검사 OK.");
process.exit(bad ? 1 : 0);
