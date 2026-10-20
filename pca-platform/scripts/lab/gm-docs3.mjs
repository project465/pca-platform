#!/usr/bin/env node
/* BIZ GM v3 검토 문서를 뽑은 PDF 글자와 r3.json 에서 만든다. 손으로 적지 않는 표:
   전후 문장 대조 · 기업별 전략 차별성 · 근거 연결 · 쪽별 점검 · 기업 검증표.
     node scripts/lab/gm-docs3.mjs   (먼저 gm-report3.ts 와 r35_pdfpages.py 를 돌린다) */
import fs from "node:fs";
const OUT = "docs/metri/review/pdf-gm/v3";
const TAGS = ["RICH", "POOR", "CONTRA"];
const ids = JSON.parse(fs.readFileSync("var/pdf-gm/cases2.json", "utf8"));
const flat = (s) => s.replace(/\s+/g, " ");
const raw3 = Object.fromEntries(TAGS.map((t) => [t, flat(fs.readFileSync(`var/pdf-gm/txt3/${t}.raw.txt`, "utf8"))]));
const raw2 = Object.fromEntries(TAGS.map((t) => [t, flat(fs.readFileSync(`var/pdf-gm/txt/${t}.txt`, "utf8"))]));
const R = Object.fromEntries(TAGS.map((t) => [t, JSON.parse(fs.readFileSync(`var/pdf-gm/${t}.r3.json`, "utf8"))]));
const cell = (s) => String(s ?? "—").replace(/\|/g, "／").replace(/\n/g, " ");
/** 열쇠가 든 문장 하나를 꺼낸다. 없으면 멈춘다: 문서에 실재하지 않는 문장을 적지 않는다 */
function sent(s, key, w = 170) {
  // 두 단 짜임은 꺼낸 글에서 줄이 섞인다: 열쇠 전체가 없으면 앞 14자 · 뒤 14자로 다시 찾는다
  let i = s.indexOf(key);
  if (i < 0) i = s.indexOf(key.slice(0, 14));
  if (i < 0) i = s.indexOf(key.slice(-14));
  if (i < 0) throw new Error(`없는 문장: ${key}`);
  // 왼쪽은 같은 문장 안에서만 넓힌다: 쪽 머리말·꼬리말이 끼지 않게
  const dot = Math.max(s.lastIndexOf(". ", i), s.lastIndexOf("다 ", i));
  let a = dot >= 0 && i - dot < 80 ? dot + 2 : i;
  const ends = [". ", "다. ", "요 "].map((e) => s.indexOf(e, i + key.length)).filter((x) => x > 0);
  const b = Math.min(...ends, i + w) + 1;
  return s.slice(a, b).replace(/\d+ \/ \d+ 배재대학교 · 경영학과 CareerMatri PRO 진로·취업 분석 리포트/g, "").replace(/검토용 · 배포 전/g, "").trim();
}

/* 1. 전후 문장 대조 (≥20) */
const PAIRS = [
  ["RICH", "그 기록에는 견준 대상이 비어 있습니다", "RICH", "결과를 무엇과 비교했는지(목표·지난 실적·다른 안)", "측정 용어(견준 대상)를 주어로 쓰고 무엇을 하라는지 없었다 → 채워 둘 항목을 학생의 말로 적는다"],
  ["RICH", "이 영역이 깊게 열리면 기록이 판단으로 확인됩니다", "RICH", "이번 검사에서는 이 영역을 자세히 묻지 않았고", "‘깊게 열리면’은 내부 routing 표현이다 → 묻지 않았다는 사실과 지금의 근거를 적는다"],
  ["RICH", "먼저 채울 것은 데이터·의사결정의 ‘기준·배분 직접 결정’입니다", "RICH", "가장 먼저 채울 판단은 데이터·의사결정의 ‘기준과 배분 정하기’입니다", "축 라벨(기준·배분 직접 결정)을 판단 이름(기준과 배분 정하기)으로 바꾸고 차례의 근거를 붙였다"],
  ["CONTRA", "그래서 그 판단들은 ‘직접 해 봄’까지만 적었습니다", "CONTRA", "이 보고서는 그 판단들을 ‘직접 수행’ 단계까지만 반영했습니다", "주어 없는 ‘적었습니다’ → 보고서가 무엇을 반영했는지 주어를 밝혔다"],
  ["CONTRA", "‘근거가 섰다’고 적지 않았습니다", "CONTRA", "해 본 일을 확인 가능한 기록으로 바꾸는 것이 첫 과제입니다", "내부 판정 용어(근거가 섰다)를 걷고 학생이 할 일로 끝낸다"],
  ["CONTRA", "한 단계를 올리는 가장 짧은 길입니다", "CONTRA", "다음 과제에서 이 가운데 하나를 골라 ‘내가 정한 것’으로 만들어 보면 좋습니다", "잠언형 종결(가장 짧은 길)을 구체 행동으로 바꿨다"],
  ["POOR", "적어 둔 경험 기록도 아직 없어 견줄 자리가 없습니다", "POOR", "처음 해 볼 수 있는 활동", "‘견줄 자리가 없다’로 끝나던 장을 성장 설계(입문 활동·학습 순서·첫 프로젝트)로 바꿨다"],
  ["POOR", "‘매장 현장의 응대 기준을 두는가’를 봅니다", "POOR", "소비재·유통 산업에서는 ‘매장 현장의 응대 기준을 두는지’가 이 판단이 쓰이는 대표 장면입니다", "산업팩 판단 이름(~는가)을 문장에 끼우던 뿌리를 고쳤다(askNoun)"],
  ["CONTRA", "목표 산업 공공·공기관에서 ‘민원 처리 기준을 두는가’를 봅니다", "CONTRA", "공공·공기관 산업에서는 ‘민원 처리 기준을 두는지’가 이 판단이 쓰이는 대표 장면입니다", "같은 뿌리 · ‘봅니다’ 주어 없음"],
  ["POOR", "남긴 결과물이 하나도 고르지 않아", "POOR", "근거 항목 0개(그중 결과물 0개)", "주어·조사 오류(결과물이 하나도 고르지 않아)를 걷고 고른 수를 사실 그대로 적는다"],
  ["RICH", "주어진 조건으로 해 봄 · 2 직접 해 봄 · 3 직접 기준을", "RICH", "지시받아 수행", "‘해 봄’ 라벨 셋 → 용어 쪽에 단계 이름과 뜻을 한 번 적고 본문은 그 이름만 쓴다"],
  ["RICH", "물어본 판단 24칸 가운데 14칸이 ‘직접 해 봄’", "RICH", "기준까지 직접 정했다고 답했습니다", "칸 수 세기(24칸 가운데 14칸)는 측정 내부 표현이다 → 어느 판단을 어디까지 했는지 이름으로 적는다"],
  ["CONTRA", "물어본 판단 32칸 가운데 28칸이 ‘직접 해 봄’ 이상이지만", "CONTRA", "그 경험을 보여 줄 결과물과 비교 기록이 아직 부족합니다", "같은 칸 수 세기 → 무엇이 부족한지를 적는다"],
  ["RICH", "결과 모델이 고른 빈자리 차례로 줄을 세웠습니다", "RICH", "차례는 목표 직무 · 목표 산업 · 영역에서 빠질 수 없는 판단 순서로 세웠습니다", "내부 이름(결과 모델 · 빈자리)을 걷었다"],
  ["CONTRA", "그 판단을 받칠 체크리스트 근거를 하나도 고르지 않았습니다", "CONTRA", "어느 고객을 보고 어느 채널에 쓸지를 해 본 과제", "어긋남을 지적만 하던 줄 → 영역마다 스스로 확인하는 과제로 바꿨다"],
  ["RICH", "지금 꺼내 쓸 것", "RICH", "직접 판단한 경험이 확인된 영역", "제목형 압축어(꺼내 쓸 것)를 무엇이 확인됐는지 말하는 이름으로 바꿨다"],
  ["RICH", "결과가 기대와 달랐던 적이 있나요?", "RICH", "그 숫자는 어떻게 정했나요?", "모든 영역에 같던 질문 → 직무 안내에서 그 영역에 맞는 질문과 묻는 까닭을 함께 적는다"],
  ["CONTRA", "‘직무 기준과 뽑는 기준과 재는 기준을 확정한다’ 쪽 일에서 내가 정한 것 하나와 그 근거", "CONTRA", "자기소개서에서는", "직무 소유 문장을 그대로 붙이던 자리 → 기업·직무별로 중심 장면·결과물·맥락을 적는다"],
  ["RICH", "신입으로 들어갈 자리가 있는지는 공고마다", "RICH", "어떤 일인지 · 영어 문서 작성 요구 수준", "한 줄 주의 → 기업별로 공고에서 확인할 조건을 목록으로 적는다"],
  ["RICH", "공식 홈페이지·상장 정보·채용 공고는 검색 결과로 대조했고 원문을 직접 열람하지 못한 자리가 있습니다", "RICH", "검색 결과만 확인", "확인 수준을 한 문장으로 뭉뚱그리던 것 → 사실마다 5단계 검증 표시를 단다"],
  ["POOR", "여러 일을 끝까지 맡아 본 경험이 그대로 쓰이는 자리입니다", "POOR", "이 학생이 이 기업을 탐색할 이유", "기업 공통 문장 → 기업마다 사업 구조에서 나온 탐색 이유를 적는다"],
  ["RICH", "수치·기간·성과는 리포트가 만들지 않으며, 그 자리는 직접 적는 칸으로 남겼습니다", "RICH", "결과 수치와 기간을 넣으면 한 문단이 완성됩니다", "‘리포트가 만들지 않으며’(제품 설명) → 학생이 무엇을 넣으면 되는지로 끝낸다"],
];
let ba = `# 문장 전후 대조 (v2 → v3)\n\n앞 판(v2)의 PDF 글자와 이번 판(v3)의 PDF 글자에서 **실제로 나온 문장**만 옮겼다. 두 쪽 다 \`pdftotext\` 로 꺼낸 글이라 단 나눔 때문에 앞뒤가 조금 섞인 자리가 있다.\n고친 자리는 문자열 치환이 아니라 그 문장을 만드는 규칙이다(오른쪽 칸).\n\n| # | 사례 | v2 (반려된 판) | v3 | 무엇을 고쳤나 |\n|---|---|---|---|---|\n`;
PAIRS.forEach(([t2, k2, t3, k3, why], i) => { ba += `| ${i + 1} | ${t2} | ${cell(sent(raw2[t2], k2))} | ${cell(sent(raw3[t3], k3))} | ${cell(why)} |\n`; });
fs.writeFileSync(`${OUT}/BEFORE_AFTER.md`, ba);

/* 2. 기업별 전략 차별성 */
const tri = (s) => { const x = s.replace(/\s+/g, ""); const S = new Set(); for (let i = 0; i < x.length - 2; i++) S.add(x.slice(i, i + 3)); return S; };
const jac = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n / Math.max(1, a.size + b.size - n); };
const units = new Map();
for (const t of TAGS) for (const c of R[t].companies) for (const j of c.jobs) {
  const k = `${c.name} · ${j.name}`;
  const text = [j.learn.join(" "), j.project.title, j.project.steps.join(" "), j.portfolio, j.interview.join(" "), j.posting.join(" ")].join(" ");
  if (!units.has(k)) units.set(k, { k, text, cases: new Set() });
  units.get(k).cases.add(t);
}
const U = [...units.values()];
const pairs = [];
for (let i = 0; i < U.length; i++) for (let j = i + 1; j < U.length; j++) pairs.push({ a: U[i].k, b: U[j].k, s: jac(tri(U[i].text), tri(U[j].text)) });
pairs.sort((x, y) => y.s - x.s);
let sd = `# 기업별 전략 차별성 점검\n\n세 사례의 심층 기업 × 직무 묶음 ${U.length}개에서 **회사·직무 고유 전략**(학습 내용 · 실무형 프로젝트 · 포트폴리오 주제 · 면접 질문 · 공고 확인 조건)을 모아 글자 세 개 묶음의 겹침(자카드)을 쟀다. 학생의 근거에서 오는 줄(기존 경험 발전 · 자기소개서)은 같은 학생 안에서 닮는 것이 맞아 뺐다.\n\n- 묶음 수 ${U.length} · 견준 쌍 ${pairs.length}\n- 가장 닮은 쌍 ${pairs[0].s.toFixed(2)} · 중앙값 ${pairs[Math.floor(pairs.length / 2)].s.toFixed(2)} · 0.30 넘는 쌍 ${pairs.filter((p) => p.s > 0.3).length}개\n\n## 가장 닮은 다섯 쌍\n\n| 묶음 A | 묶음 B | 겹침 |\n|---|---|---|\n`;
for (const p of pairs.slice(0, 5)) sd += `| ${p.a} | ${p.b} | ${p.s.toFixed(2)} |\n`;
sd += `\n## 묶음마다의 실무형 프로젝트\n\n| 기업 · 직무 | 사례 | 프로젝트 | 남길 것 |\n|---|---|---|---|\n`;
for (const t of TAGS) for (const c of R[t].companies) for (const j of c.jobs) sd += `| ${c.name} · ${j.name}${j.extra ? " (함께 볼 직무)" : ""} | ${t} | ${cell(j.project.title)} | ${cell(j.project.output)} |\n`;
fs.writeFileSync(`${OUT}/STRATEGY_DIFF.md`, sd);

/* 3. 근거 연결 */
const norm = (s) => s.replace(/\s+/g, "");
// PDF 에서 꺼낸 글은 여러 단 짜임에서 줄이 섞여 긴 항목이 끊긴다: 그 PDF 를 그린 HTML 의 글로 센다(같은 글이다)
const htmlText = (t) => fs.readFileSync(`var/pdf-gm/BIZ-GM3-${t}.html`, "utf8").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
let el = `# Evidence ↔ 분석 문장 연결 점검\n\n\`r3.json\` 의 trace 줄마다 그 주장을 받치는 근거 항목(학생이 고른 체크리스트 문장·결과물·비교 대상)이 **그 PDF 를 그린 HTML 의 글자 안에 실제로 서 있는지** 센다(PDF 에서 꺼낸 글은 네 칸 짜임에서 줄이 섞여 긴 항목이 끊기므로 같은 글인 HTML 로 센다). 근거 없이 선 개인 분석 문장이 있으면 여기서 드러난다.\n\n| 사례 | trace 줄 | 근거 항목 | PDF 에서 찾음 | 근거 없는 주장 |\n|---|---|---|---|---|\n`;
const rows = [];
for (const t of TAGS) {
  const s = norm(htmlText(t));
  let n = 0, found = 0, empty = [];
  for (const tr of R[t].trace) {
    const ev = tr.evidence ?? [];
    n += ev.length; found += ev.filter((e) => s.includes(norm(e))).length;
    // 근거가 있어야 서는 주장(강점 · 준비 근거 있음 · 근거 갖춤)인데 근거 항목이 하나도 없으면 센다
    if (!ev.length && /가장 분명한 강점|준비 근거 있음|근거 갖춤/.test(tr.claim)) empty.push(tr.claim);
    rows.push([t, tr.section, tr.claim, ev.length, ev.filter((e) => !s.includes(norm(e)))]);
  }
  el += `| ${t} (응시 ${ids[t]}) | ${R[t].trace.length} | ${n} | ${found} / ${n} | ${empty.length ? cell(empty.join(" · ")) : "0"} |\n`;
}
el += `\n## 줄마다\n\n| 사례 | 장 | 주장 | 근거 수 | PDF 에 없는 근거 |\n|---|---|---|---|---|\n`;
for (const [t, sec, claim, n, miss] of rows) el += `| ${t} | ${cell(sec)} | ${cell(claim)} | ${n} | ${miss.length ? cell(miss.join(" · ")) : "—"} |\n`;
fs.writeFileSync(`${OUT}/EVIDENCE_LINKS.md`, el);

/* 4. 쪽별 점검 */
const TYPE = { "종합": "A", "개인별": "A", "영역별": "A", "경험 기록": "A", "검사 응답": "A", "강점": "B", "성장": "B", "역량 개발": "B", "직무별": "C", "대전": "A", "진로 탐색 기업": "C", "자기소개서": "B", "단계별": "B", "정리": "D", "분석 근거": "D" };
let pq = `# 쪽별 디자인·가독성 점검\n\n쪽마다 어느 장인지, 쪽 유형(A 분석 · B 실행 계획 · C 기업·직무 심층 · D 워크시트·정리), 글자 수, 세로로 찬 비율을 적는다. 채움은 \`r35_pdfpages.py\` 가 잉크의 맨 아래로 잰다. 30% 아래는 장의 마지막 쪽이 아니면 다시 본다.\n`;
for (const t of TAGS) {
  const pg = JSON.parse(fs.readFileSync(`var/pdf-gm/r3png/${t}/${t}-pages.json`, "utf8")).rows;
  const per = JSON.parse(fs.readFileSync(`var/pdf-gm/${t}.pages3.json`, "utf8")).per;
  pq += `\n## ${t} · ${pg.length}쪽\n\n| 쪽 | 장 | 유형 | 글자 | 채움 | 메모 |\n|---|---|---|---|---|---|\n`;
  pg.forEach((r, i) => {
    const ch = per[i] ?? "";
    const ty = ch === "표지" ? "표지" : ch === "차례" ? "차례·용어" : (Object.entries(TYPE).find(([k]) => ch.slice(3).startsWith(k))?.[1] ?? "");
    const last = per[i + 1] !== ch;
    const memo = r.fill < 0.3 ? (last ? "장의 마지막 쪽" : "다시 볼 것") : r.fill < 0.5 && last ? "장의 마지막 쪽" : "";
    pq += `| ${r.page} | ${cell(ch)} | ${ty} | ${r.chars} | ${Math.round(r.fill * 100)}% | ${memo} |\n`;
  });
}
fs.writeFileSync(`${OUT}/PAGE_QA.md`, pq);

/* 5. 기업 검증표 */
let cv = `# 기업 자료 검증표 (BIZ GM v3 · 검토용)\n\n5단계: 공식 원문 직접 확인 · 제3자 자료 확인 · 검색 결과만 확인 · 상충 정보 존재 · 검증되지 않음. **이 환경에서는 공식 원문을 직접 열지 못해 ‘공식 원문 직접 확인’은 0건**이다. KODATA 는 제3자 자료이며 학생 배포 범위가 확정되기 전까지 이 보고서는 검토용이다. 채용 여부는 전부 미확인이다.\n\n| 기업 | 사업자번호 | 쓰인 사례 | 검증 | 사실별 표시 |\n|---|---|---|---|---|\n`;
const seen = new Map();
for (const t of TAGS) for (const c of R[t].companies) { const x = seen.get(c.id) ?? { c, cases: [] }; x.cases.push(t); seen.set(c.id, x); }
for (const { c, cases } of seen.values()) {
  const cnt = {}; for (const f of c.facts) cnt[f.level] = (cnt[f.level] ?? 0) + 1;
  cv += `| ${c.name} | ${c.bizno ?? "미확인"} | ${cases.join(" · ")} | ${c.verify} | ${Object.entries(cnt).map(([k, v]) => `${k} ${v}`).join(" · ")} |\n`;
}
cv += `\n## 출처\n\n`;
for (const { c } of seen.values()) cv += `- **${c.name}**: ${c.sources.map((s, i) => `[${i + 1}] ${s.kind} — ${s.title}${s.url ? ` (${s.url})` : ""} · ${s.checked_on}`).join(" / ")}\n`;
fs.writeFileSync(`${OUT}/COMPANY_VERIFICATION.md`, cv);
console.log("written", OUT, "pairs", PAIRS.length, "units", U.length, "maxsim", pairs[0].s.toFixed(2));
