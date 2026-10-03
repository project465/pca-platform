/**
 * 전공 → 조직 성과 번역 엔진 검사.
 *
 * 브라우저 없이 돈다. `value-engine.js` 는 전역에 붙는 정적 파일이라
 * 전역 하나를 만들어 두고 그대로 읽는다.
 *
 *   node scripts/value-check.mjs
 */
import { readFileSync } from "node:fs";

const R = "sites/pca-platform";
global.window = {};
const load = (f) => {
  // eslint-disable-next-line no-eval
  (0, eval)(readFileSync(`${R}/${f}`, "utf8"));
};
load("data/me-v2.js");
load("data/value-data.js");
load("data/evidence-rules.js");
load("assets/evidence.js");
load("assets/value-engine.js");

const V = window.PCAValue;
const EV = window.PCAEvidence;

const T = [];
const ok = (n, pass, d) => T.push({ n, pass: !!pass, d: d || "" });

/* 경험 한 벌 만들기 */
function ev(over) {
  return Object.assign(EV.emptyEvidence(), over);
}
function proj(over) {
  return Object.assign(EV.emptyProject(), { id: "p1", title: "브래킷 캡스톤" }, over);
}
function run(e, rp) {
  const exps = V.experiences(e, rp || []);
  const tools = V.toolEvidence(e, exps);
  return { exps, tools, e };
}
function topOf(x) { return x.top ? x.top.id : null; }

/* ── 1. 재료역학 수강만 ──────────────────────────────────────────── */
{
  const e = ev({ kinds: ["course"], courses: [{ n: "재료역학" }] });
  const { exps, tools } = run(e);
  const p = V.valuePath("ME_DESIGN_PRODUCT", "private_company", e, exps, tools);
  const sm = p.academic_inputs.find((a) => a.domain_id === "solid_mechanics");
  ok("1 수강만 하면 학문 노출로 둔다",
    sm && sm.confidence === "inferred_from_course" && !exps.length,
    `${sm && sm.confidence} · 경험 ${exps.length}건`);
  ok("1-b 수강만으로 설계 역량이라고 하지 않는다",
    p.evidence_top_level === null && p.user_evidence.length === 0,
    `사다리 ${p.evidence_top_level}`);
}

/* ── 2. 도구 이름만 ──────────────────────────────────────────────── */
{
  const e = ev({ kinds: ["tool"], tools: [{ cat: "cae", name: "ANSYS Mechanical", level: "used" }] });
  const { tools } = run(e);
  ok("2 도구 이름만이면 활동까지다", tools[0] && tools[0].evidence_level === "E0",
    tools[0] && tools[0].evidence_level);
}

/* ── 2-b. 이름만 적은 도구도 한 줄이 된다 ───────────────────────── */
{
  const e = ev({ kinds: ["tool"], tools: [{ cat: "cae", name: "ANSYS Mechanical", level: "used" }] });
  const { exps } = run(e);
  const x = exps.find((y) => y.kind === "tool");
  ok("2-b 경험에 안 붙인 도구도 번역 대상이 된다",
    x && topOf(x) === "E0" && x.next && x.next.questions.length > 0,
    x ? x.next.questions[0] : "줄이 없다");
  ok("2-c 경험에 붙인 도구는 두 번 세지 않는다",
    run(ev({
      kinds: ["project", "tool"],
      projects: [proj({ id: "p1" })],
      tools: [{ cat: "cae", name: "ANSYS Mechanical", level: "used", exp_id: "p1" }],
    })).exps.filter((y) => y.kind === "tool").length === 0);
}

/* ── 3. 도구로 두 설계안 비교 ────────────────────────────────────── */
{
  const e = ev({
    kinds: ["tool"],
    tools: [{ cat: "cae", name: "ANSYS Mechanical", level: "used",
      why: "브래킷 구조해석", decision: "설계안 A/B 가운데 B 를 고름" }]
  });
  const { tools } = run(e);
  ok("3 도구로 고르면 판단까지 간다", tools[0].evidence_level === "E1", tools[0].evidence_level);
}

/* ── 4. 해석 보고서까지 ──────────────────────────────────────────── */
{
  const e = ev({
    kinds: ["tool"],
    tools: [{ cat: "cae", name: "ANSYS Mechanical", level: "used",
      why: "브래킷 구조해석", decision: "설계안 A/B 비교", output: "해석 보고서" }]
  });
  const { tools } = run(e);
  ok("4 결과물이 남으면 산출물까지 간다", tools[0].evidence_level === "E2", tools[0].evidence_level);
}

/* ── 5. 시험값과 견줌 ────────────────────────────────────────────── */
{
  const e = ev({
    kinds: ["tool"],
    tools: [{ cat: "cae", name: "ANSYS Mechanical", level: "used",
      why: "브래킷 구조해석", decision: "설계안 A/B 비교", output: "해석 보고서",
      validation: "시험 응력과 8% 이내로 일치" }]
  });
  const { tools } = run(e);
  ok("5 기준과 견주면 성과까지 간다", tools[0].evidence_level === "E3", tools[0].evidence_level);
}

/* ── 6. 실제 프로젝트의 설계 변경에 쓰임 ─────────────────────────── */
{
  const e = ev({
    kinds: ["project", "tool"],
    projects: [proj({
      type: "internship", title: "냉각 브래킷 개선", objective: "양산 라인의 브래킷 파손 대응",
      what_i_did: "구조해석으로 원인을 좁혔습니다",
      decisions_i_made: "리브 배치를 바꾸는 쪽을 골랐습니다",
      outputs: ["해석 보고서", "도면 개정"],
      measurable_result: "최대 응력 22% 감소",
      what_changed: "양산 도면이 개정됐습니다"
    })],
    tools: [{ cat: "cae", name: "ANSYS Mechanical", level: "used", exp_id: "p1",
      why: "브래킷 구조해석", decision: "리브 배치 선택", output: "해석 보고서",
      validation: "허용 응력 기준과 비교" }]
  });
  const { exps, tools } = run(e);
  ok("6 실제로 쓰였으면 조직 가치까지 간다", topOf(exps[0]) === "E4", topOf(exps[0]));
  ok("6-b 도구도 그 경험을 따라 올라간다", tools[0].evidence_level === "E4", tools[0].evidence_level);
}

/* ── 7. 같은 방법을 여러 과제에서 ────────────────────────────────── */
{
  const e = ev({
    kinds: ["project"],
    projects: [
      proj({ id: "p1", title: "브래킷 캡스톤", type: "capstone",
        methods: ["메시 민감도"], outputs: ["해석 보고서"],
        decisions_i_made: "격자 크기를 정함", measurable_result: "오차 5% 이내" }),
      proj({ id: "p2", title: "하우징 해석", type: "research",
        methods: ["메시 민감도"], outputs: ["해석 결과"],
        decisions_i_made: "경계 조건을 정함", measurable_result: "기준 대비 10% 여유" })
    ]
  });
  const { exps } = run(e);
  const rep = V.repeatability(exps, e);
  ok("7 같은 방법을 두 번 쓰면 반복 가능으로 올라간다",
    rep.steps[1].state === "confirmed", rep.steps[1].by.join(" / "));
  ok("7-b 종류가 다르면 옮겼다고 본다",
    rep.steps[2].state === "confirmed", rep.steps[2].by.join(" / "));
}

/* ── 8. 조직을 바꿔도 다섯 값이 그대로다 ─────────────────────────── */
{
  const e = ev({
    kinds: ["project"],
    projects: [proj({
      title: "냉각 유로 설계", type: "capstone",
      what_i_did: "열전달 계산으로 유로를 잡았습니다",
      decisions_i_made: "유량과 온도 조건을 정했습니다",
      methods: ["열전달 계산"], outputs: ["계통도", "부하 계산서"],
      measurable_result: "허용 온도 기준 대비 7도 여유"
    })]
  });
  const { exps, tools } = run(e);
  const a = V.valuePath("ME_THERMAL_FLUID", "private_company", e, exps, tools);
  const b = V.valuePath("ME_THERMAL_FLUID", "government_research_institute", e, exps, tools);
  ok("8 조직이 달라도 증거 단계는 같다",
    a.evidence_top_level && a.evidence_top_level === b.evidence_top_level &&
    JSON.stringify(a.user_evidence) === JSON.stringify(b.user_evidence),
    `${a.evidence_top_level} / ${b.evidence_top_level}`);
  ok("8-b 조직이 다르면 산출물과 성과 기준이 갈린다",
    a.outputs[0] !== b.outputs[0] && a.performance_criteria[0] !== b.performance_criteria[0],
    `${a.outputs[0]} ↔ ${b.outputs[0]}`);
}

/* ── 9. 박사 + 논문 많음 + 제품 경험 없음 ────────────────────────── */
{
  const rp = [{
    id: "r1", project_title: "연구과제",
    funding_context: { sponsor_name: "", program_name: "" },
    objective: { my_objective: "방법 개발" },
    execution: { methods: ["실험"], key_decisions: ["조건 선정"], experiments: ["인장시험"] },
    planning: { kpis: ["논문 2편"] },
    outputs: { papers: ["논문 A", "논문 B", "논문 C"], patents: [], reports: [],
      prototypes: [], datasets: [], software: [], other: [] }
  }];
  const e = ev({ kinds: ["research"] });
  const { exps, tools } = run(e, rp);
  const research = V.valuePath("ME_RESEARCH_SCIENTIST", "university_lab", e, exps, tools);
  const product = V.valuePath("ME_DESIGN_PRODUCT", "private_company", e, exps, tools);
  ok("9 연구 증거는 올라가고 제품 성과는 올라가지 않는다",
    research.evidence_top_level && product.evidence_top_level === null,
    `연구 ${research.evidence_top_level} · 제품 ${product.evidence_top_level}`);
  ok("9-b 제품 쪽은 비어 있는 증거를 적어 준다",
    product.missing_evidence.length > 0, product.missing_evidence.join(' · '));
}

/* ── 10. 포닥 + 제안서 · 마일스톤 · 지도 ─────────────────────────── */
{
  const rp = [{
    id: "r1", project_title: "국가과제",
    funding_context: { sponsor_name: "한국연구재단", program_name: "기초연구사업" },
    objective: { my_objective: "세부 과제 수행" },
    planning: { rfp_reviewed: true, milestones: ["1차", "2차"], kpis: ["논문 1편"],
      work_packages: ["WP1", "WP2"], deliverables: ["보고서"], timeline_role: "일정 조율" },
    execution: { methods: ["수치해석"], key_decisions: ["모델 선택"], plan_changes: ["일정 조정"] },
    team: { my_role: "참여연구원" },
    budget: { my_budget_role: "B2" },
    outputs: { papers: ["논문 A"], patents: [], reports: ["중간보고서"],
      prototypes: [], datasets: [], software: [], other: [] }
  }];
  const e = ev({ kinds: ["research"], mentoring: ["학부 연구생 2명 지도"] });
  const { exps } = run(e, rp);
  const rep = V.repeatability(exps, e);
  ok("10 전달 가능성을 적어 주신 근거로만 켠다",
    rep.steps[3].state === "confirmed" && rep.steps[3].by.length > 0,
    rep.steps[3].by.join(" / "));
  const text = JSON.stringify(rep) + JSON.stringify(exps);
  ok("10-b 자동으로 과제 책임자라고 하지 않는다",
    !/PI|과제 책임자로|독립 연구자입니다/.test(text));
}

/* ── 학위가 사다리를 올리지 않는다 ───────────────────────────────── */
{
  const e = ev({ kinds: ["project"], projects: [proj({ what_i_did: "모델링" })] });
  const { exps } = run(e);
  ok("학위를 읽지 않는다",
    !/stage|education|bachelor|master|phd|postdoc/.test(
      readFileSync(`${R}/assets/value-engine.js`, "utf8")
        .split("\n").filter((l) => !/^\s*[*/]/.test(l)).join("\n")),
    `경험 ${exps.length}건 · 사다리 ${topOf(exps[0])}`);
}

/* ── 아래가 비면 위를 확정으로 올리지 않는다 ─────────────────────── */
{
  const e = ev({
    kinds: ["project"],
    projects: [proj({ what_i_did: "해석", outputs: ["보고서"], measurable_result: "기준 대비 10% 여유" })]
  });
  const { exps } = run(e);
  const r = exps[0].rungs;
  ok("칸을 건너뛰지 않는다",
    r[0].state === "confirmed" && r[1].state === "not_yet" &&
    r[2].state === "partial" && r[3].state === "partial",
    r.map((x) => x.id + ":" + x.state).join(" "));
}

/* ── 도구 개수를 점수로 쓰지 않는다 ──────────────────────────────── */
{
  const src = readFileSync(`${R}/assets/value-engine.js`, "utf8");
  ok("도구 개수를 세어 점수로 만들지 않는다",
    !/tools\.length\s*\*|score\s*\+=|점수/.test(src.replace(/\/\*[\s\S]*?\*\//g, "")));
}

/* ── 16개 직무군 · 28 지식 · 7 조직 ──────────────────────────────── */
{
  const fams = Object.keys(window.PCA_V2_FAMILY_NAMES);
  const have = V.PATHS.map((p) => p.career_family_id);
  ok("직무군 열여섯이 전부 사슬을 가진다",
    fams.every((f) => have.indexOf(f) >= 0), `${have.length}/16`);
  ok("전공지식 스물여덟", V.KNOWLEDGE.length === 28, String(V.KNOWLEDGE.length));
  ok("조직 유형 일곱", V.ORG_TYPES.length === 7, String(V.ORG_TYPES.length));
  const bad = [];
  V.PATHS.forEach((p) => {
    if (!Object.keys(p.org_variants || {}).length) bad.push(p.career_family_id);
  });
  ok("직무군마다 조직별 차이가 있다", bad.length === 0, bad.join(" "));
}

/* ── 특정 기관의 지표를 지어내지 않는다 ──────────────────────────── */
{
  const e = ev({ kinds: ["project"], projects: [proj({ outputs: ["도면"] })] });
  const { exps, tools } = run(e);
  const ctx = V.organizationContext({ target_org_type: "private_company" });
  ok("특정 기관 지표를 지어내지 않는다",
    ctx.target_organization === null && /확인된 자료/.test(ctx.target_organization_note));
  const p = V.valuePath("ME_DESIGN_PRODUCT", "private_company", e, exps, tools);
  ok("없는 수치를 만들지 않는다",
    !/\d+\s*%|\d+\s*억|\d+\s*명/.test(JSON.stringify(p.performance_criteria)));
}

/* ── 출력 ────────────────────────────────────────────────────────── */
let bad = 0;
T.forEach((t) => {
  if (!t.pass) bad += 1;
  console.log(`  ${t.pass ? "OK  " : "실패"} ${t.n}${t.d ? "  (" + t.d + ")" : ""}`);
});
console.log(bad ? `\n${bad}개가 깨졌다.` : "\n번역 엔진 검사 OK.");
process.exit(bad ? 1 : 0);
