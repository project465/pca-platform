/**
 * MAT 영어판을 규칙 길(AI 없음)로 한 바퀴. DB 를 읽지 않는다.
 *
 *   npx tsx scripts/lab/mat-en-check.ts
 *
 * 영어 공고 셋(기계 설계 · 임베디드 · 백엔드)을 읽어 다섯 가지를 센다.
 *   ① 필수와 우대가 갈린다       ② 마감을 읽는다
 *   ③ 요구 줄의 60% 이상이 영역이나 조건으로 잇힌다(`영역 확인 필요` 가 40% 미만)
 *   ④ 영어로 나가는 글에 한글이 한 자도 없다(항목 · 영역 이름 · 뼈대 · 면접 준비 ·
 *      작은 일 · 브리핑 · 알림 · 달력 · 메모 초안)
 *   ⑤ 한국어 공고는 한국어 규칙이 그대로 읽는다(영어로 새지 않는다)
 */
import { readPosting, draftByRules } from "../../src/lib/assistant/rules";
import { looksEnglish } from "../../src/lib/assistant/rules-en";
import { catalog } from "../../src/lib/assistant/catalog";
import { itemDomainKo, type PostingItem, type PostingRow } from "../../src/lib/assistant/posting";
import { sentenceDrafts } from "../../src/lib/assistant/sentence";
import { interviewPrep, smallTasks, taskBody } from "../../src/lib/assistant/prep";
import { buildBrief, weeklyNudgeTextEn, PUSH_TEXT_EN } from "../../src/lib/assistant/brief";
import { buildIcs } from "../../src/lib/assistant/calendar";
import { aiFailEn } from "../../src/lib/assistant/claude";
import type { Experience } from "../../src/lib/me-v3/platform";

let pass = 0;
const bad: string[] = [];
const ok = (what: string, cond: boolean, saw = "") => {
  if (cond) { pass += 1; console.log(`  통과  ${what}${saw ? ` — ${saw}` : ""}`); }
  else { bad.push(what); console.log(`  걸림  ${what}${saw ? ` — ${saw}` : ""}`); }
};
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const noHangul = (what: string, xs: string[]) => {
  const hit = xs.find((x) => HANGUL.test(x));
  ok(`${what}: 한글 0`, !hit, hit ? hit.slice(0, 80) : `${xs.length}줄`);
};

const TODAY = new Date("2026-10-26T00:00:00Z");

const CASES: { core: string; name: string; deadline: string | null; text: string; memo: string }[] = [
  {
    core: "ME_CORE_V3", name: "mechanical design", deadline: "2026-11-30",
    text: `Mechanical Design Engineer - Consumer Hardware
About us
We build smart home devices used by millions of people.
What you'll do
- Design plastic and sheet metal enclosures in SolidWorks from concept to production
- Create 2D drawings with GD&T and run tolerance stack-up analysis
- Perform FEA on brackets and housings and validate results with hand calculations
- Work with suppliers on injection molding DFM reviews
- Plan and run drop and thermal tests on prototypes
Requirements
- Bachelor's degree in Mechanical Engineering or related field
- 0-2 years of experience in product design
- Proficiency in SolidWorks or Creo
- Strong communication skills
Preferred qualifications
- Experience with ANSYS or Abaqus
- Familiarity with CFD for thermal management is a plus
- Python or MATLAB scripting
Benefits
- Health insurance and 401k matching
Application deadline: November 30, 2026
We are an equal opportunity employer.`,
    memo: "In my capstone project we built a small conveyor. I chose the gear ratio and sized the motor from the load, and I made the assembly drawing in SolidWorks. We compared the measured speed with my hand calculation.",
  },
  {
    core: "EE_CORE_V1", name: "embedded / EE", deadline: "2026-12-05",
    text: `Embedded Firmware Engineer (New Grad)
The role
• Develop firmware in embedded C for ARM Cortex-M microcontrollers • Write device drivers for I2C, SPI and UART peripherals • Bring up new PCB revisions with the hardware team • Debug with an oscilloscope and logic analyzer
Qualifications
- BS in Electrical Engineering, Computer Engineering or similar
- Experience with RTOS such as FreeRTOS or Zephyr
- Understanding of analog circuit basics and schematics
- Must be authorized to work in the United States
Nice to have
- Bluetooth Low Energy (BLE) stack experience
- Python for test automation
- Power electronics or DC-DC converter design
How to apply
Applications close 12/05/2026. Send your resume through our careers page.`,
    memo: "For my microcontroller class lab I wrote an I2C driver for a temperature sensor on an STM32. I decided to use interrupts instead of polling, and I measured the current draw with the scope before and after.",
  },
  {
    core: "CS_CORE_V1", name: "backend SWE", deadline: null,
    text: `Backend Software Engineer
Who we are
A fintech startup helping small businesses get paid faster.
Responsibilities
* Design and build REST APIs in Java and Spring Boot
* Model data in PostgreSQL and tune slow queries
* Write unit tests and integration tests, and own deployments through CI/CD
* Run services on AWS with Docker and Kubernetes
Minimum qualifications
* 1+ years of professional software development experience or relevant internships
* Solid understanding of data structures and algorithms
* Experience with Git and code reviews
Preferred qualifications
* Experience with Kafka or other message queues
* Knowledge of application security and OAuth
* Strong written and verbal communication
We review applications on a rolling basis.`,
    memo: "Team project for our databases course: I designed the schema for a booking app in PostgreSQL and picked which columns to index. I wrote the REST API in Spring Boot and pushed the code to GitHub. We tested it with Postman.",
  },
];

for (const c of CASES) {
  console.log(`\n== ${c.name} (${c.core})`);
  ok("영어로 알아본다", looksEnglish(c.text));
  const r = readPosting(c.core, c.text, TODAY);
  const reqs = r.requirements;
  const must = reqs.filter((x) => x.kind === "must").length;
  const nice = reqs.filter((x) => x.kind === "nice").length;
  ok("필수와 우대가 갈린다", must > 0 && nice > 0, `필수 ${must} · 우대 ${nice}`);
  ok("마감을 읽는다", r.deadline === c.deadline, String(r.deadline));
  const mapped = reqs.filter((x) => x.domain || x.reason === "condition").length;
  const share = reqs.length ? mapped / reqs.length : 0;
  ok("요구 줄의 60% 이상이 영역 · 조건으로 잇힌다", share >= 0.6,
    `${mapped}/${reqs.length} (${Math.round(share * 100)}%) · 영역 ${reqs.filter((x) => x.domain).length}`);
  ok("회사 소개 · 복리 · 지원 방법이 항목에 없다",
    !reqs.some((x) => /insurance|401k|equal opportunity|resume|fintech startup|smart home/i.test(x.text)));

  /* 지금 상태를 지어 붙인다. 판정은 이 검사가 재는 것이 아니다 */
  const cat = catalog(c.core, "en");
  const items: PostingItem[] = reqs.map((x, i) => ({
    text: x.text, kind: x.kind, domain: x.domain, axis: null,
    status: x.domain ? (["ready", "partial", "empty"] as const)[i % 3] : "unmapped",
    evidence: [], ...(x.reason ? { reason: x.reason } : {}),
  }));
  const tds = [...new Set(items.filter((x) => x.domain).map((x) => x.domain!))];
  const exps: Experience[] = tds.slice(0, 2).map((td, i) => {
    const d = cat.find((x) => x.code === td)!;
    return {
      id: String(900 + i), kind: "project", title: `Team project ${i + 1}`,
      started_on: null, ended_on: null, td_codes: [td], axis_codes: ["J3", "J5"],
      problems: d.checklist.J1.slice(0, 1), decisions: d.checklist.J3.slice(0, 1),
      artifacts: d.artifacts.slice(0, 1), verifications: i === 0 ? d.verify.slice(0, 1) : [],
      note_text: null, status: "saved", created_at: "2026-10-01",
    };
  });
  for (const it of items) if (it.domain && exps.some((e) => e.td_codes.includes(it.domain!))) it.evidence = [exps.find((e) => e.td_codes.includes(it.domain!))!.title];

  const sd = sentenceDrafts(items, exps, 6, "en");
  const prep = interviewPrep(c.core, items, exps, 6, "en");
  const tasks = smallTasks(c.core, items, exps, "en");
  ok("문장 뼈대 · 면접 준비 · 작은 일이 선다", sd.drafts.length > 0 && prep.length > 0 && tasks.length > 0,
    `뼈대 ${sd.drafts.length} · 질문 ${prep.length} · 작은 일 ${tasks.length}`);
  const posting: PostingRow = {
    id: "1", label: `${c.name} posting`, deadline: c.deadline, state: "watching",
    analyzed_by: "rules", created_at: "2026-10-20", core_code: c.core,
    analysis: { schema: "assistant-posting.1", role: r.role, items, counts: { ready: 0, partial: 0, empty: 0, unmapped: 0 }, note: aiFailEn("consent") },
  };
  const brief = buildBrief({
    core: c.core, postings: [posting, { ...posting, id: "2", label: "second posting" }], exps,
    actions: [], fromResult: true, now: TODAY, lang: "en",
  });
  const draft = draftByRules(c.core, c.memo, "en");
  ok("메모 초안이 영역을 고른다", draft.td.length > 0, draft.td.join(", "));
  noHangul("영어 출력", [
    ...reqs.map((x) => x.text), r.role ?? "",
    ...items.map((x) => itemDomainKo(c.core, x, "en")),
    ...sd.drafts.flatMap((d) => d.sentences),
    ...prep.flatMap((p) => [p.question, p.frame ?? "", p.honest ?? ""]),
    ...tasks.flatMap((t) => [t.task, taskBody(t, posting.label, "en")]),
    ...brief.gaps.flatMap((g) => [g.area, g.next ?? ""]),
    draft.title, ...draft.ask, ...draft.decisions, ...draft.artifacts, ...draft.problems, ...draft.verifications,
    posting.analysis.note ?? "",
  ]);
  if (c.core === "ME_CORE_V3") {
    console.log(`  예시 뼈대: ${sd.drafts[0]?.sentences.join(" ")}`);
    console.log(`  예시 질문: ${prep[0]?.question}`);
    console.log(`  예시 작은 일: ${tasks[0]?.task}`);
    console.log(`  메모 초안: ${JSON.stringify({ title: draft.title, td: draft.td, decisions: draft.decisions, artifacts: draft.artifacts, ask: draft.ask })}`);
  }
}

console.log("\n== 알림 · 달력");
const w = weeklyNudgeTextEn({ task: true, deadlines: 2, gaps: 1 });
const w0 = weeklyNudgeTextEn({ task: false, deadlines: 0, gaps: 0 });
const ics = buildIcs([{ id: "7", label: "Mechanical Design Engineer", deadline: "2026-11-30" }], { lang: "en", now: TODAY });
noHangul("주간 알림 · 기기 알림 · 달력", [w.title, w.body, w0.body,
  PUSH_TEXT_EN.weekly.body, PUSH_TEXT_EN.deadline.body, ics]);
ok("영어 기기 알림에도 숫자 · 이름이 없다", Object.values(PUSH_TEXT_EN).every((p) => !/\d/.test(p.body) && p.title === "CareerMatri"));
console.log(`  주간 알림: ${w.title} / ${w.body}`);

console.log("\n== 한국어는 그대로");
const ko = readPosting("ME_CORE_V3", "[담당업무]\n- SolidWorks 로 기구 설계\n[자격요건]\n- 기계공학 전공\n[우대사항]\n- ANSYS 해석 경험\n접수기간: 2026.11.20 ~ 12.05", TODAY);
ok("한국어 공고는 한국어 규칙이 읽는다", !looksEnglish("[담당업무] SolidWorks 로 기구 설계")
  && ko.requirements.length === 3 && ko.deadline === "2026-12-05", JSON.stringify(ko.requirements.map((x) => x.kind)));

console.log(`\n통과 ${pass} · 걸림 ${bad.length}`);
process.exit(bad.length ? 1 : 0);
