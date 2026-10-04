/**
 * ME_V2 전체 흐름을 실제 브라우저로 돌린다.
 *
 * 규격이 요구한 열 가지 경우(학사 BASIC ~ 상위 둘이 비슷한 응시자)를 끝까지
 * 풀고, V1 이 그대로인지도 같은 자리에서 확인한다.
 *
 *   node scripts/v2-flow-check.mjs
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const ROOT = "sites/pca-platform";
const PORT = 8234;
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

/* 응답을 만드는 성향. 문항의 직무군 가중치를 보고 값을 정한다. */
const PROFILES = {
  design_rich: (it, fam) => {
    const hit = fam.includes("ME_DESIGN_PRODUCT") || fam.includes("ME_CAE_SIM");
    if (it.construct === "actual_work_interest") return hit ? 5 : 2;
    if (it.construct === "exposure") return hit ? 4 : 2;
    if (it.construct === "learning_intent") return hit ? 5 : 2;
    return 4;
  },
  interest_no_exp: (it, fam) => {
    const hit = fam.includes("ME_CAE_SIM");
    if (it.construct === "actual_work_interest") return hit ? 5 : 2;
    if (it.construct === "exposure") return 1;
    if (it.construct === "learning_intent") return hit ? 5 : 2;
    return 3;
  },
  exp_no_interest: (it, fam) => {
    const hit = fam.includes("ME_MANUFACTURING");
    if (it.construct === "actual_work_interest") return hit ? 1 : 3;
    if (it.construct === "exposure") return hit ? 5 : 2;
    return 3;
  },
  tied: (it, fam) => {
    const a = fam.includes("ME_DESIGN_PRODUCT"), b = fam.includes("ME_CAE_SIM");
    if (it.construct === "actual_work_interest") return a || b ? 5 : 2;
    if (it.construct === "exposure") return a || b ? 3 : 2;
    return 4;
  },
  researcher: (it) => {
    if (it.construct === "research_project_evidence") return 5;
    if (it.construct === "decision_ownership") return 4;
    return 4;
  },
  flat: () => 3,
};

/* 넣을 경험 한 벌 */
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
      cat: "cad", name: "SolidWorks", level: "used", where: "", why: "형상 비교",
      exp_id: "p1", decision: "리브 배치를 고름", output: "도면",
      validation: "허용 응력 기준과 비교",
    }],
  },
  rp: [],
};

/* 도구 이름만 적은 사람. 활동까지만 확인돼야 한다 */
const EVIDENCE_NAME_ONLY = {
  ev: {
    kinds: ["tool"],
    tools: [{ cat: "cae", name: "ANSYS Mechanical", level: "used", where: "", why: "" }],
  },
  rp: [],
};

async function runV2(browser, { tier, stage, profile, evidence }) {
  const c = await browser.newContext({ viewport: { width: 1100, height: 980 } });
  const p = await c.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
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
  await p.click("#v2ToStage");
  await p.click("#v2ToQ");

  /* 섹션을 돌며 전부 답한다. 값은 성향 함수가 정한다. */
  const fill = PROFILES[profile];
  let guard = 0;
  while (guard++ < 40) {
    const done = await p.evaluate((src) => {
      const by = new Function("it", "fam", "return (" + src + ")(it, fam)");
      const S = window.PCAV2App.state();
      const bank = window.PCA_V2_ITEMS.ME;
      const all = [].concat(bank.core.items, bank.standard.items, bank.pro.items);
      const sec = document.querySelectorAll("#v2QBody .v2q");
      for (const node of sec) {
        const id = node.getAttribute("data-id");
        const it = all.find((x) => x.item_id === id);
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
  /* 경험 화면이 떴으면 넘어간다(이미 넣어 둔 경험은 그대로 쓴다) */
  let at = await p.evaluate(() =>
    [...document.querySelectorAll(".screen")].find((s) => s.classList.contains("active"))?.id);
  if (at === "s2-evidence") {
    await p.evaluate(() => window.PCAV2App.showResult());
    await p.waitForTimeout(300);
  }
  const out = await p.evaluate(() => ({
    screen: [...document.querySelectorAll(".screen")].find((s) => s.classList.contains("active"))?.id,
    J: window.PCA_V2_RESULT_JSON,
    v1key: localStorage.getItem("pca_session_v1"),
    v2key: !!localStorage.getItem("pca_v2_session_v1"),
    /* 새 결과지는 모듈이 아니라 **쪽**으로 센다. 한 쪽에 메시지 하나 */
    heads: [...document.querySelectorAll("#v2ResultBody .rpage .rptitle")]
      .map((x) => x.textContent.trim()),
    appendix: [...document.querySelectorAll("#v2ResultBody .apsec h3")]
      .map((x) => x.textContent.trim()),
    rows: [...document.querySelectorAll("#v2ResultBody .v2tw tbody tr")].length,
    text: document.getElementById("v2ResultBody")?.innerText || "",
  }));
  await c.close();
  return { ...out, errs };
}

const T = [];
const ok = (n, pass, d) => T.push({ n, pass, d: d || "" });

const srv = await serve();
const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox"] });

/* ── 1~5. 단계 × 상품 ────────────────────────────────────────────── */
const cases = [
  ["1 학사 BASIC", { tier: "BASIC", stage: "bachelor", profile: "design_rich" }, 48],
  ["2 학사 PRO", { tier: "PRO", stage: "bachelor", profile: "design_rich" }, 92],
  ["3 석사 STANDARD", { tier: "STANDARD", stage: "master", profile: "design_rich" }, 68],
  ["4 박사 PRO", { tier: "PRO", stage: "phd", profile: "researcher" }, 92],
  ["5 포닥 PRO", { tier: "PRO", stage: "postdoc", profile: "researcher" }, 92],
];
const got = {};
for (const [name, cfg, n] of cases) {
  const r = await runV2(browser, { ...cfg, evidence: EVIDENCE });
  got[name] = r;
  ok(`${name} 끝까지 간다`,
    r.screen === "s2-result" && r.J && r.J.assessment.item_count === n && r.errs.length === 0,
    `문항 ${r.J?.assessment.item_count} · 절 ${r.heads.length} · 표 ${r.rows}줄 · 오류 ${r.errs.length}`);
}

/* ── 6. 경험 미입력 ──────────────────────────────────────────────── */
const bare = await runV2(browser, { tier: "BASIC", stage: "bachelor", profile: "design_rich" });
ok("6 경험 미입력도 결과가 나온다",
  bare.screen === "s2-result" && bare.J.evidence_supplied === false &&
  /경험 추가하기/.test(bare.text) && bare.errs.length === 0);

/* ── 7. 경험 풍부 ────────────────────────────────────────────────── */
const rich = got["1 학사 BASIC"];
ok("7 경험을 넣으면 증거 준비도가 생긴다",
  rich.J.evidence_supplied === true &&
  rich.J.decision_table.some((r) => r.evidence_readiness),
  rich.J.decision_table[0]?.evidence_readiness?.level || "");

/* ── 8. 관심 높음 + 경험 없음 ────────────────────────────────────── */
{
  const r = await runV2(browser, { tier: "BASIC", stage: "bachelor", profile: "interest_no_exp" });
  const row = r.J.decision_table.find((x) => x.career_family_id === "ME_CAE_SIM");
  ok("8 관심만 높으면 지원 단계로 가지 않는다",
    row && row.interest.level === "high" && row.exposure.level === "low" &&
    row.decision_status !== "READY_TO_APPLY",
    `${row?.interest.level}/${row?.exposure.level} → ${row?.decision_status}`);
}
/* ── 9. 경험 높음 + 관심 낮음 ────────────────────────────────────── */
{
  const r = await runV2(browser, { tier: "BASIC", stage: "bachelor", profile: "exp_no_interest" });
  const row = r.J.decision_table.find((x) => x.career_family_id === "ME_MANUFACTURING");
  ok("9 경험만 많으면 곁에 두는 후보로 둔다",
    row && row.decision_status === "ADJACENT_OPTION", row?.decision_status || "");
}
/* ── 10. 상위 둘이 비슷한 응시자 ─────────────────────────────────── */
{
  const r = await runV2(browser, { tier: "BASIC", stage: "bachelor", profile: "tied" });
  const [a, b] = r.J.decision_table;
  ok("10 상위 둘이 비슷하면 둘 다 같은 단계로 나온다",
    a && b && Math.abs(a.interest.score - b.interest.score) < 8 &&
    a.decision_status === b.decision_status,
    `${a?.name} ${a?.decision_status} / ${b?.name} ${b?.decision_status}`);
}

/* ── 데이터 보호 (규격 13장) ─────────────────────────────────────── */
{
  const r = got["2 학사 PRO"];
  ok("V2 응답이 V1 키에 들어가지 않는다", r.v1key === null && r.v2key === true,
    `v1=${r.v1key === null ? "비어 있음" : "들어 있다"} · v2=${r.v2key}`);
}
{
  /* 경험을 바꿔도 다섯 값이 그대로인가 */
  const a = await runV2(browser, { tier: "STANDARD", stage: "master", profile: "design_rich" });
  const b = await runV2(browser, { tier: "STANDARD", stage: "master", profile: "design_rich", evidence: EVIDENCE });
  const same = JSON.stringify(a.J.actual_work_interest) === JSON.stringify(b.J.actual_work_interest) &&
    JSON.stringify(a.J.work_mode) === JSON.stringify(b.J.work_mode) &&
    JSON.stringify(a.J.exposure) === JSON.stringify(b.J.exposure) &&
    JSON.stringify(a.J.decision_ownership) === JSON.stringify(b.J.decision_ownership);
  const rdChanged = !a.J.decision_table[0].evidence_readiness &&
    !!b.J.decision_table[0].evidence_readiness;
  ok("경험을 넣어도 다섯 값이 그대로다", same, same ? "" : "값이 달라졌다");
  ok("경험을 넣으면 증거 준비도만 달라진다", rdChanged);
}
/* ── 합산 점수가 없다 ────────────────────────────────────────────── */
{
  const J = got["5 포닥 PRO"].J;
  const bad = Object.keys(J).filter((k) => /career_score|employab|potential|총점|composite/i.test(k));
  const txt = got["5 포닥 PRO"].text;
  ok("합산 점수와 종합 적합도가 없다",
    bad.length === 0 && !/종합\s*적합도|Career Score|Employability/i.test(txt),
    bad.join(","));
}
/* ── 조직 가치 다리가 실제로 채워진다 ────────────────────────────── */
{
  const r = got["4 박사 PRO"], J = r.J;
  const vp = J.value_path && J.value_path.paths;
  const first = vp && vp[J.value_path.order[0]];
  ok("비어 있던 세 칸이 채워졌다",
    !!J.organization_context && !!first && Array.isArray(J.performance_evidence) &&
    J.performance_evidence.length > 0,
    `사슬 ${vp ? Object.keys(vp).length : 0}개 · 경험 ${J.performance_evidence.length}건`);
  ok("ValuePath 가 규격의 칸을 다 가진다", !!first &&
    ["career_family_id", "organization_type", "academic_inputs", "tools_technologies",
     "work_activities", "technical_decisions", "outputs", "performance_criteria",
     "organizational_value", "user_evidence", "untranslated_evidence",
     "missing_evidence", "next_validation_actions"].every((k) => k in first),
    first ? Object.keys(first).length + "칸" : "");
  ok("전공지식이 노출과 사용으로 갈린다", !!first &&
    first.academic_inputs.some((a) => a.confidence !== "unknown"),
    first ? first.academic_inputs.map((a) => a.label + ":" + a.confidence).slice(0, 3).join(" ") : "");
  const four = {
    "전공지식의 실무 전환": /배운 것이 실제 업무에서/.test(r.text),
    "지금 내 증거": /지금 내가 가진 증거/.test(r.text),
    "같은 전공 다른 조직": /같은 전공도 조직에 따라/.test(r.text),
  };
  ok("결과지에 시그니처 화면이 보인다",
    Object.values(four).every(Boolean),
    Object.keys(four).filter((k) => !four[k]).join(" · ") || "셋 다");
  // 네 번째(번역 안 된 경험)는 번역이 덜 된 경험이 있을 때만 뜬다.
  // 다 채우신 분에게 빈 절을 띄우면 없는 문제를 만들어 보이게 된다.
  const thin = await runV2(browser, {
    tier: "PRO", stage: "phd", profile: "researcher", evidence: EVIDENCE_NAME_ONLY,
  });
  ok("번역이 덜 된 경험이 있으면 그 자리가 뜬다",
    /성과 언어로 번역되지 않은 경험/.test(thin.text),
    "도구 이름만 적은 분에게 뜬다");
}
/* ── 역할별 증거 범위 ────────────────────────────────────────────── */
{
  const r = got["4 박사 PRO"], J = r.J;
  const cv = J.role_evidence_coverage;
  const first = cv && cv[J.decision_table[0].career_family_id];
  ok("직무마다 증거 범위가 나온다",
    !!first && Array.isArray(first.coverage) && first.coverage.length >= 8,
    first ? `${Object.keys(cv).length}개 직무 · 영역 ${first.coverage.length}` : "");
  ok("깊이와 범위를 따로 담는다",
    !!J.evidence_depth && !!J.role_evidence_coverage &&
    !("coverage" in (J.evidence_depth || {})),
    `깊이 ${JSON.stringify(J.evidence_depth).slice(0, 40)}`);
  ok("범위를 점수로 바꾸지 않는다",
    !/\d+\s*점|\d+\s*%\s*확인|커리어 ?점수/.test(r.text) &&
    typeof first.summary.core.confirmed === "number" &&
    !("score" in first.summary));
  ok("결과지에 확인·부분·아직이 보인다",
    /현재 확인된 것|일부 확인|아직 확인되지 않음/.test(r.text) &&
    /핵심 영역/.test(r.text));
  ok("못 한다고 쓰지 않는다",
    !/능력이 부족|실력이 없|못 하십니다|미달/.test(r.text));
}
/* ── 증거가 모자라면 설명할 근거 있음으로 올리지 않는다 ─────────── */
{
  const weak = await runV2(browser, {
    tier: "BASIC", stage: "bachelor", profile: "design_rich",
    evidence: EVIDENCE_NAME_ONLY,
  });
  const anyApply = weak.J.decision_table.some(
    (r) => r.decision_status === "APPLICATION_EVIDENCE_AVAILABLE");
  ok("도구 이름만으로는 설명할 근거 있음이 되지 않는다", !anyApply,
    weak.J.decision_table.slice(0, 2).map((r) => r.decision_status).join(" / "));
  ok("옛 상태를 더 쓰지 않는다",
    !weak.J.decision_table.some((r) => r.decision_status === "READY_TO_APPLY") &&
    !/지원 준비 단계/.test(weak.text));
  const bare2 = await runV2(browser, { tier: "BASIC", stage: "bachelor", profile: "design_rich" });
  ok("경험을 안 적으셨다고 깎지 않는다",
    bare2.J.decision_table[0].decision_status === "COMPARE_ROLES",
    bare2.J.decision_table[0].decision_status);
}
/* ── 조직을 바꿔도 다섯 값이 그대로다 ───────────────────────────── */
{
  const a = await runV2(browser, {
    tier: "STANDARD", stage: "master", profile: "design_rich",
    evidence: Object.assign({}, EVIDENCE, { org: "private_company" }),
  });
  const b = await runV2(browser, {
    tier: "STANDARD", stage: "master", profile: "design_rich",
    evidence: Object.assign({}, EVIDENCE, { org: "government_research_institute" }),
  });
  const same = ["actual_work_interest", "exposure", "decision_ownership", "work_mode",
    "learning_intent"].every((k) => JSON.stringify(a.J[k]) === JSON.stringify(b.J[k]));
  const fa = a.J.value_path.paths[a.J.value_path.order[0]];
  const fb = b.J.value_path.paths[b.J.value_path.order[0]];
  ok("조직을 바꿔도 다섯 값이 그대로다", same);
  ok("조직을 바꿔도 증거 범위가 같다",
    JSON.stringify(a.J.role_evidence_coverage) ===
      JSON.stringify(b.J.role_evidence_coverage));
  ok("조직을 바꾸면 ValuePath 만 갈린다",
    fa.outputs[0] !== fb.outputs[0] &&
    fa.evidence_top_level === fb.evidence_top_level,
    `${fa.outputs[0]} ↔ ${fb.outputs[0]}`);
}
/* ── 도구 이름을 숙련으로 읽지 않는다 ───────────────────────────── */
{
  const r = await runV2(browser, {
    tier: "STANDARD", stage: "bachelor", profile: "design_rich",
    evidence: EVIDENCE_NAME_ONLY,
  });
  const t = r.J.tool_evidence[0];
  ok("도구 이름만이면 활동까지만 적는다", t && t.evidence_level === "E0",
    t && t.evidence_level);
  ok("역량 보유라고 쓰지 않는다",
    !/ANSYS[^.]{0,20}(역량|능력|숙련|다룰 수 있)/.test(r.text) &&
    !/도구를?\s*\d+개/.test(r.text));
}
/* ── 계획이 비어 있는 자리에서 나온다 ───────────────────────────── */
{
  const phd = got["4 박사 PRO"], pd = got["5 포닥 PRO"];
  ok("박사와 포닥의 계획 문장이 다르다",
    /직접 정한 것과 받은 것/.test(phd.text) &&
    /맡아서 끌고 간 범위/.test(pd.text) &&
    !/맡아서 끌고 간 범위/.test(phd.text));
  ok("PRO 는 30·90·365 를 다 낸다",
    /30일 동안/.test(phd.text) && /90일 동안/.test(phd.text) &&
    /365일 동안/.test(phd.text));
  const b1 = got["1 학사 BASIC"];
  ok("BASIC 은 30일만 낸다",
    /30일 동안/.test(b1.text) && !/365일 동안/.test(b1.text));
}
/* ── 비어 있는 자리를 고르기로 채우게 한다 ─────────────────────── */
{
  const thin = await runV2(browser, {
    tier: "STANDARD", stage: "bachelor", profile: "design_rich",
    evidence: EVIDENCE_NAME_ONLY,
  });
  ok("되물음이 보기로 나온다",
    /고르기만 하시면 됩니다/.test(thin.text) &&
    /비교하지 않았습니다|남은 것이 없습니다|확인하지 못했습니다/.test(thin.text));
  ok("되물음이 아직 확인되지 않은 자리에 붙는다",
    thin.heads.some((h) => /아직 확인되지 않은 것/.test(h)), thin.heads.join(" / "));
  ok("긴 주관식을 요구하지 않는다",
    !/자유롭게 서술|상세히 적어|구체적으로 서술/.test(thin.text));
}
/* ── 상품마다 깊이가 다르다 ──────────────────────────────────────── */
{
  const b = got["1 학사 BASIC"], s = got["3 석사 STANDARD"], p = got["2 학사 PRO"];
  ok("BASIC < STANDARD < PRO 로 쪽이 는다",
    b.heads.length < s.heads.length && s.heads.length < p.heads.length,
    `${b.heads.length} → ${s.heads.length} → ${p.heads.length}쪽`);
  /* 본문이 다시 부풀지 않게 위도 막는다. 스무 쪽짜리로 돌아가면 실패다 */
  ok("본문이 열한 쪽을 넘지 않는다", p.heads.length <= 11, `PRO ${p.heads.length}쪽`);
  ok("BASIC 이 네댓 쪽이다", b.heads.length >= 4 && b.heads.length <= 6,
    `${b.heads.length}쪽`);
  ok("부록이 본문 밖에 따로 있다", p.appendix.length >= 5,
    p.appendix.join(" / "));
}
/* ── 단계마다 문장이 갈린다 ──────────────────────────────────────── */
{
  const a = got["4 박사 PRO"], b = got["5 포닥 PRO"];
  ok("박사와 포닥이 다른 문장을 받는다",
    a.J.education_stage_lens.question !== b.J.education_stage_lens.question);
}

/* ── V1 회귀: 옛 검사가 그대로 도는가 ────────────────────────────── */
{
  const c = await browser.newContext({ viewport: { width: 1100, height: 980 } });
  const p = await c.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  const B = `http://127.0.0.1:${PORT}/index.html`;
  await p.goto(B, { waitUntil: "networkidle" });
  await p.evaluate(() => { try { localStorage.clear(); } catch {} });
  await p.goto(`${B}?major=ME&form=QUICK&fresh=1`, { waitUntil: "networkidle" });
  const at = () => p.evaluate(() =>
    [...document.querySelectorAll(".screen")].find((s) => s.classList.contains("active"))?.id);
  if ((await at()) === "s-stage") {
    await p.click('#stageList .major[data-code="UNDERGRAD"]').catch(() => p.click("#stageList .major"));
    await p.click("#btnStageNext");
  }
  if ((await at()) === "s-major") {
    await p.click("#majorList .major:not([disabled])"); await p.click("#btnMajorNext");
  }
  await p.fill("#pfName", "이수민"); await p.click('#pfGender .seg[data-v="F"]');
  await p.fill("#pfSid", "20231234"); await p.check("#pfAgree"); await p.click("#btnProfileNext");
  const qidx = () => p.evaluate(() => {
    try { return JSON.parse(localStorage.getItem("pca_session_v1")).idx; } catch { return -1; }
  });
  for (let g = 0; g < 400; g++) {
    if ((await at()) === "s-result") break;
    const n = await p.$$eval("#opts .opt", (e) => e.length).catch(() => 0);
    if (!n) break;
    const i0 = await qidx();
    await p.click(`#opts .opt:nth-child(${Math.min(n, 1 + ((i0 * 7) % 5))})`).catch(() => {});
    for (let w = 0; w < 40; w++) {
      if ((await qidx()) !== i0 || (await at()) === "s-result") break;
      await p.waitForTimeout(25);
    }
  }
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => ({
    fit: (window.PCA_RESULT_JSON?.job_fit || []).map((x) => `${x.job}:${x.fit}`).join(" "),
    v2key: localStorage.getItem("pca_v2_session_v1"),
    secs: document.querySelectorAll("#resultBody .section").length,
  }));
  await c.close();
  ok("V1 이 그대로 돌고 점수가 나온다",
    !!r.fit && r.secs > 10 && errs.length === 0, `절 ${r.secs} · 오류 ${errs.length}`);
  ok("V1 응시가 V2 키를 만들지 않는다", r.v2key === null);
  writeFileSync("/tmp/v1-fit.txt", r.fit);
}

await browser.close();
srv.close();

let bad = 0;
for (const t of T) {
  console.log(`  ${t.pass ? "OK  " : "실패"} ${t.n}${t.d ? `  (${t.d})` : ""}`);
  if (!t.pass) bad++;
}
console.log(bad ? `\n${bad}개가 깨졌다.` : "\nV2 흐름 검사 OK.");
process.exit(bad ? 1 : 0);
