/**
 * **중점 기업 카드 점검**(DB · 서버 없이).
 *
 *   npm run featured:check
 *
 * 세는 것.
 *  1. 프로그램마다 회사 자료가 있고 기관 코드가 학교 등록부에 있다
 *  2. 회사 사실의 모든 칸에 출처와 기준일이 있다. 공식이 아닌 칸은 `review` 를 단다
 *  3. 숫자가 든 칸(매출 · 이익 · 직원)은 연도나 기준을 함께 적는다
 *  4. 기관(agency) 프로그램의 문장에 학교 말이 없다
 *  5. 문장에 대시 · 그림 글자 · `추천` 이 없고, `아직 ~ 없습니다` 가 겹치지 않는다
 *  6. 현장 질문 조건이 아는 값뿐이고, 어느 전공이든 셋이 선다
 *  7. 회사가 지역 명단(공시 · 벤처 명단)에 있으면 같은 이름으로 찾힌다(지역 절과 같은 규칙으로 산업이 갈리게)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { CONTENT_DIR } from "../../src/lib/me-v3/core-registry";
import { university } from "../../src/lib/campus/registry";
import { companies, programs } from "../../src/lib/featured";
import { SCHOOL_WORDS, featuredText } from "../../src/lib/featured/text";

let fail = 0;
const ok = (label: string, pass: boolean, note = "") => {
  console.log(`${pass ? "  통과" : "  걸림"}  ${label}${note ? ` — ${note}` : ""}`);
  if (!pass) fail += 1;
};
const ps = programs();
const cs = companies();
ok("프로그램 파일을 읽었다", ps.length > 0, `${ps.length}개`);
for (const p of ps) {
  ok(`${p.code}: 회사 자료가 있다`, !!cs[p.company], p.company);
  ok(`${p.code}: 기관이 학교 등록부에 있다`, !!university(p.org_code), p.org_code);
  ok(`${p.code}: 받는 사람이 school · agency 가운데 하나`, p.audience === "school" || p.audience === "agency", p.audience);
  const known = /^(any|z1|no_z1|school|core:[A-Z0-9_]+)$/;
  const bad = p.onsite.filter((t) => !known.test(t.when));
  ok(`${p.code}: 현장 질문 조건이 아는 값`, !bad.length, bad.map((t) => t.when).join(" "));
  ok(`${p.code}: 조건 any 인 질문이 셋 이상(어느 전공이든 셋이 선다)`, p.onsite.filter((t) => t.when === "any").length >= 3);
  if (p.audience === "agency") {
    const tx = featuredText("agency");
    const words = [...p.onsite.map((t) => t.ask), p.title, p.onsite_src, tx.law,
      tx.prepMine("영역", "고른 항목"), tx.prepTried("영역"), tx.prepStrong("영역", null), tx.prepUses("영역"), tx.prepJob("직무"),
      cs[p.company]?.prep_company ?? "", cs[p.company]?.process ?? ""].join(" ");
    ok(`${p.code}: 기관 문장에 학교 말이 없다`, !SCHOOL_WORDS.test(words), (words.match(SCHOOL_WORDS) ?? []).join(" "));
  }
}
for (const [key, c] of Object.entries(cs)) {
  const noSrc = c.facts.filter((f) => !f.src || !f.on);
  ok(`${key}: 사실 칸마다 출처 · 기준일`, !noSrc.length, noSrc.map((f) => f.label).join(" "));
  const noReview = c.facts.filter((f) => !f.official && !f.review);
  ok(`${key}: 공식이 아닌 칸은 대조할 자리를 적었다`, !noReview.length, noReview.map((f) => f.label).join(" "));
  const nums = c.facts.filter((f) => /\d/.test(f.value) && !f.year);
  ok(`${key}: 숫자 칸은 연도 · 기준을 함께`, !nums.length, nums.map((f) => f.label).join(" "));
  ok(`${key}: 직무마다 출처`, c.jobs.every((j) => j.src && j.on));
  if (c.talent) ok(`${key}: 인재상은 공식 출처만`, c.talent.official, c.talent.src);
  const all = JSON.stringify(c);
  ok(`${key}: 대시 · 그림 글자 · 추천이 없다`, !/—|\p{Extended_Pictographic}|추천/u.test(all));
  ok(`${key}: 대표자 · 연락처를 싣지 않았다`, !/대표이사|대표자|\d{2,3}-\d{3,4}-\d{4}|@/.test(all));
  /* 지역 명단에 같은 이름이 있으면 지역 절이 가른 산업 묶음을 그대로 쓴다 */
  const dir = path.join(CONTENT_DIR, `${c.region === "세종" ? "sejong" : ""}-orgs.v1.json`);
  try {
    const names = (JSON.parse(readFileSync(dir, "utf8")) as { orgs: { name: string }[] }).orgs.map((o) => o.name.replace(/주식회사|\(주\)|㈜|\s/g, ""));
    ok(`${key}: 지역 명단에서 같은 이름으로 찾힌다`, names.some((n) => n.includes(c.match_name)), c.match_name);
  } catch { ok(`${key}: 지역 명단을 읽었다`, false, dir); }
}
/* 조사: 받는 사람마다 `전공` · `분야` 가 바뀌어도 조사가 맞는가(2026-11-03 견본: `분야이` · `분야과`) */
{
  const co = Object.values(cs)[0];
  for (const aud of ["school", "agency"] as const) {
    const tx = featuredText(aud);
    const base = { pack: null, viaRegion: false, chosen: false, uses: [], z1: [], z2: [], jobs: co.jobs };
    const leads = [
      tx.lead(co, { ...base, pack: "반도체", uses: ["설계"] }, "기계공학"),
      tx.lead(co, { ...base }, "컴퓨터·소프트웨어"),
      tx.lead(co, { ...base, jobs: co.jobs.filter((j) => j.cores.includes("*")) }, "경영"),
    ].join(" ");
    const bad = leads.match(/분야(이|과|은|을)\s|전공(가|와|는|를)\s|\)(이|과|은|을)\s/g) ?? [];
    ok(`${aud}: 머리 문장 조사`, !bad.length, bad.join(" "));
    if (aud === "agency") ok("agency: 머리 문장에 학교 말 없음", !SCHOOL_WORDS.test(leads), (leads.match(SCHOOL_WORDS) ?? []).join(" "));
  }
}
/* 문장 틀의 기계 문체 */
for (const aud of ["school", "agency"] as const) {
  const tx = featuredText(aud);
  const s = [tx.law, tx.chosen, tx.prepMine("구조 해석", "구속 조건"), tx.prepTried("설계"), tx.prepUses("설계"), tx.prepJob("장비 설계")].join(" ");
  const neg = s.split(/(?<=[.다요])\s+/).filter((x) => /^아직 .*없습니다/.test(x) || /하지 않습니다\.?$/.test(x));
  ok(`${aud}: 부정 종결이 겹치지 않는다`, neg.length < 2, `${neg.length}줄`);
  ok(`${aud}: 대시 · 그림 글자 없음`, !/—|\p{Extended_Pictographic}/u.test(s));
}
console.log(`\n${fail ? `걸림 ${fail}` : "전부 통과"}`);
process.exit(fail ? 1 : 0);
