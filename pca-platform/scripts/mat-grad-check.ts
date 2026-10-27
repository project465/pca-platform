/**
 * **MAT 이 대학원생 · 박사후연구원을 제대로 받는가.**
 *
 *   npm run mat:grad          # 스물 가지
 *   SHOW=1 npm run mat:grad   # 만든 줄을 전부 찍는다
 *
 * DB 를 쓰지 않는다. `src/lib/assistant/research.ts` 와 규칙 공고 읽기
 * (`rules.ts`)에 직접 만든 공고와 경험을 넣고 나온 줄을 센다.
 *
 * 세는 것:
 * - 연구직 공고의 논문 · 특허 · 과제 · 발표 · 계획서 · 학위 줄이 규칙 읽기에서
 *   빠지지 않고, 종류가 맞게 갈리는가
 * - 기록에 결과물이 있으면 `있음`, 연구 기록만 있으면 `덜 적힘`, 없으면 `없음`
 * - **학위가 판정을 바꾸지 않는가**: 같은 기록이면 학부생과 박사의 상태가 같다
 * - 학위 조건은 `학위 조건` 으로만 적고 판정하지 않는가
 * - 학부생에게 대학원 카드 · 질문 · 할 일이 서지 않는가
 * - 단계마다 질문 셋이 서고, 단계끼리 같은 질문이 없는가
 * - 문장에 경험 칸에 없는 숫자가 들어가지 않는가
 * - 영어판에 한글이 없는가 · 금지어(합격 · 추천 · 순위 · 점수 · 대시)가 없는가
 */
import { readPosting } from "../src/lib/assistant/rules";
import {
  gradQuestions, gradWeekTask, researchAsks, researchCards, researchKindOf, type GradStage,
} from "../src/lib/assistant/research";
import type { PostingItem } from "../src/lib/assistant/posting";
import type { Experience } from "../src/lib/me-v3/platform";

const SHOW = process.env.SHOW === "1";
let bad = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (!c) bad += 1;
  console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`);
};

const POSTING = `[OO연구원] 기계설계 연구직(박사후연구원) 채용
담당업무
- 구조해석 및 내구 설계 연구
- 국책과제 수행 및 연구계획서 작성
자격요건
- 기계공학 박사 학위 소지자
- 최근 3년 이내 SCI(E)급 논문 제1저자 2편 이상
- ANSYS 등 유한요소해석 경험
우대사항
- 관련 분야 특허 출원 또는 등록 실적
- 국제 학술대회 발표 경험
마감 2026-11-30`;

let seq = 0;
const exp = (kind: Experience["kind"], title: string, f: Partial<Experience> = {}): Experience => ({
  id: String(++seq), kind, title, started_on: null, ended_on: null,
  td_codes: ["TD02"], axis_codes: ["J3"], decisions: [], artifacts: [], verifications: [],
  problems: [], used_where: [], note_text: null, status: "saved", created_at: "2026-10-01", ...f,
});

/* 읽은 공고 줄을 화면이 받는 꼴로 */
const read = readPosting("ME_CORE_V3", POSTING, new Date("2026-10-27"));
const items: PostingItem[] = read.requirements.map((r) => ({
  text: r.text, kind: r.kind, domain: r.domain, axis: null,
  status: r.domain ? "empty" : "unmapped", evidence: [],
  ...(r.domain ? {} : { reason: r.reason ?? "condition" }),
}));

console.log("\n── 공고에서 연구 실적 줄 찾기");
const kinds = items.map((i) => researchKindOf(i.text)).filter(Boolean);
ok("① 논문 · 특허 · 과제 · 발표 · 학위 다섯 종류가 모두 잡힌다",
  ["paper", "patent", "project", "talk", "degree"].every((k) => kinds.includes(k as never)), kinds.join(","));
ok("② 업무 줄(구조해석 · ANSYS)은 연구 실적으로 읽지 않는다",
  items.filter((i) => i.domain).every((i) => researchKindOf(i.text) === null));
ok("③ `학위 논문` 은 논문 실적이 아니라 학위 조건이다",
  researchKindOf("석사 학위 논문 제출자") === "degree" && researchKindOf("SCI 학술지 논문 1편") === "paper");
ok("④ 영어 공고 줄도 같은 종류로 읽는다",
  researchKindOf("First-author publications in peer-reviewed journals") === "paper"
    && researchKindOf("PhD in Mechanical Engineering") === "degree"
    && researchKindOf("Experience writing grant proposals") === "proposal"
    && researchKindOf("Filed patents are a plus") === "patent");

console.log("\n── 기록과 맞대기");
const none: Experience[] = [];
const thin = [exp("research", "박사 학위 연구: 복합재 브래킷 피로 수명")];
const full = [
  exp("paper", "복합재 브래킷 피로 수명 논문", { artifacts: ["SCIE 저널 논문"], decisions: ["하중 조건"] }),
  exp("research", "국책과제 경량 구조 설계", { decisions: ["시험 하중 범위"], artifacts: ["과제 보고서", "연구계획서 3장"] }),
  exp("project", "브래킷 체결 구조 특허 출원", { artifacts: ["특허 출원서"] }),
  exp("paper", "춘계 학술대회 포스터 발표", { artifacts: ["포스터"] }),
];
const by = (xs: Experience[], stage: GradStage = "phd") => {
  void stage;
  return Object.fromEntries(researchAsks(items, xs).map((r) => [r.research, r.status]));
};
const a0 = by(none), a1 = by(thin), a2 = by(full);
if (SHOW) console.log(a0, a1, a2);
ok("⑤ 기록이 없으면 논문 · 특허 · 과제가 `기록에 없음`",
  a0.paper === "empty" && a0.patent === "empty" && a0.project === "empty");
ok("⑥ 결과물 칸이 빈 연구 기록만 있으면 논문 · 과제가 `덜 적힘`",
  a1.paper === "partial" && a1.project === "partial", JSON.stringify(a1));
ok("⑦ 결과물이 적힌 기록이면 `있음`",
  a2.paper === "ready" && a2.patent === "ready" && a2.project === "ready" && a2.talk === "ready", JSON.stringify(a2));
ok("⑦-2 논문 하나로 과제 수행이 `있음` 이 되지 않는다",
  by([exp("paper", "논문", { artifacts: ["SCIE 저널 논문"], decisions: ["하중 조건"] })]).project === "partial");
ok("⑧ 학위 줄은 언제나 `학위 조건` 이다(기록이 많아도 판정하지 않는다)",
  a0.degree === "info" && a2.degree === "info");
ok("⑨ 연구계획서는 결과물에 적힌 이름으로 받친다",
  researchAsks([{ text: "연구계획서 작성 경험", kind: "nice", domain: null, axis: null, status: "unmapped", evidence: [] }], full)[0]?.status === "ready");
ok("⑩ 같은 문장은 한 번만 선다",
  researchAsks([...items, ...items], full).length === researchAsks(items, full).length);

console.log("\n── 학위가 판정을 바꾸지 않는가");
const stages: GradStage[] = ["bachelor", "master", "phd", "postdoc"];
const sig = (xs: Experience[]) => JSON.stringify(researchAsks(items, xs).map((r) => r.status));
ok("⑪ 같은 기록이면 네 단계의 연구 실적 상태가 같다",
  new Set(stages.map(() => sig(full))).size === 1 && new Set(stages.map(() => sig(thin))).size === 1);

console.log("\n── 학부생 화면은 그대로");
ok("⑫ 학부생에게는 카드 · 질문 · 할 일이 서지 않는다",
  researchCards("bachelor", full).length === 0 && gradQuestions("bachelor", full).length === 0
    && gradWeekTask("bachelor", none) === null);

console.log("\n── 대학원생 질문과 카드");
const qs = Object.fromEntries((["master", "phd", "postdoc"] as const).map((s) => [s, gradQuestions(s, full)]));
if (SHOW) console.log(JSON.stringify(qs, null, 1));
ok("⑬ 단계마다 질문 셋", Object.values(qs).every((x) => x.length === 3));
const allQ = Object.values(qs).flat().map((x) => x.question);
ok("⑭ 단계끼리 같은 질문이 없다", new Set(allQ).size === allQ.length);
ok("⑮ 기록이 있으면 질문마다 가져갈 경험이 붙는다", Object.values(qs).flat().every((x) => x.experience));
ok("⑯ 기록이 없으면 정직한 실마리를 적는다",
  gradQuestions("phd", none).every((x) => !x.experience && /연구 경험이 아직 없어요/.test(x.frame)));
const cards = researchCards("phd", full);
ok("⑰ 카드는 연구·논문 기록에만 서고 칸이 찬 것이 먼저",
  cards.length === 3 && cards.every((c) => ["research", "paper"].includes(c.experience.kind))
    && cards[0].blanks.length <= cards[cards.length - 1].blanks.length);
ok("⑱ 연구 기록이 없는 대학원생에게만 이번 주 할 일이 선다",
  gradWeekTask("master", none) !== null && gradWeekTask("master", thin) === null);

console.log("\n── 문장");
const texts = [
  ...Object.values(qs).flat().flatMap((x) => [x.question, x.frame]),
  ...cards.flatMap((c) => [...c.sentences, c.focus]),
  ...researchAsks(items, none).map((r) => r.next),
  ...researchAsks(items, thin).map((r) => r.next),
  ...researchAsks(items, full).map((r) => r.next),
];
const BAN = /(합격|추천|순위|점수|대신 지원|역량을 강화|—|견줍니다|섭니다|세웁니다|확정합니다|을를|과와|이가|은는)/;
ok("⑲ 금지어와 덜 붙은 조사가 없다", texts.every((x) => !BAN.test(x)), texts.find((x) => BAN.test(x)) ?? "");
const digitsOf = (s: string) => s.match(/\d+/g) ?? [];
const srcDigits = new Set(full.flatMap((e) => [e.title, ...e.artifacts, ...e.decisions]).flatMap(digitsOf));
ok("⑳ 카드 문장에 기록에 없는 숫자가 없다",
  cards.flatMap((c) => c.sentences).flatMap(digitsOf).every((d) => srcDigits.has(d)));

/* 영어 작업공간의 기록은 영어로 적힌다 */
const fullEn = [
  exp("paper", "Fatigue life of composite brackets", { artifacts: ["journal paper"], decisions: ["load cases"] }),
  exp("research", "Lightweight structure project", { decisions: ["test load range"], artifacts: ["project report"] }),
];
const en = [
  ...(["master", "phd", "postdoc"] as const).flatMap((s) => gradQuestions(s, fullEn, "en").flatMap((x) => [x.question, x.frame])),
  ...researchCards("postdoc", fullEn, "en").flatMap((c) => [...c.sentences, c.focus]),
  ...researchAsks(items, thin, "en").map((r) => r.next),
  gradWeekTask("phd", none, "en") ?? "",
];
const hangul = (s: string) => /[가-힣]/.test(s);
ok("㉑ 영어판에 한글이 없다", en.every((x) => !hangul(x)), en.find(hangul) ?? "");

console.log(`\nMAT 대학원생 — 걸림 ${bad}`);
process.exit(bad ? 1 : 0);
