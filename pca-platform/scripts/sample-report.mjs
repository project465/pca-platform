/**
 * 사기 전에 보여 주는 견본 결과지를 **실제 엔진으로** 그려 둔다.
 *
 * 규격 §7 이 요구하는 것이고, 손으로 만들면 안 되는 종류다. 견본을 따로
 * 적어 두면 **제품을 고친 날 견본만 옛것으로 남고**, 그 차이를 아무도
 * 세지 않는다. 그래서 가짜 응시자 한 사람을 지어 놓고 산 사람의 결과지와
 * **같은 한 벌**(`PCAV2Report.render`)로 그린 결과 객체를 파일로 떠 둔다.
 *
 * **담긴 값은 전부 지어낸 것이다.** 실제 응시자의 자료를 견본으로 쓰지
 * 않는다(규격 §7 마지막 줄). 그래서 이 파일은 로그인 없이 열린다.
 *
 *   node scripts/sample-report.mjs
 *
 * 나오는 것: `public/me-v2/sample.ko.json` · `sample.en.json`
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const ROOT = "sites/pca-platform";
const OUT = "public/me-v2";
const PORT = 8243;
/* **STANDARD 를 견본으로 쓴다.** BASIC 은 등급 차이를 못 보여 주고 PRO 를
   통째로 보여 주면 살 이유가 줄어든다. 가운데 등급이 "무엇이 더 붙는지" 를
   가장 잘 말한다 */
const TIER = "STANDARD";
const STAGE = "bachelor";

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

/**
 * 가짜 응시자. **기계공학 학부 4학년 한 사람**이고, 캡스톤 하나와 도구
 * 둘을 적었다. 적어 주신 양을 보통으로 둔 것이 일부러다: 아무것도 안 적은
 * 사람으로 그리면 견본이 빈 양식처럼 보이고, 다 채운 사람으로 그리면
 * 아무도 못 받는 결과지를 보여 주는 셈이 된다.
 */
const EV = {
  ko: {
    kinds: ["course", "project", "tool"],
    courses: ["정역학", "재료역학", "유한요소해석"].map((n) => ({ n })),
    projects: [{
      id: "s1", title: "브래킷 경량화 캡스톤", type: "capstone",
      period: { start: "2025-03", end: "2025-12" }, team_size: "4",
      my_role: "구조 검토", objective: "강성을 지키면서 무게를 줄이기",
      what_i_did: "요구조건을 치수로 옮기고 하중 경로를 나눠 설계안 세 개를 비교했습니다",
      decisions_i_made: "가공비가 덜 오르는 쪽으로 리브 배치와 두께를 골랐습니다",
      tools: ["SolidWorks"], methods: ["하중 경로 분석", "수렴 확인"],
      outputs: ["도면", "해석 리포트"], result: "",
      measurable_result: "시험 결과 허용 응력 기준 대비 15% 여유",
      difficulty: "", what_changed: "최종 설계안으로 채택됐습니다", what_i_learned: "",
    }],
    tools: [
      { cat: "cad", name: "SolidWorks", level: "used", where: "", why: "형상안 비교",
        exp_id: "s1", decision: "리브 배치 선택", output: "도면",
        validation: "허용 응력 기준과 비교" },
      { cat: "cae", name: "ANSYS Mechanical", level: "used", where: "", why: "",
        exp_id: "", decision: "", output: "", validation: "" },
    ],
  },
  en: {
    kinds: ["course", "project", "tool"],
    courses: ["Statics", "Mechanics of materials", "Finite element analysis"]
      .map((n) => ({ n })),
    projects: [{
      id: "s1", title: "bracket weight reduction capstone", type: "capstone",
      period: { start: "2025-03", end: "2025-12" }, team_size: "4",
      my_role: "structural review", objective: "cut weight while holding stiffness",
      what_i_did: "turned the requirements into dimensions and compared three design options",
      decisions_i_made: "picked the rib layout and thickness that cost less to machine",
      tools: ["SolidWorks"], methods: ["load path", "convergence"],
      outputs: ["drawing", "analysis report"], result: "",
      measurable_result: "15% margin against the allowable stress in test",
      difficulty: "", what_changed: "adopted as the final design", what_i_learned: "",
    }],
    tools: [
      { cat: "cad", name: "SolidWorks", level: "used", where: "",
        why: "compare geometry options", exp_id: "s1", decision: "rib layout",
        output: "drawing", validation: "compared against the allowable stress" },
      { cat: "cae", name: "ANSYS Mechanical", level: "used", where: "", why: "",
        exp_id: "", decision: "", output: "", validation: "" },
    ],
  },
};

/* 설계·해석 쪽에 기울어진 사람. 전부 같은 값으로 채우면 묶음이 갈리지
   않아서 견본이 "아무 직무나 1군" 으로 나간다 */
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

const out = [];
for (const lang of ["ko", "en"]) {
  const c = await browser.newContext({ viewport: { width: 1180, height: 1000 } });
  const p = await c.newPage();
  const B = `http://127.0.0.1:${PORT}/v2.html?lang=${lang}`;
  await p.goto(B, { waitUntil: "networkidle" });

  /* 응답은 **화면을 눌러 만들지 않고** 엔진이 읽는 자리에 바로 넣는다.
     `render.ts` 가 하는 것과 같은 방식이라, 견본과 산 사람의 결과지가
     같은 길로 그려진다 */
  await p.evaluate(({ ev, tier, stage, fill }) => {
    const by = new Function("it", "fam", "return (" + fill + ")(it, fam)");
    try { localStorage.clear(); } catch (e) { /* 꺼져 있을 수 있다 */ }
    const E = window.PCAEvidence;
    E.saveEvidence(Object.assign(E.emptyEvidence(), ev));
    E.saveResearch([]);
    E.saveTarget(Object.assign(E.loadTarget(), { target_org_type: "private_company" }));

    const bk = window.PCA_V2_ITEMS.ME;
    const all = [].concat(bk.core.items, bk.standard.items, bk.pro.items);
    const answers = {};
    for (const it of all) {
      const fam = Object.keys(it.career_family_weights || {});
      if (it.options) answers[it.item_id] = it.options[0];
      else answers[it.item_id] = Math.max(1, Math.min(5, by(it, fam)));
    }
    localStorage.setItem("pca_v2_session_v1", JSON.stringify({
      tier, stage, sec: 0, answers,
      profile: { name: "" }, startedAt: null, savedAt: Date.now(),
    }));
  }, { ev: EV[lang], tier: TIER, stage: STAGE, fill: FILL.toString() });

  await p.goto(B, { waitUntil: "networkidle" });
  await p.evaluate(() => window.PCAV2App.showResult());
  await p.waitForSelector(".rpage", { timeout: 20000 });

  const got = await p.evaluate(() => ({
    result: window.PCA_V2_RESULT_JSON ?? null,
    summary: window.PCA_V2_DECISION_SUMMARY ?? null,
    pages: document.querySelectorAll(".rpage").length,
  }));
  await c.close();

  if (!got.result) { console.log(`${lang}  결과 객체가 비어 있다.`); process.exitCode = 1; continue; }

  /* **견본이라는 것을 자료에도 적어 둔다.** 화면의 띠 하나로만 말하면 그
     띠를 지우는 날 견본이 진짜처럼 보인다 */
  const file = join(OUT, `sample.${lang}.json`);
  writeFileSync(file, JSON.stringify({
    sample: true,
    note: lang === "en"
      ? "Sample report. Every value here is fictional."
      : "견본 결과지입니다. 담긴 값은 전부 지어낸 것입니다.",
    tier: TIER, stage: STAGE,
    generated_at: new Date().toISOString(),
    result: got.result, summary: got.summary,
  }, null, 0) + "\n");
  out.push(`${`sample.${lang}.json`.padEnd(22)} ${String(got.pages).padStart(2)}쪽`);
}

await browser.close();
srv.close();
console.log(out.join("\n"));
console.log(out.length === 2 ? "\n견본 두 벌 OK." : "\n견본을 다 못 만들었다.");
if (out.length !== 2) process.exitCode = 1;
