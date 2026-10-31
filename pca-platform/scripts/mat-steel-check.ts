/**
 * 대표 시험(2026-10-31)에서 걸린 다섯 가운데 넷을 같은 공고로 다시 잰다. DB 없이 돈다.
 *
 *   npx tsx scripts/mat-steel-check.ts
 *
 * 공고: 잡인더스트리 `현대제철 [연구직] 26년 하반기 경력/신입박사 채용` 의 강판개발 줄.
 * 회원: 기계공학, 경험 하나(구조·내구 해석 과제 · 남긴 것 수명 예측값 · 비교해 확인한 것 시험 결과).
 */
import { readPosting } from "../src/lib/assistant/rules";
import { refreshPosting, type PostingRow } from "../src/lib/assistant/posting";
import type { Experience } from "../src/lib/me-v3/platform";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, note = "") => {
  if (cond) pass += 1; else fail += 1;
  console.log(`  ${cond ? "통과" : "걸림"}  ${name}${note ? ` — ${note}` : ""}`);
};

const TEXT = `현대제철 [연구직] 26년 하반기 경력/신입박사 채용
강판개발
[수행 업무]
- 자성 소재 설계 및 개발
- 합금 설계 및 미세조직 제어
- 기계적·자기적 특성 평가 및 물성 보증 시험
- 열처리 및 냉각 조건 설계
- 상변태 및 석출물 제어
[필수 자격]
- 관련 경력 3년 이상 또는 박사 학위('27.2 졸업예정 포함)
- 전공 : 기계, 화공, 금속, 재료, 신소재
[우대 사항]
- 박사 학위자
- 고부가·친환경 금속소재산업 전문인력 양성사업 참여자
- 자성 소재 개발 관련 기업 프로젝트 참여자
- 고온·고수소 열처리 연구 경험자
접수 마감 : 2026-11-09`;

const CORE = "ME_CORE_V3";
const r = readPosting(CORE, TEXT, new Date("2026-10-31T00:00:00Z"));
const must = r.requirements.filter((x) => x.kind === "must");
const line = (s: string) => r.requirements.find((x) => x.text.includes(s));

ok("마감일을 읽는다", r.deadline === "2026-11-09", String(r.deadline));
ok("[필수 자격] 같은 괄호 머리줄은 항목이 아니다", !r.requirements.some((x) => /^\[.*\]$/.test(x.text)));
ok("필수 업무 다섯 줄이 모두 영역에 이어진다(재료 · 금속 업무)",
  ["자성 소재 설계", "합금 설계", "특성 평가", "열처리 및 냉각", "상변태"].every((s) => line(s)?.domain),
  must.filter((x) => !x.domain && x.reason === "unmatched").map((x) => x.text).join(" / "));
ok("열처리 줄은 재료 · 열처리 영역(TD06)이다", line("열처리 및 냉각")?.domain === "TD06", String(line("열처리 및 냉각")?.domain));
ok("특성 평가 · 보증 시험 줄은 시험 영역(TD07)도 함께 든다", (line("특성 평가")?.alt ?? []).includes("TD07"));
ok("학위 · 전공 줄은 자격 조건이다", line("박사 학위('27")?.reason === "condition" && line("전공 :")?.reason === "condition");

const exp = {
  id: "1", kind: "assignment", title: "구조·내구 해석 과제", started_on: null, ended_on: null,
  td_codes: ["TD02"], axis_codes: [], decisions: [], artifacts: ["수명 예측값"], verifications: ["시험 결과"],
  note_text: null, status: "saved", created_at: "",
} as unknown as Experience;
const row = {
  id: "1", label: "현대제철", deadline: r.deadline, state: "open", analyzed_by: "rules", created_at: "", core_code: CORE,
  analysis: {
    schema: "assistant-posting.1", role: r.role, note: null, counts: { ready: 0, partial: 0, empty: 0, unmapped: 0 },
    items: r.requirements.map((x) => ({ ...x, axis: null, status: x.domain ? "empty" : "unmapped", evidence: [] })),
  },
} as unknown as PostingRow;
const out = refreshPosting(row, CORE, { zoneOf: {}, gaps: [] } as never, [exp]).analysis.items;
const prop = out.find((x) => x.text.includes("특성 평가"));
ok("시험 결과와 비교한 해석 경험이 특성 평가 · 보증 시험 줄에 가까운 경험으로 이어진다",
  prop?.status === "partial" && prop.near === true && prop.evidence.includes("구조·내구 해석 과제"), JSON.stringify(prop?.evidence));
ok("가까운 경험은 '설명할 경험 있음' 으로 부풀리지 않는다", !out.some((x) => x.status === "ready"));
ok("상관없는 줄(자성 소재 설계)에는 잇지 않는다", out.find((x) => x.text.includes("자성 소재 설계"))?.status === "empty");

console.log(`\n통과 ${pass} · 걸림 ${fail}`);
process.exit(fail ? 1 : 0);
