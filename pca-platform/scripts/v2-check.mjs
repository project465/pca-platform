/**
 * ME_V2 골든 테스트 (규격 25장 T1~T8).
 *
 * 브라우저를 띄우지 않는다. V2 채점은 DOM 을 건드리지 않으므로 전역만 흉내
 * 내면 그대로 돌고, 그만큼 빠르게 자주 돌릴 수 있다.
 *
 *   node scripts/v2-check.mjs
 */
import { readFileSync } from "node:fs";

/* 브라우저 전역을 흉내 낸다. 파일 세 개가 전부 window 에 붙는 구조다. */
const win = {};
globalThis.window = win;
for (const f of ["sites/pca-platform/data/me-v2.js",
                 "sites/pca-platform/assets/v2-scoring.js",
                 "sites/pca-platform/assets/v2-decision.js"]) {
  new Function("window", readFileSync(f, "utf8")).call(win, win);
}
const V2 = win.PCAV2, DEC = win.PCAV2Decision;
const BANK = win.PCA_V2_ITEMS.ME;

/* 응답 한 벌을 만든다. `by` 로 문항마다 값을 정한다. */
function answer(tier, by) {
  const out = {};
  for (const it of V2.itemsFor(tier)) {
    if (it.scored === false) continue;
    const v = by(it);
    if (v !== null && v !== undefined) out[it.item_id] = v;
  }
  return out;
}
const familyOf = (it) => Object.keys(it.career_family_weights || {});
const touches = (it, fam) => familyOf(it).includes(fam);

const T = [];
const ok = (n, pass, d) => T.push({ n, pass, d: d || "" });

/* ── T1. 관심과 경험은 다른 값이다 ──────────────────────────────────── */
{
  const a = answer("BASIC", (it) => {
    if (it.construct === "actual_work_interest") return touches(it, "ME_CAE_SIM") ? 5 : 2;
    if (it.construct === "exposure") return 1;
    if (it.construct === "learning_intent") return touches(it, "ME_CAE_SIM") ? 5 : 2;
    return 3;
  });
  const s = V2.score("BASIC", "bachelor", a);
  const row = DEC.table(s, ["ME_CAE_SIM"])[0];
  ok("T1 관심이 높고 경험이 없으면 지원 단계로 가지 않는다",
    row.interest.level === "high" && row.exposure.level === "low" &&
    row.decision_status !== "READY_TO_APPLY",
    `관심 ${row.interest.level} · 경험 ${row.exposure.level} · ${row.decision_status}`);
}
/* ── T2. 경험이 많아도 관심이 낮으면 앞세우지 않는다 ────────────────── */
{
  const a = answer("BASIC", (it) => {
    if (it.construct === "actual_work_interest") return touches(it, "ME_MANUFACTURING") ? 1 : 3;
    if (it.construct === "exposure") return touches(it, "ME_MANUFACTURING") ? 5 : 2;
    return 3;
  });
  const s = V2.score("BASIC", "bachelor", a);
  const row = DEC.table(s, ["ME_MANUFACTURING"])[0];
  ok("T2 경험만 많은 직무를 자동으로 앞세우지 않는다",
    row.decision_status === "ADJACENT_OPTION",
    `${row.decision_status} · ${DEC.line(row.decision_status).slice(0, 24)}…`);
}
/* ── T3. 학위가 소유를 올려 주지 않는다 ─────────────────────────────── */
{
  const by = (it) => (it.construct === "research_project_evidence" ? 3 : 3);
  const m = V2.score("PRO", "master", answer("PRO", by));
  const p = V2.score("PRO", "phd", answer("PRO", by));
  const same = JSON.stringify(m.research_project_evidence) ===
    JSON.stringify(p.research_project_evidence) &&
    JSON.stringify(m.decision_ownership) === JSON.stringify(p.decision_ownership);
  const q77 = BANK.variants.variants.ME_OWN_OBJ_77;
  ok("T3 같은 응답이면 석사와 박사의 소유 점수가 같다",
    same && q77.master !== q77.phd,
    same ? "문장만 갈린다" : "점수가 달라졌다");
}
/* ── T4. 국적은 아예 들어오지 않는다 ────────────────────────────────── */
{
  const all = [...BANK.core.items, ...BANK.standard.items, ...BANK.pro.items];
  const bad = all.filter((it) => /국적|citizen|nationality/i.test(
    JSON.stringify(it)));
  ok("T4 국적을 묻는 문항이 없다", bad.length === 0, bad[0]?.item_id || "");
}
/* ── T5. 목표 국가는 점수에 들어가지 않는다 ─────────────────────────── */
{
  const base = answer("PRO", () => 3);
  const kr = { ...base, ME_CTX_COUNTRY_92: "특정 국가가 있음" };
  const us = { ...base, ME_CTX_COUNTRY_92: "여러 국가를 비교하고 싶다" };
  const a = V2.score("PRO", "bachelor", kr), b = V2.score("PRO", "bachelor", us);
  const same = JSON.stringify(a.actual_work_interest) === JSON.stringify(b.actual_work_interest) &&
    JSON.stringify(a.work_mode) === JSON.stringify(b.work_mode) &&
    JSON.stringify(a.exposure) === JSON.stringify(b.exposure);
  ok("T5 목표 국가를 바꿔도 핵심 값이 같다", same);
}
/* ── T6. 근거 없는 포닥에게 높은 성숙도를 주지 않는다 ───────────────── */
{
  const a = answer("PRO", (it) =>
    it.construct === "research_project_evidence" ? 1 : 3);
  const s = V2.score("PRO", "postdoc", a);
  ok("T6 근거가 없으면 포닥도 과제 소유가 낮게 나온다",
    s.research_project_evidence.level === "low",
    `${s.research_project_evidence.level} · ${s.research_project_evidence.score}`);
}
/* ── T7. 없는 정밀도를 팔지 않는다 ──────────────────────────────────── */
{
  const s = V2.score("BASIC", "bachelor", answer("BASIC", () => 4));
  const wm = JSON.stringify(s.work_mode);
  const noNum = !/"score"/.test(wm) && /가까|비슷|쪽/.test(wm);
  const labels = BANK.rules.work_mode_labels;
  ok("T7 업무 방식을 숫자로 내보내지 않는다",
    noNum && labels.closer === "가까움", wm.slice(0, 60));
}
/* ── T8. BASIC 만으로도 결정이 나온다 ───────────────────────────────── */
{
  const a = answer("BASIC", (it) => {
    if (it.construct === "actual_work_interest") return touches(it, "ME_DESIGN_PRODUCT") ? 5 : 2;
    if (it.construct === "exposure") return touches(it, "ME_DESIGN_PRODUCT") ? 4 : 2;
    return 4;
  });
  const s = V2.score("BASIC", "bachelor", a);
  const rows = DEC.table(s);
  const top = rows[0];
  ok("T8 BASIC 48문항으로 직무 순서·까닭·다음 행동이 나온다",
    s.item_count === 48 && rows.length >= 8 &&
    top.interest.basis.length > 0 && DEC.line(top.decision_status).length > 10,
    `${top.name} · ${DEC.label(top.decision_status)} · 근거 문항 ${top.interest.basis.join(",")}`);
}
/* ── 구성 확인 ──────────────────────────────────────────────────────── */
{
  const n = { BASIC: V2.itemsFor("BASIC").length, STANDARD: V2.itemsFor("STANDARD").length,
              PRO: V2.itemsFor("PRO").length };
  ok("문항 수 48 / 68 / 92",
    n.BASIC === 48 && n.STANDARD === 68 && n.PRO === 92, JSON.stringify(n));
  const s = V2.score("PRO", "bachelor", answer("PRO", () => 3));
  const merged = Object.keys(s).filter((k) => /career_score|total|composite/.test(k));
  ok("합쳐 놓은 점수가 없다", merged.length === 0, merged.join(","));
  ok("옛 판을 그대로 둔다",
    s.legacy_version === "ME_V1" && s.assessment_version === "ME_V2_DECISION_2026");
}

let bad = 0;
for (const t of T) {
  console.log(`  ${t.pass ? "OK  " : "실패"} ${t.n}${t.d ? `  (${t.d})` : ""}`);
  if (!t.pass) bad++;
}
console.log(bad ? `\n${bad}개가 깨졌다.` : "\nV2 골든 테스트 OK.");
process.exit(bad ? 1 : 0);
