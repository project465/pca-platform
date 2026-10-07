/**
 * **결과지를 사람처럼 읽는다.**
 *
 * 쪽수를 세는 검사(`v2:pdf`)와 답이 그 자리에 있는지 보는 검사
 * (`report:30s`)는 이미 있다. 없던 것은 **나간 글자를 그대로 꺼내 읽는
 * 자리**다. 반복되는 고지, 명사만 늘어놓은 줄, 내부 용어가 그대로 나온
 * 자리는 세어서 잡히지 않고 읽어야 보인다.
 *
 *   node scripts/report-read.mjs            # BASIC·STANDARD·PRO
 *   TIERS=BASIC node scripts/report-read.mjs
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const ROOT = "sites/pca-platform";
const PORT = 8251;
const OUT = "/tmp/claude-0/report-text";
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png",
};
mkdirSync(OUT, { recursive: true });

const srv = await new Promise((ok) => {
  const s = createServer((q, r) => {
    const rel = normalize(decodeURIComponent(q.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    let f = join(ROOT, rel === "/" ? "index.html" : rel);
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
    if (!existsSync(f)) { r.writeHead(404); r.end("no"); return; }
    r.writeHead(200, { "content-type": MIME[extname(f)] || "text/plain; charset=utf-8" });
    r.end(readFileSync(f));
  });
  s.listen(PORT, "127.0.0.1", () => ok(s));
});

/** 설계 쪽으로 기운 사람. `v2-pdf` 가 쓰는 것과 같은 모양이다 */
const FILL = (it, fam) => {
  const hit = fam.includes("ME_DESIGN_PRODUCT") || fam.includes("ME_CAE_SIM");
  if (it.construct === "actual_work_interest") return hit ? 5 : 2;
  if (it.construct === "exposure") return hit ? 4 : 2;
  if (it.construct === "learning_intent") return hit ? 5 : 2;
  return 4;
};

const EV = {
  kinds: ["course", "project", "tool"],
  courses: ["정역학", "재료역학", "기계요소설계", "유한요소해석"].map((n) => ({ n })),
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
  tools: [{ cat: "cad", name: "SolidWorks", level: "used", where: "",
    why: "형상안 비교", exp_id: "p1", decision: "리브 배치 선택",
    output: "도면", validation: "허용 응력 기준과 비교" }],
};

const browser = await chromium.launch();
const tiers = (process.env.TIERS ?? "BASIC,STANDARD,PRO").split(",").map((x) => x.trim());
const rich = (process.env.RICH ?? "1") === "1";

for (const tier of tiers) {
  const c = await browser.newContext({ viewport: { width: 1180, height: 1000 } });
  const p = await c.newPage();
  const B = `http://127.0.0.1:${PORT}/v2.html`;
  await p.goto(B, { waitUntil: "networkidle" });
  await p.evaluate(() => { try { localStorage.clear(); } catch { /* 비공개 창 */ } });
  if (rich) {
    await p.evaluate((e) => {
      const E = window.PCAEvidence;
      E.saveEvidence(Object.assign(E.emptyEvidence(), e));
      E.saveResearch([]);
      E.saveTarget(Object.assign(E.loadTarget(), { target_org_type: "private_company" }));
    }, EV);
  }
  await p.goto(`${B}?fresh=1&tier=${tier}&stage=bachelor&lang=ko`, { waitUntil: "networkidle" });
  await p.click("#v2ToStage"); await p.click("#v2ToQ");
  let g = 0;
  while (g++ < 40) {
    const more = await p.evaluate((src) => {
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
    if (!more) break;
    await p.click("#v2Next"); await p.waitForTimeout(90);
    const at = await p.evaluate(() =>
      [...document.querySelectorAll(".screen")].find((s) => s.classList.contains("active"))?.id);
    if (at !== "s2-question") break;
  }
  const at = await p.evaluate(() =>
    [...document.querySelectorAll(".screen")].find((s) => s.classList.contains("active"))?.id);
  if (at === "s2-evidence") {
    await p.evaluate(() => window.PCAV2App.showResult());
    await p.waitForTimeout(500);
  }

  /* **쪽마다 따로 꺼낸다.** 한 덩이로 뽑으면 어느 쪽에서 같은 고지가
     또 나오는지 보이지 않는다 */
  /* **알약(.tag)은 화면에서 떨어져 보인다.** `innerText` 는 inline-block
     사이에 아무것도 넣지 않아서 "도면해석 리포트" 처럼 붙어 나온다. 그대로
     읽으면 없는 버그를 보고하게 되므로, 읽기 전에 눈에 보이는 간격을
     글자로 바꿔 둔다 */
  const pages = await p.evaluate(() => {
    for (const t of document.querySelectorAll(".tag")) {
      if (t.nextElementSibling && t.nextElementSibling.classList.contains("tag")) {
        t.insertAdjacentText("afterend", " · ");
      }
    }
    const txt = (n) => (n.innerText || "").replace(/\n{3,}/g, "\n\n").trim();
    const main = [...document.querySelectorAll(".rpage")].map((n, i) =>
      ({ kind: "본문", no: i + 1, text: txt(n) }));
    const apx = [...document.querySelectorAll(".apsec")].map((n, i) =>
      ({ kind: "부록", no: i + 1, text: txt(n) }));
    return main.concat(apx);
  });
  const file = join(OUT, `${tier}${rich ? "" : "_경험없음"}.txt`);
  writeFileSync(file, pages.map((x) =>
    `\n${"=".repeat(70)}\n[${x.kind} ${x.no}]\n${"=".repeat(70)}\n${x.text}`).join("\n"));
  console.log(`  ${tier.padEnd(9)} 본문 ${pages.filter((x) => x.kind === "본문").length}쪽 · ` +
    `부록 ${pages.filter((x) => x.kind === "부록").length}절 → ${file}`);
  await c.close();
}
await browser.close();
srv.close();
