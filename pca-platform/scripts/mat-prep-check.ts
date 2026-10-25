/**
 * **MAT 공고 화면의 면접 준비와 작은 일이 비지 않고 되풀이되지 않는가.**
 *
 *   npm run mat:prep            # 세 Core 예시 + 열린 Core 전체 영역 훑기
 *   SHOW=1 npm run mat:prep     # 만든 줄을 전부 찍는다
 *
 * DB 를 쓰지 않는다. `src/lib/assistant/prep.ts` 의 순수 함수에 직접 만든 공고
 * 항목과 경험을 넣고 나온 줄을 센다.
 *
 * 세는 것:
 * - 면접 질문 · 가져갈 경험(또는 정직한 답) · 작은 일이 비지 않는가
 * - 한 공고 안에서 같은 질문(같은 틀)이 되풀이되지 않는가
 * - 작은 일마다 결과물 하나와 비교할 것 하나가 이름으로 들어 있는가
 * - 금지어(합격 · 추천 · 순위 · 점수 · 대신 지원 · 역량을 강화 · 대시 ·
 *   견줍니다 · 섭니다 · 세웁니다 · 확정합니다)가 없는가
 * - 조사가 `을를` · `과와` 처럼 덜 붙은 채로 나가지 않는가
 */
import { coreFile, registry } from "../src/lib/me-v3/core-registry";
import { interviewPrep, smallTasks, taskBody, type InterviewPrep, type SmallTask }
  from "../src/lib/assistant/prep";
import type { PostingItem } from "../src/lib/assistant/posting";
import type { Experience } from "../src/lib/me-v3/platform";

const SHOW = process.env.SHOW === "1";

const item = (text: string, kind: "must" | "nice", domain: string | null,
  axis: PostingItem["axis"], status: PostingItem["status"], evidence: string[] = []): PostingItem =>
  ({ text, kind, domain, axis, status, evidence, ...(domain ? {} : { reason: "condition" as const }) });

let seq = 0;
const exp = (title: string, td: string[], axes: string[], decisions: string[],
  artifacts: string[], verifications: string[]): Experience => ({
  id: String(++seq), kind: "project", title, started_on: null, ended_on: null,
  td_codes: td, axis_codes: axes, decisions, artifacts, verifications,
  note_text: null, status: "saved", created_at: "2026-10-01",
});

type Case = { id: string; core: string; label: string; items: PostingItem[]; exps: Experience[] };

const CASES: Case[] = [
  {
    id: "기계", core: "ME_CORE_V3", label: "자동화 장비 기구설계",
    items: [
      item("기구 설계 및 3D CAD 모델링", "must", "TD01", "J5", "partial", ["캡스톤디자인: 소형 컨베이어 구동부 설계"]),
      item("공차 해석과 설계 검증", "must", "TD01", "J6", "partial", ["캡스톤디자인: 소형 컨베이어 구동부 설계"]),
      item("구조 해석(FEA) 수행 경험", "must", "TD04", null, "empty"),
      item("설계 변경 사항 문서화", "must", "TD01", "J5", "partial", ["캡스톤디자인: 소형 컨베이어 구동부 설계"]),
      item("진동·소음 원인 분석", "must", "TD05", "J7", "empty"),
      item("학사 이상 기계공학 전공", "must", null, null, "unmapped"),
      item("PLM 사용 경험 우대", "nice", "TD01", "J4", "partial", ["캡스톤디자인: 소형 컨베이어 구동부 설계"]),
    ],
    exps: [
      exp("캡스톤디자인: 소형 컨베이어 구동부 설계", ["TD01"], ["J3", "J5"],
        ["하중과 재질을 근거로 두께나 단면을 정했다"], ["조립도", "부품도"], ["다른 설계안", "손계산"]),
      exp("기계공작실습: 선반 가공 부품 치수 측정", ["TD07"], ["J6"],
        [], ["시험 성적서"], ["반복 측정"]),
    ],
  },
  {
    id: "경영", core: "BIZ_CORE_V1", label: "식품 브랜드 마케팅 신입",
    items: [
      item("온라인 캠페인 기획 및 운영", "must", "TD02", "J3", "ready", ["마케팅 캡스톤 — 지역 식품 브랜드 판매 개선안"]),
      item("채널별 성과 지표 분석", "must", "TD08", "J6", "partial", ["마케팅조사론 팀과제 — 커피 소비 설문 분석"]),
      item("시장 조사와 고객 세분화", "must", "TD02", "J1", "ready", ["마케팅 캡스톤 — 지역 식품 브랜드 판매 개선안"]),
      item("영업 제안서 작성", "must", "TD03", "J5", "empty"),
      item("예산 집행과 원가 관리", "must", "TD05", null, "empty"),
      item("엑셀 활용 능력", "must", null, null, "unmapped"),
      item("해외 판로 개척 경험 우대", "nice", "TD11", null, "empty"),
    ],
    exps: [
      exp("마케팅 캡스톤 — 지역 식품 브랜드 판매 개선안", ["TD02"], ["J1", "J3"],
        ["고객을 나누는 기준을 정했다", "분석 방법을 골라 적용했다"], ["캠페인 기획서", "지표 정의표"], []),
      exp("마케팅조사론 팀과제 — 커피 소비 설문 분석", ["TD08"], ["J4"],
        ["자료에서 넣을 것과 뺄 것을 정했다"], ["분석 보고"], []),
    ],
  },
  {
    id: "간호", core: "NURSING_CORE_V1", label: "대학병원 신규 간호사",
    items: [
      item("환자 상태 사정 및 간호 기록", "must", "TD01", "J2", "partial", ["성인간호학 실습 — 내과 병동 환자 사정"]),
      item("투약 및 주사 관리", "must", "TD03", "J6", "empty"),
      item("환자 상태 변화 조기 발견과 보고", "must", "TD04", null, "empty"),
      item("감염관리 지침 준수", "must", "TD07", "J3", "empty"),
      item("인계 및 기록 작성", "must", "TD06", "J5", "partial", ["성인간호학 실습 — 내과 병동 환자 사정"]),
      item("간호사 면허 소지자", "must", null, null, "unmapped"),
      item("환자 교육 경험 우대", "nice", "TD09", null, "empty"),
    ],
    exps: [
      exp("성인간호학 실습 — 내과 병동 환자 사정", ["TD01", "TD06"], ["J2", "J5"],
        ["먼저 볼 사정 항목을 정했다"], ["사정 기록"], ["앞 근무자의 사정 기록"]),
    ],
  },
];

/* 금지어. 앞 다섯은 법적 범위, 뒤는 문체 규칙(docs/metri/report-writing-rules.md).
   `우선순위` 는 간호 영역 이름이라 세지 않는다(사람을 줄 세우는 말이 아니다) */
const BANNED = [/합격/, /추천/, /(?<!우선)순위/, /점수/, /대신 지원/, /역량을 (강화|키우)/, /—/,
  /견줍니다/, /섭니다/, /세웁니다/, /확정합니다/, /을를/];

let bad = 0;
const fail = (s: string) => { bad += 1; console.log(`  걸림  ${s}`); };
/**
 * 우리가 쓴 말만 센다. 학생이 적은 경험 제목과 공고 문장은 걷어 낸다:
 * 제목에 대시가 있는 것은 그 학생의 글이고 우리 원고가 아니다.
 */
const lines = (iv: InterviewPrep[], ts: SmallTask[], theirs: string[] = []) => [
  ...iv.flatMap((x) => [x.question, x.frame ?? "", x.honest ?? ""]),
  ...ts.map((t) => t.task),
].filter(Boolean).map((s) => theirs.reduce((acc, t) => acc.split(t).join("·"), s));
/** 틀이 같은가를 본다: 따옴표 안과 영역 이름을 걷어 낸다 */
const shape = (s: string, area: string) => s.replace(/‘[^’]*’/g, "‘…’").split(area).join("{영역}");

let nQ = 0, nT = 0;
for (const c of CASES) {
  const iv = interviewPrep(c.core, c.items, c.exps);
  const ts = smallTasks(c.core, c.items, c.exps);
  nQ += iv.length; nT += ts.length;
  const mustWithDomain = c.items.filter((x) => x.kind === "must" && x.domain).length;
  if (!iv.length) fail(`[${c.id}] 면접 질문이 하나도 없다`);
  if (iv.length > 6) fail(`[${c.id}] 면접 질문이 여섯을 넘는다: ${iv.length}`);
  if (iv.filter((x) => x.kind === "must").length < Math.min(6, mustWithDomain)) {
    fail(`[${c.id}] 필수 항목이 먼저 오지 않았다`);
  }
  const qs = new Set<string>(); const shapes = new Set<string>();
  for (const x of iv) {
    if (!x.question.trim()) fail(`[${c.id}] 빈 질문: ${x.text}`);
    if (qs.has(x.question)) fail(`[${c.id}] 같은 질문: ${x.question}`);
    qs.add(x.question);
    const area = coreFile<{ domains: { code: string; name: string }[] }>(c.core, "domains")
      .domains.find((d) => d.code === x.domain)?.name ?? x.domain;
    const sh = `${x.axis}|${shape(x.question, area)}`;
    if (shapes.has(sh)) fail(`[${c.id}] 같은 틀의 질문: ${x.question}`);
    shapes.add(sh);
    if (!x.frame && !x.honest) fail(`[${c.id}] 가져갈 경험도 정직한 답도 없다: ${x.text}`);
    const has = c.exps.some((e) => e.td_codes.includes(x.domain));
    if (has && !x.experience) fail(`[${c.id}] 그 영역 경험이 있는데 고르지 않았다: ${x.text}`);
    if (!has && x.experience) fail(`[${c.id}] 그 영역 경험이 없는데 골랐다: ${x.text}`);
    if (x.status === "empty" && !x.experience && !x.honest) fail(`[${c.id}] 경험 없음을 적지 않았다: ${x.text}`);
  }
  const want = c.items.filter((x) => x.kind === "must" && x.domain
    && (x.status === "empty" || x.status === "partial")).length;
  if (ts.length !== want) fail(`[${c.id}] 작은 일 ${ts.length}줄 (기대 ${want})`);
  for (const t of ts) {
    if (!t.task.includes(t.artifact)) fail(`[${c.id}] 작은 일에 결과물이 없다: ${t.task}`);
    if (!t.task.includes(t.verify)) fail(`[${c.id}] 작은 일에 비교할 것이 없다: ${t.task}`);
    if (taskBody(t, c.label).length > 400) fail(`[${c.id}] 담을 문장이 400자를 넘는다`);
  }
  if (new Set(ts.map((t) => t.task)).size !== ts.length) fail(`[${c.id}] 같은 작은 일이 되풀이된다`);
  for (const s of lines(iv, ts, [...c.exps.map((e) => e.title), ...c.items.map((x) => x.text)])) {
    for (const b of BANNED) if (b.test(s)) fail(`[${c.id}] 금지어 ${b}: ${s}`);
    if ((s.match(/아니라/g) ?? []).length) fail(`[${c.id}] 'A가 아니라 B': ${s}`);
  }

  console.log(`\n[${c.id}] ${c.core} · 질문 ${iv.length} · 작은 일 ${ts.length}`);
  for (const x of iv.slice(0, SHOW ? 99 : 3)) {
    console.log(`  Q  ${x.question}`);
    if (x.experience) console.log(`     가져갈 경험: ${x.experience.title}`);
    if (x.frame) console.log(`     답의 뼈대: ${x.frame}`);
    if (x.honest) console.log(`     경험이 없다면: ${x.honest}`);
  }
  for (const t of ts.slice(0, SHOW ? 99 : 2)) console.log(`  할 일  ${t.task}`);
}

/* ── 열린 Core 전체 영역 훑기 ──
   예시 셋만 보면 다른 전공 사전에서 결과물이나 비교할 것이 비는 영역을 모른다.
   영역마다 `아직 없음` 필수 항목 하나와 판단축 여덟을 돌려 본다 */
let swept = 0, sweptCores = 0;
for (const c of registry().cores) {
  if (!c.files?.domains) continue;
  let doms: { code: string }[];
  try { doms = coreFile<{ domains: { code: string }[] }>(c.code, "domains").domains; }
  catch { continue; }
  sweptCores += 1;
  for (const d of doms) {
    const its = (["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"] as const)
      .map((ax, i) => item(`${d.code} 요구 ${i}`, "must", d.code, ax, i % 2 ? "partial" : "empty"));
    const iv = interviewPrep(c.code, its, [], 8);
    const ts = smallTasks(c.code, its, []);
    swept += 1;
    if (iv.length !== 8 || new Set(iv.map((x) => x.question)).size !== 8) {
      fail(`[${c.code} ${d.code}] 질문이 여덟이 아니거나 되풀이된다`);
    }
    if (ts.length !== 8) fail(`[${c.code} ${d.code}] 사전에 결과물이나 비교할 것이 없어 작은 일이 ${ts.length}줄`);
    for (const s of lines(iv, ts)) {
      for (const b of BANNED) if (b.test(s)) { fail(`[${c.code} ${d.code}] 금지어 ${b}: ${s}`); break; }
    }
  }
}

console.log(`\n예시 세 Core: 질문 ${nQ} · 작은 일 ${nT} · 훑은 영역 ${swept}개(Core ${sweptCores}벌)`);
console.log(bad ? `\n걸림 ${bad}` : "\nMAT 면접 준비·작은 일 OK");
process.exitCode = bad ? 1 : 0;
