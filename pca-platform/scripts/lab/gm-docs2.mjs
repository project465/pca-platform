#!/usr/bin/env node
/* BIZ GM v2 검증표 두 벌을 데이터에서 만든다. 손으로 적지 않는다: 자료를 고친 날
   표가 조용히 옛 내용을 들고 있게 된다.
     node scripts/lab/gm-docs2.mjs
   → docs/metri/review/pdf-gm/v2/COMPANY_VERIFICATION.md · TRACE.md */
import fs from "node:fs";
const OUT = "docs/metri/review/pdf-gm/v2";
const set = JSON.parse(fs.readFileSync("data/region/kr-chungcheong-orgs.v2.json", "utf8"));
const REG = { DAEJEON: "대전", SEJONG: "세종", CHUNGNAM: "충남", CHUNGBUK: "충북", NATIONAL: "전국" };
const JOB = { POSTING_SEEN: "채용 공고에서 본 직무", ORG_PAGE: "기업 자료에 적힌 조직", INDUSTRY_EXAMPLE: "산업 일반 예시" };
const cell = (s) => String(s ?? "—").replace(/\|/g, "／").replace(/\n/g, " ");
const role = (c) => ({ ROLE_PLAN_V1: "경영기획", ROLE_ANALYTICS_V1: "데이터·분석", ROLE_FINACC_V1: "재무·회계", ROLE_OPS_V1: "운영·구매", ROLE_CS_V1: "서비스·고객운영", ROLE_SALES_V1: "영업·사업개발", ROLE_MKT_V1: "마케팅", ROLE_HR_V1: "인사" }[c] ?? c);

let a = `# 기업 검증표 (BIZ GM v2 · 미리보기)\n\n자료: \`data/region/kr-chungcheong-orgs.v2.json\` · 확인일 ${set.checked_on} · 상태 \`${set.status}\`\n\n`;
a += `- KODATA 는 **제3자 기업정보**이고 공식 홈페이지·공시와 같은 층으로 적지 않는다. 재무표·신용등급·주주·거래처 이름·임원 개인정보는 옮기지 않았다. 원본 보고서는 저장소에 올리지 않는다(대외비 폴더).\n`;
a += `- \`OFFICIAL_CROSSCHECKED\` 는 공식 홈페이지 **검색 결과**가 KODATA 의 사업자번호·주소·사업과 맞았다는 뜻이다. 원문 페이지를 이 환경에서 직접 열람하지 못한 자리가 있다.\n`;
a += `- 채용 여부는 전부 **미확인**이다. 공고에서 본 직무는 그 직무가 있었다는 근거까지다.\n\n`;
a += `| 기업 | 출처 구분 | 사업자번호 | 상장 | 지역(근거) | 본점 | 산업 | 직무(확인 상태) | 검증 | 추가 확인 필요 |\n|---|---|---|---|---|---|---|---|---|---|\n`;
for (const o of set.orgs) {
  a += `| ${cell(o.name)} | ${o.origin === "EXISTING_V1" ? "기존 후보" : "KODATA 신규"} | ${cell(o.identifiers?.bizno ?? "미확인")} | ${cell(o.identifiers?.listing)} | ${REG[o.region]}(${cell(o.region_basis)}) | ${cell(o.hq?.text)} | ${cell(o.industry_line)} | ${o.jobs.map((j) => `${role(j.role)}(${JOB[j.status]})`).join(" · ")} | ${o.verify} | ${cell(o.to_check.join(" · "))} |\n`;
}
a += `\n## 출처\n\n`;
for (const o of set.orgs) a += `- **${o.name}**: ${o.sources.map((s, i) => `[${i + 1}] ${s.kind} — ${s.title}${s.url ? ` (${s.url})` : ""} · ${s.checked_on}`).join(" / ")}\n`;
fs.writeFileSync(`${OUT}/COMPANY_VERIFICATION.md`, a);

let t = `# Evidence → 직무 → 기업 → 준비 연결 검증표 (BIZ GM v2)\n\n세 사례의 \`var/pdf-gm/<사례>.r2.json\` 에서 만든다. 줄마다 보고서의 주장이 어느 입력에서 왔는지 적는다. DB 는 바꾸지 않았다.\n`;
for (const tag of ["RICH", "POOR", "CONTRA"]) {
  const r = JSON.parse(fs.readFileSync(`var/pdf-gm/${tag}.r2.json`, "utf8"));
  const ids = JSON.parse(fs.readFileSync("var/pdf-gm/cases2.json", "utf8"));
  t += `\n## ${tag} (응시 ${ids[tag]})\n\n### 심층 분석 기업\n\n| 기업 | 연결 근거 | 직무(확인 상태) | 지금 가진 근거 | 추가로 필요한 것 | 1개월 → 2~3개월 → 4~6개월 |\n|---|---|---|---|---|---|\n`;
  for (const e of r.explore.deep) {
    t += `| ${cell(e.org.name)} | ${cell(e.links.map((l) => l.kind).join(" · "))} | ${cell(e.jobs.map((j) => `${j.name}(${JOB[j.status]})`).join(" · "))} | ${cell((e.q?.current ?? []).join(" · "))} | ${cell((e.q?.needs ?? []).join(" · "))} | ${cell(e.roadmap.map((x) => x.what).join(" → "))} |\n`;
  }
  t += `\n### 주장 → 출처\n\n| 장 | 주장 | 입력 |\n|---|---|---|\n`;
  for (const x of r.trace) t += `| ${cell(x.section)} | ${cell(x.claim)} | ${cell(x.from.join(" · "))} |\n`;
}
fs.writeFileSync(`${OUT}/TRACE.md`, t);
console.log("written", `${OUT}/COMPANY_VERIFICATION.md`, `${OUT}/TRACE.md`);
