#!/usr/bin/env node
/**
 * 세종 구직자 진단(DEMO) 분석 규칙 검사.
 *
 *   node --experimental-strip-types scripts/sejong/analysis-check.mjs
 *
 * **npm 없이 돈다.** 분석 함수가 아무것도 불러오지 않게 짜 두었기 때문이다.
 * 세는 것: 점수를 만들지 않는가 · 한 문항으로 오르지 않는가 · 경험은 올리기만
 * 하는가 · 대상 구분이 판정을 흔들지 않는가 · 금지 표현이 없는가.
 */
import { readFileSync } from "node:fs";
import { analyze, levelOf, stateOf } from "../../src/sejong/lib/analysis.ts";

const read = (f) => JSON.parse(readFileSync(f, "utf8"));
const instrument = read("src/sejong/content/instrument.sj-jobseeker-demo-0.json");
const axisInfo = read("sites/pca-platform/content/me-v3-2-taxonomy.json").axes;
const items = instrument.sections.flatMap((s) => s.items);

let pass = 0;
const bad = [];
const ok = (what, cond, saw = "") => {
  if (cond) { pass++; console.log(`  통과  ${what}`); }
  else { bad.push(what); console.log(`  걸림  ${what} ${saw}`); }
};

const profile = { audience: null, job_areas: ["JA03", "JA04"], region_range: "ADJACENT", skills: [] };
const all = (v) => Object.fromEntries(items.map((i) => [i.code, v]));
const run = (responses, experiences = [], p = profile) =>
  analyze({ instrument, axisInfo, responses, experiences, profile: p, now: new Date(0) });

console.log("\n세종 구직자 진단 DEMO — 분석 규칙\n");

ok("문항 24개 · 축 여덟에 셋씩", items.length === 24
  && ["J1","J2","J3","J4","J5","J6","J7","J8"].every((a) => items.filter((i) => i.axis === a).length === 3));
ok("축 이름을 ME_V3 taxonomy 에서 읽는다", run({}).axes[0].name === axisInfo.J1.name);

ok("응답이 없으면 전부 '아직'", run({}).axes.every((a) => a.state === "NONE"));
ok("한 문항만 3 이면 오르지 않는다 (두 문항 기준)", levelOf([3, 0, 0]) === 0 && levelOf([3, 2, 0]) === 2);
ok("단계 1 은 '접해 봄'", stateOf(1, 5, true) === "EXPOSED");
ok("단계 2 + 근거 0 → 응답만", stateOf(2, 0, true) === "CLAIMED");
ok("단계 2 + 근거 1 → 하나 더", stateOf(2, 1, true) === "PARTIAL");
ok("단계 2 + 근거 2 → 확인됨", stateOf(2, 2, true) === "CONFIRMED");
ok("근거 칸이 없는 축은 '응답만'을 넘지 않는다", stateOf(3, 9, false) === "CLAIMED");

const exps = [
  { id: "1", kind: "work", title: "물류센터 출고 검수", checks: ["verifications", "used_where"], skills: [], job_area: "JA04" },
  { id: "2", kind: "parttime", title: "매장 재고 정리", checks: ["verifications", "problems"], skills: [], job_area: null },
];
const high = run(all(2), exps);
const j6 = high.axes.find((a) => a.axis === "J6");
ok("검증 근거 둘 → J6 확인됨", j6.state === "CONFIRMED", j6.state);
ok("J2 는 경험으로 확인하는 칸이 없다", high.axes.find((a) => a.axis === "J2").state === "CLAIMED");

const low = run(all(0), exps);
ok("경험은 올리기만 한다: 응답이 0 이면 근거가 있어도 '아직'",
  low.axes.find((a) => a.axis === "J6").state === "NONE");

const a1 = run(all(2), exps, { ...profile, audience: "youth_jobseeker" });
const a2 = run(all(2), exps, { ...profile, audience: "midcareer" });
ok("대상 구분이 판정을 흔들지 않는다",
  JSON.stringify(a1.axes) === JSON.stringify(a2.axes));

const text = JSON.stringify(high);
ok("총점·적합도·순위 칸이 없다", !/"(score|total|fit|rank|overall|composite)"/i.test(text));
ok("결과에 '추천' · '채용 중' 이 없다", !/추천|채용 중|채용중/.test(text));
ok("계획에 30·60·90 이 모두 선다",
  ["D30", "D60", "D90"].every((h) => high.actions.some((x) => x.horizon === h)));
ok("고른 직무 영역마다 핵심 판단이 선다", high.areas.length === 2 && high.areas.every((x) => x.key.length > 0));
ok("한 값으로 몰린 응답을 표시한다", run(all(1)).quality.flat === true && run({ ...all(1), J1a: 2 }).quality.flat === false);

const orgs = read("src/sejong/content/orgs.preview.json").orgs;
ok("기업 자료: 채용 여부가 전부 미확인", orgs.every((o) => o.hiring?.status === "UNVERIFIED"));
ok("기업 자료: 줄마다 출처와 확인일", orgs.every((o) => o.sources?.length && o.sources.every((s) => s.checked_on)));
ok("기업 자료: 원문 재확인 전이라 display_ready 가 전부 false", orgs.every((o) => o.display_ready === false));
const links = read("src/sejong/content/org-links.demo.json").links;
ok("직무 연결이 기업 자료의 id 만 가리킨다", Object.keys(links).every((id) => orgs.some((o) => o.id === id)));
const areaCodes = new Set(instrument.job_areas.map((j) => j.code));
ok("직무 연결이 진단의 직무 영역만 쓴다", Object.values(links).flat().every((c) => areaCodes.has(c)));

console.log(`\n${pass} 통과 · ${bad.length} 걸림\n`);
process.exit(bad.length ? 1 : 0);
