/**
 * ME_V2 화면을 실제 브라우저로 찍는다.
 *
 * 흐름 검사(`v2-flow-check.mjs`)와 같은 길을 걷되 중간에서 멈춰 그림을
 * 남긴다. 결과지 두 벌(경험 없음 · 경험 있음)을 나란히 찍는 것이 목적이고,
 * 그래야 "경험을 적으면 무엇이 달라지는가" 를 눈으로 댈 수 있다.
 *
 *   node scripts/v2-shots.mjs
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const ROOT = "sites/pca-platform";
const OUT = "docs/metri/shots/v2";
const PORT = 8236;
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

const EVIDENCE = {
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
    tools: [{
      cat: "cad", name: "SolidWorks", level: "used", where: "", why: "형상안 비교",
      exp_id: "p1", decision: "리브 배치를 고름", output: "도면 · 해석 리포트",
      validation: "허용 응력 기준과 비교",
    }, {
      cat: "cae", name: "ANSYS Mechanical", level: "used", where: "", why: "",
      exp_id: "", decision: "", output: "", validation: "",
    }],
  },
  rp: [],
  org: "private_company",
};

const PROFILES = {
  design_rich: (it, fam) => {
    const hit = fam.includes("ME_DESIGN_PRODUCT") || fam.includes("ME_CAE_SIM");
    if (it.construct === "actual_work_interest") return hit ? 5 : 2;
    if (it.construct === "exposure") return hit ? 4 : 2;
    if (it.construct === "learning_intent") return hit ? 5 : 2;
    return 4;
  },
  researcher: () => 4,
};

const srv = await serve();
const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox"] });
mkdirSync(OUT, { recursive: true });
const shots = [];
async function shot(p, name, full) {
  const f = join(OUT, name + ".png");
  await p.screenshot({ path: f, fullPage: !!full });
  shots.push(f);
}

async function run({ tier, stage, profile, evidence, tag, steps }) {
  const c = await browser.newContext({ viewport: { width: 1100, height: 980 }, deviceScaleFactor: 2 });
  const p = await c.newPage();
  const B = `http://127.0.0.1:${PORT}/v2.html`;
  await p.goto(B, { waitUntil: "networkidle" });
  await p.evaluate(() => { try { localStorage.clear(); } catch {} });
  if (evidence) {
    await p.evaluate((e) => {
      const EV = window.PCAEvidence;
      EV.saveEvidence(Object.assign(EV.emptyEvidence(), e.ev));
      EV.saveResearch(e.rp || []);
      if (e.org) EV.saveTarget(Object.assign(EV.loadTarget(), { target_org_type: e.org }));
    }, evidence);
  }
  await p.goto(`${B}?fresh=1&tier=${tier}&stage=${stage}`, { waitUntil: "networkidle" });
  if (steps) await shot(p, "01_상품선택");
  await p.click("#v2ToStage");
  if (steps) await shot(p, "02_학위단계");
  await p.click("#v2ToQ");
  await p.waitForTimeout(200);
  if (steps) await shot(p, "03_응시_첫화면");

  const fill = PROFILES[profile];
  let guard = 0, secN = 0;
  while (guard++ < 40) {
    secN += 1;
    if (steps && secN === 4) await shot(p, "04_응시_보기형_문항");
    const done = await p.evaluate((src) => {
      const by = new Function("it", "fam", "return (" + src + ")(it, fam)");
      const bank = window.PCA_V2_ITEMS.ME;
      const all = [].concat(bank.core.items, bank.standard.items, bank.pro.items);
      for (const node of document.querySelectorAll("#v2QBody .v2q")) {
        const it = all.find((x) => x.item_id === node.getAttribute("data-id"));
        const fam = Object.keys(it.career_family_weights || {});
        if (it.options) {
          const btn = node.querySelector(".v2chip");
          if (btn) btn.click();
        } else {
          const v = Math.max(1, Math.min(5, by(it, fam)));
          const btn = node.querySelector(`.v2opt[data-v="${v}"]`);
          if (btn) btn.click();
        }
      }
      return !!document.getElementById("v2Next");
    }, fill.toString());
    if (!done) break;
    await p.click("#v2Next");
    await p.waitForTimeout(120);
    const at = await p.evaluate(() =>
      [...document.querySelectorAll(".screen")].find((s) => s.classList.contains("active"))?.id);
    if (at !== "s2-question") break;
  }
  let at = await p.evaluate(() =>
    [...document.querySelectorAll(".screen")].find((s) => s.classList.contains("active"))?.id);
  if (at === "s2-evidence") {
    if (steps) await shot(p, "05_경험입력");
    await p.evaluate(() => window.PCAV2App.showResult());
    await p.waitForTimeout(400);
  }
  await p.waitForTimeout(200);
  await shot(p, tag + "_첫화면");
  await shot(p, tag + "_전체", true);
  /* 쪽마다 따로 찍는다. **이름이 새 구조의 쪽 제목과 묶여 있다**: 결과지를
     다시 짜면서 제목이 바뀌면 여기도 같이 바꿔야 빈 캡처가 나오지 않는다.
     찍히지 않은 이름은 아래에서 세어 알려 준다 */
  const want = [
    ["지금 먼저 보실 세 가지", "01_결정요약"],
    ["먼저 볼 직무를 견주면", "02_직무견주기"],
    ["배운 것이 실제 업무에서", "03_전공지식의_실무전환"],
    ["지금 내가 가진 증거", "04_증거사다리"],
    ["같은 전공도 조직에 따라", "05_같은전공_다른조직"],
    ["아직 확인되지 않은 것", "06_아직확인되지않은것"],
    ["다음에 만들 경험 하나", "07_다음에만들경험"],
    ["언제 무엇을 할 것인가", "08_계획"],
  ];
  const miss = [];
  for (const [key, name] of want) {
    const box = await p.evaluateHandle((k) =>
      [...document.querySelectorAll("#v2ResultBody .rpage")]
        .find((s) => (s.querySelector(".rptitle")?.textContent || "").includes(k)) || null, key);
    const el = box.asElement();
    if (el) {
      await el.scrollIntoViewIfNeeded();
      await p.waitForTimeout(80);
      const f = join(OUT, tag + "_" + name + ".png");
      await el.screenshot({ path: f }).then(() => shots.push(f)).catch(() => {});
    } else {
      miss.push(key);
    }
  }
  /* 직무 쪽은 제목이 직무 이름이라 위 목록으로 못 집는다. 따로 센다 */
  const roles = await p.evaluate(() =>
    [...document.querySelectorAll("#v2ResultBody .rpage")]
      .filter((s) => /WHY · EVIDENCE/.test(s.querySelector(".eyebrow")?.textContent || ""))
      .map((s) => s.querySelector(".rptitle")?.textContent || ""));
  for (let i = 0; i < roles.length; i++) {
    const box = await p.evaluateHandle((n) =>
      [...document.querySelectorAll("#v2ResultBody .rpage")]
        .filter((s) => /WHY · EVIDENCE/.test(s.querySelector(".eyebrow")?.textContent || ""))[n] || null, i);
    const el = box.asElement();
    if (!el) continue;
    await el.scrollIntoViewIfNeeded();
    await p.waitForTimeout(80);
    const f = join(OUT, `${tag}_09_직무${i + 1}.png`);
    await el.screenshot({ path: f }).then(() => shots.push(f)).catch(() => {});
  }
  if (miss.length) console.log(`  (${tag} 에 없는 쪽: ${miss.join(" · ")})`);
  await c.close();
}

await run({ tier: "BASIC", stage: "bachelor", profile: "design_rich", tag: "06_학사BASIC_경험없음", steps: true });
await run({ tier: "BASIC", stage: "bachelor", profile: "design_rich", evidence: EVIDENCE, tag: "07_학사BASIC_경험있음" });
await run({ tier: "STANDARD", stage: "master", profile: "design_rich", evidence: EVIDENCE, tag: "08_석사STANDARD" });
await run({ tier: "PRO", stage: "phd", profile: "researcher", evidence: EVIDENCE, tag: "09_박사PRO" });
await run({ tier: "PRO", stage: "postdoc", profile: "researcher", evidence: EVIDENCE, tag: "10_포닥PRO" });

await browser.close();
srv.close();
console.log(shots.join("\n"));
