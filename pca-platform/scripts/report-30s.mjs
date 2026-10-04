/**
 * 30초 검사와 3분 검사.
 *
 * 규격이 합격 기준으로 든 것을 **세어서** 본다. 첫 쪽만 보고 넷을 답할 수
 * 있는가, 1~3쪽을 읽고 넷을 더 답할 수 있는가.
 *
 * 사람이 읽는 속도를 대신 잴 수는 없으니 **답이 그 자리에 실제로 있는지**를
 * 본다. 눈으로 확인하는 것은 못 막지만, 답이 없는데 있다고 넘어가는 것은
 * 막는다.
 *
 *   node scripts/report-30s.mjs
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const ROOT = "sites/pca-platform";
const PORT = 8243;
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};
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

const EV = {
  kinds: ["course", "project", "tool"],
  courses: ["정역학", "재료역학", "기계요소설계"].map((n) => ({ n })),
  projects: [{
    id: "p1", title: "브래킷 경량화 캡스톤", type: "capstone",
    period: { start: "2025-03", end: "2025-12" }, team_size: "4", my_role: "구조 검토",
    objective: "강성 유지하며 무게 줄이기",
    what_i_did: "요구조건을 치수로 옮기고 설계안 세 개를 비교했습니다",
    decisions_i_made: "리브 배치와 두께를 골랐습니다",
    tools: ["SolidWorks"], methods: ["하중 경로 분석"], outputs: ["도면"],
    result: "", measurable_result: "시험 기준 대비 15% 여유",
    difficulty: "", what_changed: "최종안 채택", what_i_learned: "",
  }],
  /* 뜻 없는 입력을 일부러 섞는다. 본문에 새면 안 된다 */
  tools: [
    { cat: "cad", name: "SolidWorks", level: "used", where: "", why: "형상안 비교",
      exp_id: "p1", decision: "리브 배치 선택", output: "도면", validation: "허용 응력 기준과 비교" },
    { cat: "cae", name: "ANSYS Mechanical", level: "used", where: "", why: "ㅁㅁㅁㅁㅁ",
      exp_id: "", decision: "asdf", output: "", validation: "" },
  ],
};

const T = [];
const ok = (n, pass, d) => T.push({ n, pass: !!pass, d: d || "" });

const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const c = await browser.newContext({ viewport: { width: 1180, height: 1000 } });
const p = await c.newPage();
const B = `http://127.0.0.1:${PORT}/v2.html`;
await p.goto(B, { waitUntil: "networkidle" });
await p.evaluate(() => { try { localStorage.clear(); } catch {} });
await p.evaluate((e) => {
  const E = window.PCAEvidence;
  E.saveEvidence(Object.assign(E.emptyEvidence(), e));
  E.saveResearch([]);
}, EV);
await p.goto(`${B}?fresh=1&tier=PRO&stage=phd`, { waitUntil: "networkidle" });
await p.click("#v2ToStage"); await p.click("#v2ToQ");
let g = 0;
while (g++ < 40) {
  const done = await p.evaluate(() => {
    const bk = window.PCA_V2_ITEMS.ME;
    const all = [].concat(bk.core.items, bk.standard.items, bk.pro.items);
    for (const n of document.querySelectorAll("#v2QBody .v2q")) {
      const it = all.find((x) => x.item_id === n.getAttribute("data-id"));
      const fam = Object.keys(it.career_family_weights || {});
      const hit = fam.includes("ME_DESIGN_PRODUCT") || fam.includes("ME_CAE_SIM");
      if (it.options) n.querySelector(".v2chip")?.click();
      else {
        let v = 4;
        if (it.construct === "actual_work_interest") v = hit ? 5 : 2;
        if (it.construct === "exposure") v = hit ? 4 : 2;
        if (it.construct === "learning_intent") v = hit ? 5 : 2;
        n.querySelector(`.v2opt[data-v="${v}"]`)?.click();
      }
    }
    return !!document.getElementById("v2Next");
  });
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

const R = await p.evaluate(() => {
  const pages = [...document.querySelectorAll("#v2ResultBody .rpage")];
  return {
    page1: pages[0]?.innerText ?? "",
    first3: pages.slice(0, 3).map((x) => x.innerText).join("\n"),
    titles: pages.map((x) => x.querySelector(".rptitle")?.textContent.trim() ?? ""),
    all: document.getElementById("v2ResultBody").innerText,
    top3: [...document.querySelectorAll("#v2ResultBody .dscard h3")].map((x) => x.textContent.trim()),
    gapName: document.querySelector("#v2ResultBody .dsgapname")?.textContent.trim() ?? "",
    action: document.querySelector("#v2ResultBody .dsact p")?.textContent.trim() ?? "",
    appendix: [...document.querySelectorAll("#v2ResultBody .apsec h3")].map((x) => x.textContent.trim()),
    warnings: window.PCA_V2_INPUT_WARNINGS ?? [],
    /* 규격 §30: 머리에 붙는 띠와 접히는 상세 분석 */
    nav: [...document.querySelectorAll("#v2ResultBody .rpnav a")].map((x) => x.textContent.trim()),
    navTargets: [...document.querySelectorAll("#v2ResultBody .rpnav a")]
      .map((x) => !!document.querySelector(x.getAttribute("href"))),
    folded: !!document.querySelector("#v2ResultBody .apbody.is-folded"),
    /* 규격 §37: 첫 쪽을 만드는 객체 하나 */
    summary: window.PCA_V2_DECISION_SUMMARY ?? null,
    /* 규격 §10: 번역이 덜 된 경험 카드의 세 칸 */
    utLabels: [...document.querySelectorAll("#v2ResultBody .utrow > span:first-child")]
      .map((x) => x.textContent.trim()),
  };
});

/* ── 30초: 첫 쪽만 보고 ──────────────────────────────────────────── */
ok("30초 ① 먼저 볼 직무 셋이 첫 쪽에 있다", R.top3.length === 3, R.top3.join(" · "));
ok("30초 ② 왜 그런지가 첫 쪽에 있다",
  /관심|경험|확인|비어/.test(R.page1) && R.page1.includes("지금 결과에서 가장 중요한 것"));
ok("30초 ③ 가장 큰 공백이 첫 쪽에 있다", R.gapName.length > 1, R.gapName);
ok("30초 ④ 지금 할 일이 첫 쪽에 있다", R.action.length > 10, R.action.slice(0, 50));

ok("첫 쪽에 문항 번호가 없다", !/\bQ\d+/.test(R.page1));
ok("첫 쪽에 측정 방법 설명이 없다",
  !/표준오차|신뢰구간|측정 오차를 산출|문항 가운데/.test(R.page1));
ok("첫 쪽이 열여섯 직무를 늘어놓지 않는다", R.top3.length === 3 &&
  (R.page1.match(/기계설계|CAE|R&D|시험|생산|공정|품질|설비|자동화|열·유체|재료|기술기획|기술지원|컨설팅|연구원|디지털/g) || []).length <= 8);

/* ── 3분: 1~3쪽 ─────────────────────────────────────────────────── */
ok("3분 ① 왜 그 직무가 나왔는지", /쪽으로 답하셨습니다|관심|해보고 싶은/.test(R.first3));
ok("3분 ② 전공지식이 실제 업무로", /배운 것이 실제 업무에서/.test(R.all));
ok("3분 ③ 지금 가진 증거", /지금 내가 가진 증거/.test(R.all));
ok("3분 ④ 부족한 증거", /아직 확인되지 않은 것|아직 필요한 증거/.test(R.all));

/* ── 구조 ───────────────────────────────────────────────────────── */
ok("본문이 여덟에서 열한 쪽", R.titles.length >= 8 && R.titles.length <= 11,
  `${R.titles.length}쪽 · ${R.titles.join(" / ")}`);
ok("부록이 따로 있다", R.appendix.length >= 5, R.appendix.join(" / "));
{
  const body = R.all.split("부록")[0];
  ok("문항 번호가 본문에 없다", !/\bQ\d+/.test(body),
    (body.match(/\bQ\d+/) || [])[0] || "");
  ok("문항 번호를 부록에서는 되짚을 수 있다",
    R.appendix.some((t) => /어느 문항이/.test(t)));
}

/* ── 문체 ───────────────────────────────────────────────────────── */
{
  const banned = ["적합합니다", "강점입니다", "경쟁력이 있", "우수합니다", "합격 가능성이 높"];
  const hit = banned.filter((b) => R.all.includes(b));
  ok("금지한 표현을 쓰지 않는다", hit.length === 0, hit.join(" "));
  ok("권장하는 말투를 쓴다",
    /현재 입력에서|아직 확인되지 않|까지 확인됩니다|확인되는 것은/.test(R.all));
}

/* ── 뜻 없는 입력 ───────────────────────────────────────────────── */
ok("뜻 없는 입력이 본문에 새지 않는다",
  !/ㅁㅁㅁ|asdf/.test(R.all), (R.all.match(/ㅁㅁㅁ|asdf/) || [])[0] || "");
ok("뜻 없는 입력을 안쪽 경고로 남긴다", R.warnings.length > 0,
  `${R.warnings.length}건`);
ok("뜻 없는 입력의 의도를 지어내지 않는다",
  !/추정|아마|로 보입니다/.test(R.all));

/* ── 규격 §30: 웹에서 옮겨 다니기 ───────────────────────────────── */
ok("결과지 안에서 옮겨 갈 띠가 있다", R.nav.length >= 5, R.nav.join(" · "));
ok("띠가 가리키는 쪽이 실제로 있다", R.navTargets.every(Boolean),
  `${R.navTargets.filter(Boolean).length}/${R.navTargets.length}`);
ok("띠에 요약과 다음 행동이 있다",
  R.nav.includes("요약") && R.nav.includes("다음 행동"), R.nav.join(" · "));
ok("상세 분석이 처음에는 접혀 있다", R.folded);

/* ── 규격 §37: 첫 쪽을 만드는 객체 ──────────────────────────────── */
{
  const S = R.summary || {};
  const keys = ["top_roles", "key_findings", "critical_gap", "next_action", "confidence_note"];
  const miss = keys.filter((k) => !(k in S));
  ok("첫 쪽이 객체 하나에서 나온다", miss.length === 0, miss.join(" ") || keys.join(" · "));
  ok("그 객체의 직무 셋이 첫 쪽과 같다",
    (S.top_roles || []).map((r) => r.name).join("|") === R.top3.join("|"),
    (S.top_roles || []).map((r) => r.name).join(" · "));
  ok("그 객체에 합산 점수가 없다",
    !JSON.stringify(S).match(/"(score|total_score|fit)"/), "");
}

/* ── 규격 §10: 번역이 덜 된 경험의 세 칸 ────────────────────────── */
if (R.utLabels.length) {
  const want = ["지금 적어 주신 것", "지금 확인되는 것", "아직 확인되지 않음"];
  ok("번역이 덜 된 경험이 세 칸으로 적힌다",
    want.every((w) => R.utLabels.includes(w)),
    R.utLabels.slice(0, 3).join(" / "));
}

/* ── 중복 ───────────────────────────────────────────────────────── */
{
  const top = R.top3[0];
  const n = (R.titles.filter((t) => t === top) || []).length;
  ok("한 직무가 본문 제목에 두 번 오르지 않는다", n <= 1, `${top} ${n}번`);
}

await browser.close(); srv.close();
let bad = 0;
T.forEach((t) => { if (!t.pass) bad += 1;
  console.log(`  ${t.pass ? "OK  " : "실패"} ${t.n}${t.d ? "  (" + t.d + ")" : ""}`); });
console.log(bad ? `\n${bad}개가 깨졌다.` : "\n30초·3분 검사 OK.");
process.exit(bad ? 1 : 0);
