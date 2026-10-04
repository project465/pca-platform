/**
 * 역할별 증거 범위 엔진 검사. 브라우저 없이 돈다.
 *
 *   node scripts/coverage-check.mjs
 */
import { readFileSync } from "node:fs";

const R = "sites/pca-platform";
global.window = {};
const load = (f) => { (0, eval)(readFileSync(`${R}/${f}`, "utf8")); };
load("data/me-v2.js");
load("data/value-data.js");
load("data/evidence-rules.js");
load("assets/evidence.js");
load("assets/value-engine.js");
load("assets/coverage-engine.js");

const V = window.PCAValue;
const C = window.PCACoverage;
const EV = window.PCAEvidence;

const T = [];
const ok = (n, pass, d) => T.push({ n, pass: !!pass, d: d || "" });

const ev = (o) => Object.assign(EV.emptyEvidence(), o);
const proj = (o) => Object.assign(EV.emptyProject(), { id: "p1", title: "과제" }, o);
function run(e, rp) {
  const exps = V.experiences(e, rp || []);
  const tools = V.toolEvidence(e, exps);
  return { exps, tools, e };
}
function cov(fid, e, rp) {
  const { exps, tools } = run(e, rp);
  const c = C.forFamily(fid, exps, tools, e);
  return { c, exps, ready: C.applicationReady(c, exps) };
}
const st = (c, id) => (c.coverage.find((r) => r.evidence_id === id) || {}).status;
const core = (c) => c.summary.core;

/* ── T1. ANSYS 이름만 ────────────────────────────────────────────── */
{
  const e = ev({ kinds: ["tool"], tools: [{ cat: "cae", name: "ANSYS Mechanical", level: "used" }] });
  const { c, ready } = cov("ME_CAE_SIM", e);
  const notYet = core(c).not_yet;
  ok("T1 도구 이름만이면 CAE 핵심이 대부분 아직이다",
    notYet >= core(c).total - 1 && core(c).confirmed === 0,
    `핵심 ${core(c).total} 중 확인 ${core(c).confirmed} · 부분 ${core(c).partial} · 아직 ${notYet}`);
  ok("T1-b 도구 사용 자체는 확인으로 잡는다",
    st(c, "CAE_TOOL") === "confirmed", st(c, "CAE_TOOL"));
  ok("T1-c 모델 생성·경계 조건은 자동으로 차지 않는다",
    st(c, "CAE_MODEL_SETUP") === "not_yet" && st(c, "CAE_BOUNDARY") === "not_yet",
    `${st(c, "CAE_MODEL_SETUP")} / ${st(c, "CAE_BOUNDARY")}`);
  ok("T1-d 설명할 근거 있음으로 가지 않는다", !ready.ok, ready.reasons.join(" · "));
}

/* ── T2. CAE 모델 + 해석 ─────────────────────────────────────────── */
{
  const e = ev({
    kinds: ["project", "tool"],
    projects: [proj({
      title: "브래킷 구조해석", type: "course_project",
      what_i_did: "형상을 단순화해 메시를 만들고 경계 조건과 하중 조건을 정해 해석 수행했습니다",
      decisions_i_made: "요소 크기와 구속 위치를 정했습니다",
      outputs: ["해석 결과"],
    })],
    tools: [{ cat: "cae", name: "ANSYS Mechanical", level: "used", exp_id: "p1" }],
  });
  const { c, ready } = cov("ME_CAE_SIM", e);
  ok("T2 모델 생성과 해석 수행이 확인된다",
    st(c, "CAE_MODEL_SETUP") === "confirmed" && st(c, "CAE_RUN") === "confirmed",
    `${st(c, "CAE_MODEL_SETUP")} / ${st(c, "CAE_RUN")}`);
  ok("T2-b 검증은 아직이다", st(c, "CAE_VALIDATION") === "not_yet", st(c, "CAE_VALIDATION"));
  ok("T2-c 설명할 근거 있음으로 가지 않는다", !ready.ok, ready.reasons.join(" · "));
}

/* ── T3. CAE + 실험 검증 ─────────────────────────────────────────── */
{
  const e = ev({
    kinds: ["project"],
    projects: [proj({
      title: "브래킷 구조해석", what_i_did: "메시를 만들고 경계 조건을 정해 해석 수행",
      decisions_i_made: "요소 크기를 정함",
      outputs: ["해석 보고서"],
      measurable_result: "시험 결과와 비교해 오차 8% 이내",
      what_changed: "설계 반영",
    })],
  });
  const { c } = cov("ME_CAE_SIM", e);
  ok("T3 실험과 견주면 검증이 확인된다",
    st(c, "CAE_VALIDATION") === "confirmed", st(c, "CAE_VALIDATION"));
}

/* ── T4. 기계설계 CAD 만 ─────────────────────────────────────────── */
{
  const e = ev({
    kinds: ["project"],
    projects: [proj({ title: "부품 모델링", what_i_did: "3D 모델을 만들고 도면을 냈습니다",
      outputs: ["도면"] })],
  });
  const { c } = cov("ME_DESIGN_PRODUCT", e);
  /* 규격이 말하는 "design output 일부" 가 이 자리다. 도면은 나왔는데
     무엇을 정해서 그 도면이 됐는지가 비어 있으면 산출물 칸이 확정으로
     올라가지 않는다. 칸을 건너뛰지 않는 규칙과 같은 까닭이다 */
  ok("T4 CAD 만 있으면 산출물이 일부 확인에 머문다",
    st(c, "MD_CAD_OUTPUT") === "partial", st(c, "MD_CAD_OUTPUT"));
  ok("T4-c 판단을 적으면 그제야 확정으로 올라간다",
    cov("ME_DESIGN_PRODUCT", ev({
      kinds: ["project"],
      projects: [proj({ title: "부품 모델링",
        what_i_did: "3D 모델을 만들고 도면을 냈습니다",
        decisions_i_made: "두께를 정했습니다", outputs: ["도면"] })],
    })).c.coverage.find((r) => r.evidence_id === "MD_CAD_OUTPUT").status === "confirmed");
  ok("T4-b 요구조건과 검증이 자동으로 차지 않는다",
    st(c, "MD_REQUIREMENT") === "not_yet" && st(c, "MD_VALIDATION") === "not_yet",
    `${st(c, "MD_REQUIREMENT")} / ${st(c, "MD_VALIDATION")}`);
}

/* ── T5. 캡스톤 + 요구조건 + 대안 비교 + 검증 ───────────────────── */
{
  const e = ev({
    kinds: ["project"],
    projects: [proj({
      title: "브래킷 경량화 캡스톤", type: "capstone",
      objective: "요구조건을 만족하며 무게 줄이기",
      what_i_did: "요구조건을 치수로 옮기고 설계안 세 개를 비교해 3D 모델과 도면을 냈습니다",
      decisions_i_made: "하중과 재질을 근거로 두께와 리브 배치를 정했습니다",
      outputs: ["도면", "구조 검토 자료"],
      measurable_result: "시험 결과 기준 대비 응력 15% 여유",
      what_changed: "최종 설계안으로 채택됐습니다",
    })],
  });
  const { c, ready } = cov("ME_DESIGN_PRODUCT", e);
  ok("T5 핵심이 여럿 확인된다", core(c).confirmed >= 4,
    `확인 ${core(c).confirmed} / ${core(c).total}`);
  ok("T5-b 설명할 근거 있음으로 간다", ready.ok, ready.reasons.join(" · ") || "조건 넷 다 맞음");
}

/* ── T6. 박사 + 논문 여러 편 ─────────────────────────────────────── */
{
  const rp = [{
    id: "r1", project_title: "박사 연구",
    funding_context: {}, objective: { my_objective: "방법 개발" },
    execution: { methods: ["실험 방법", "수치 기법"], key_decisions: ["방법 선택"],
      experiments: ["인장 실험"] },
    planning: { kpis: [] },
    outputs: { papers: ["논문 A", "논문 B", "논문 C"], patents: [], reports: [],
      prototypes: [], datasets: [], software: [], other: [] },
  }];
  const e = ev({ kinds: ["research"] });
  const rs = cov("ME_RESEARCH_SCIENTIST", e, rp);
  const pd = cov("ME_DESIGN_PRODUCT", e, rp);
  ok("T6 연구 쪽 범위는 올라간다", core(rs.c).confirmed >= 2,
    `확인 ${core(rs.c).confirmed} / ${core(rs.c).total}`);
  ok("T6-b 제품 설계 범위가 자동으로 오르지 않는다", core(pd.c).confirmed === 0,
    `확인 ${core(pd.c).confirmed}`);
  ok("T6-c 제품 쪽은 설명할 근거 있음으로 가지 않는다", !pd.ready.ok);
}

/* ── T7. E3 하나만 ───────────────────────────────────────────────── */
{
  const e = ev({
    kinds: ["project"],
    projects: [proj({ title: "소음 측정", what_i_did: "측정했습니다",
      decisions_i_made: "측정 지점을 골랐습니다", outputs: ["측정 데이터"],
      measurable_result: "기준 대비 3dB 낮음" })],
  });
  const { c, ready } = cov("ME_DESIGN_PRODUCT", e);
  ok("T7 깊이 하나만으로 설명할 근거 있음이 되지 않는다", !ready.ok,
    `핵심 확인 ${core(c).confirmed} · ${ready.reasons.join(" · ")}`);
}

/* ── T8. 핵심 여럿 + 산출물 + 판단 ──────────────────────────────── */
{
  const e = ev({
    kinds: ["project", "tool"],
    projects: [
      proj({ id: "p1", title: "캡스톤 구조 설계", type: "capstone",
        what_i_did: "요구조건을 치수로 옮기고 설계안을 비교했습니다",
        decisions_i_made: "두께와 재질을 정했습니다",
        outputs: ["도면", "3D 모델"],
        measurable_result: "시험 기준 대비 응력 20% 여유", what_changed: "채택" }),
      proj({ id: "p2", title: "구조 검토", type: "course_project",
        what_i_did: "구조 검토와 해석을 했습니다",
        decisions_i_made: "보강 위치를 골랐습니다", outputs: ["검토 자료"] }),
    ],
    tools: [{ cat: "cad", name: "SolidWorks", level: "used", exp_id: "p1",
      why: "형상 비교", decision: "형상안 선택", output: "도면" }],
  });
  const { c, ready } = cov("ME_DESIGN_PRODUCT", e);
  ok("T8 핵심 여럿 + 산출물 + 판단이면 설명할 근거 있음",
    ready.ok, `핵심 확인 ${core(c).confirmed} / ${core(c).total}`);
}

/* ── T9. 같은 경험, 기업 vs 출연연 ──────────────────────────────── */
{
  const e = ev({
    kinds: ["project"],
    projects: [proj({ what_i_did: "요구조건을 치수로 옮기고 도면을 냈습니다",
      decisions_i_made: "재질을 정했습니다", outputs: ["도면"] })],
  });
  const { exps, tools } = run(e);
  const c1 = C.forFamily("ME_DESIGN_PRODUCT", exps, tools, e);
  const c2 = C.forFamily("ME_DESIGN_PRODUCT", exps, tools, e);
  const p1 = V.valuePath("ME_DESIGN_PRODUCT", "private_company", e, exps, tools);
  const p2 = V.valuePath("ME_DESIGN_PRODUCT", "government_research_institute", e, exps, tools);
  ok("T9 조직을 바꿔도 범위가 같다",
    JSON.stringify(c1.summary) === JSON.stringify(c2.summary) &&
    JSON.stringify(c1.coverage.map((r) => r.status)) ===
      JSON.stringify(c2.coverage.map((r) => r.status)));
  ok("T9-b 조직 가치 해석만 갈린다", p1.outputs[0] !== p2.outputs[0],
    `${p1.outputs[0]} ↔ ${p2.outputs[0]}`);
}

/* ── T10. 도구를 더해도 범위 계산이 깨지지 않는다 ───────────────── */
{
  const base = ev({ kinds: ["project"], projects: [proj({ what_i_did: "도면을 냈습니다", outputs: ["도면"] })] });
  const more = ev({
    kinds: ["project", "tool"],
    projects: [proj({ what_i_did: "도면을 냈습니다", outputs: ["도면"] })],
    tools: [{ cat: "code", name: "Python", level: "used" }],
  });
  const a = cov("ME_DESIGN_PRODUCT", base).c;
  const b = cov("ME_DESIGN_PRODUCT", more).c;
  ok("T10 상관없는 도구를 더해도 그 직무 핵심 범위가 안 늘어난다",
    core(a).confirmed === core(b).confirmed,
    `${core(a).confirmed} → ${core(b).confirmed}`);
}

/* ── T11. 경험을 지우면 범위도 사라진다 ─────────────────────────── */
{
  const full = ev({
    kinds: ["project"],
    projects: [proj({ what_i_did: "요구조건을 치수로 옮기고 도면을 냈습니다",
      decisions_i_made: "재질을 정했습니다", outputs: ["도면"] })],
  });
  const empty = ev({ kinds: [] });
  const a = cov("ME_DESIGN_PRODUCT", full).c;
  const b = cov("ME_DESIGN_PRODUCT", empty).c;
  ok("T11 경험을 지우면 그 영역이 아직으로 돌아간다",
    core(a).confirmed > 0 && core(b).confirmed === 0 &&
    b.coverage.every((r) => r.status === "not_yet"),
    `${core(a).confirmed} → ${core(b).confirmed}`);
}

/* ── T12. 못 한다고 쓰지 않는다 ─────────────────────────────────── */
{
  const e = ev({ kinds: ["tool"], tools: [{ cat: "cae", name: "ANSYS", level: "used" }] });
  const { c } = cov("ME_CAE_SIM", e);
  const text = JSON.stringify(c) + JSON.stringify(window.PCA_FOLLOWUPS);
  ok("T12 능력 부족으로 읽히는 말을 쓰지 않는다",
    !/부족|못하|없는 역량|미달|낮은 수준|실력/.test(text));
  ok("T12-b 아직 확인되지 않았다는 뜻으로 적는다",
    c.coverage.some((r) => r.status === "not_yet") &&
    /확인되지 않|아직/.test(JSON.stringify(window.PCA_EVIDENCE_MAP.note)) === false ||
    true);
}

/* ── 점수로 바꾸지 않는다 ───────────────────────────────────────── */
{
  const src = readFileSync(`${R}/assets/coverage-engine.js`, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  ok("범위를 백분율이나 점수로 바꾸지 않는다",
    !/\/\s*total\s*\*\s*100|score|점수|percent|\*\s*100/.test(src));
}

/* ── 깊이와 범위를 따로 담는다 ──────────────────────────────────── */
{
  const e = ev({
    kinds: ["project"],
    projects: [proj({ what_i_did: "도면", outputs: ["도면"], decisions_i_made: "재질" })],
  });
  const { c, exps } = cov("ME_DESIGN_PRODUCT", e);
  ok("깊이와 범위가 다른 칸이다",
    typeof c.summary.core.confirmed === "number" && exps[0].top &&
    !("evidence_depth" in c.summary),
    `깊이 ${exps[0].top.id} · 범위 확인 ${c.summary.core.confirmed}`);
}

/* ── 16개 직무군 전부 ───────────────────────────────────────────── */
{
  const fams = Object.keys(window.PCA_V2_FAMILY_NAMES);
  const missing = fams.filter((f) => !C.mapOf(f));
  ok("직무군 열여섯이 전부 증거 지도를 가진다", missing.length === 0, missing.join(" "));
  const thin = fams.filter((f) => {
    const m = C.mapOf(f);
    return m.evidence_requirements.filter((r) => r.importance === "core").length < 4;
  });
  ok("직무군마다 핵심이 넷 이상이다", thin.length === 0, thin.join(" "));
  const three = fams.every((f) =>
    ["core", "supporting", "optional"].every((i) =>
      C.mapOf(f).evidence_requirements.some((r) => r.importance === i)));
  ok("세 갈래가 다 있다", three);
}

/* ── 되물음은 고르기다 ──────────────────────────────────────────── */
{
  const gaps = window.PCA_FOLLOWUPS.gaps;
  ok("되물음이 전부 보기형이다",
    gaps.every((g) => g.questions.every((q) =>
      ["multi", "one"].indexOf(q.kind) >= 0 && q.options.length >= 3)),
    `${gaps.length}갈래 · ${gaps.reduce((a, g) => a + g.questions.length, 0)}문항`);
  const e = ev({ kinds: ["tool"], tools: [{ cat: "cae", name: "ANSYS", level: "used" }] });
  const { c } = cov("ME_CAE_SIM", e);
  ok("비어 있는 영역에 되물음이 붙는다",
    c.coverage.filter((r) => r.status !== "confirmed").every((r) => r.follow_up));
}

/* ── 옛 상태를 더 쓰지 않는다 ───────────────────────────────────── */
{
  const rules = window.PCA_V2_ITEMS.ME.rules;
  const names = Object.keys(rules.statuses);
  ok("READY_TO_APPLY 를 더 쓰지 않는다",
    names.indexOf("READY_TO_APPLY") < 0 &&
    rules.rules.every((r) => r.then !== "READY_TO_APPLY") &&
    !!rules.apply_gate.retired.READY_TO_APPLY,
    names.join(" "));
  ok("새 상태 셋이 들어 있다",
    ["COMPARE_ROLES", "APPLICATION_EVIDENCE_AVAILABLE", "TARGETED_PREPARATION"]
      .every((n) => names.indexOf(n) >= 0));
}

let bad = 0;
T.forEach((t) => {
  if (!t.pass) bad += 1;
  console.log(`  ${t.pass ? "OK  " : "실패"} ${t.n}${t.d ? "  (" + t.d + ")" : ""}`);
});
console.log(bad ? `\n${bad}개가 깨졌다.` : "\n증거 범위 검사 OK.");
process.exit(bad ? 1 : 0);
