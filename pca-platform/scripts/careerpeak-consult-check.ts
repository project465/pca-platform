/**
 * 커리어피크 상담 신청이 **동의 없이, 열리지 않은 채로, 원본 · 본인용 글을 싣고**
 * 나가지 않는지 DB · 메일 없이 센다.
 *
 *   npx tsx scripts/careerpeak-consult-check.ts
 */
import {
  CONSULT_KEEPS, CONSULT_POLICY_FROM, CONSULT_SENDS, consultOpen, consultTo, onePager, requestConsult,
} from "../src/lib/careerpeak-consult";
import type { ResearchDoc } from "../src/lib/assistant/research-docs";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean) => {
  if (cond) pass += 1; else fail += 1;
  console.log(`  ${cond ? "통과" : "걸림"}  ${name}`);
};
const env = (k: string, v: string | undefined) => { if (v === undefined) delete process.env[k]; else process.env[k] = v; };

const doc = {
  id: "7", doc_type: "paper", file_kind: "pdf", lang: "en", title: "Solid electrolyte interphase in Li-metal cells",
  venue: "J. Power Sources", year: 2025, doi: "10.1000/x", terms: [], metrics: null, draft_ids: [], created_at: "",
  data: {
    summary: "리튬 금속 전지의 SEI 를 바꿔 수명을 늘렸다.", question: "덴드라이트를 줄일 수 있는가",
    methods: ["XPS", "EIS"], findings: ["사이클 수명 2배"], contribution: ["새 첨가제"],
    job_language: [{ skill: "전기화학 분석", evidence: "EIS 로 계면 저항을 쟀다" }], roles: ["셀 개발 연구원"],
    sentences: ["[회사]에서 비밀문장"], interview: ["비밀질문"], ask: ["비밀확인"],
  },
} as unknown as ResearchDoc;

async function main() {
  console.log("열림");
  env("CAREERPEAK_CONSULT_EMAIL", undefined); env("MAIL_HOST", "smtp.example.test"); env("MAIL_FROM", "a@example.test");
  env("APP_ENV", "staging");
  ok("받을 주소가 없으면 닫힌다(공개 전 배포본이어도)", !consultOpen() && consultTo() === null);
  env("CAREERPEAK_CONSULT_EMAIL", "not-an-address");
  ok("주소 꼴이 아니면 닫힌다", !consultOpen());
  env("CAREERPEAK_CONSULT_EMAIL", "consult@example.test");
  ok("공개 전 배포본은 주소와 메일만 있으면 열린다", consultOpen());
  env("MAIL_HOST", undefined);
  ok("메일을 못 보내면 닫힌다", !consultOpen());
  env("MAIL_HOST", "smtp.example.test");
  env("APP_ENV", "production");
  ok("운영은 방침 적용일 전에는 닫힌다", CONSULT_POLICY_FROM === null ? !consultOpen() : consultOpen(new Date(CONSULT_POLICY_FROM.getTime() - 1)) === false);

  console.log("동의");
  env("APP_ENV", "staging");
  const base = { userId: "1", doc, name: "가", email: "a@example.test", phone: "" };
  const r1 = await requestConsult({ ...base, consent: false });
  ok("동의 칸이 꺼져 있으면 보내지 않는다(기록도 남기지 않는다)", !r1.ok && r1.reason === "consent");
  const r2 = await requestConsult({ ...base, doc: null, consent: true });
  ok("본인 정리가 아니면(못 찾으면) 보내지 않는다", !r2.ok && r2.reason === "doc");
  const r4 = await requestConsult({ ...base, consent: true }).catch(() => ({ ok: false as const, reason: "threw" as const }));
  ok("동의 기록을 남기지 못하면(표가 없거나 DB 가 멈추면) 메일을 보내지 않는다", !r4.ok && r4.reason === "db");
  /* 기록이 남는 경우(이 검사에서는 가짜 DB). 받는 곳 · 보낸 사람 이름 · 제목을 본다 */
  const g = globalThis as { __dbOk?: boolean; __sent?: Record<string, string>[] };
  g.__dbOk = true; g.__sent = [];
  const r5 = await requestConsult({ ...base, name: "김연구", consent: true }).catch(() => ({ ok: false as const }));
  const m = g.__sent[0] ?? {};
  ok("받는 곳은 Railway 변수 CAREERPEAK_CONSULT_EMAIL 이다", r5.ok && m.to === "consult@example.test");
  ok("보낸 사람 이름은 CareerMatri 다", m.fromName === "CareerMatri");
  ok("제목에 '커리어피크 상담 신청' 과 신청자 이름이 보인다", /커리어피크 상담 신청/.test(m.subject ?? "") && (m.subject ?? "").includes("김연구"));
  ok("답장은 신청자 메일로 간다", m.replyTo === "a@example.test");
  g.__dbOk = false; g.__sent = undefined;
  env("APP_ENV", "production");
  if (CONSULT_POLICY_FROM === null) {
    const r3 = await requestConsult({ ...base, consent: true });
    ok("운영에서 닫혀 있으면 동의해도 보내지 않는다", !r3.ok && r3.reason === "closed");
  }

  console.log("한 장 요약");
  const s = onePager(doc);
  ok("제목 · 요약 · 방법 · 결과 · 직무의 말 · 직무가 들어간다",
    ["Solid electrolyte", "SEI", "XPS", "사이클 수명 2배", "전기화학 분석", "셀 개발 연구원"].every((w) => s.includes(w)));
  ok("본인용 글(문장 뼈대 · 면접 질문 · 확인할 것)은 싣지 않는다", !/비밀/.test(s));
  ok("화면이 적는 '보내는 것' 과 '보내지 않는 것' 이 원본 파일을 가른다",
    CONSULT_KEEPS.some((k) => k.includes("원본 파일")) && !CONSULT_SENDS.some((k) => k.includes("원본")));

  console.log(`\n통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}
main();
