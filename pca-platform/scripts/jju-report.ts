/**
 * 합성 QA 학생 셋의 전주대 리포트를 **다운로드 경로와 같은 함수로** 뽑는다.
 *
 * `/jju/report/{id}` 와 `/jju/report/{id}/pdf` 가 부르는 `jjuReportFor()` 와
 * `jjuReportPdf()` 를 그대로 부른다. 그래서 여기서 나온 종이와 그 경로가
 * 내주는 종이는 같은 코드에서 나온다(HTTP 층은 이 세션에서 띄우지 못했다).
 *
 * 내주지 말아야 할 자리도 같은 함수로 센다: 남의 응시 · 담당자 계정 · 다른
 * 학교 응시. 응답 → 결과 → 리포트가 어떻게 이어지는지는 `link-table.md` 로 남긴다.
 *
 *   V3_CAMPUS_FIXTURE=scripts/fixtures/campus-jju.json OUT=docs/jju/r2/track-c \
 *   npx tsx scripts/jju-report.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { query, queryOne } from "../src/lib/db";
import { answersOf, latestResult } from "../src/lib/me-v3/runtime/session";
import { jjuReportFor, jjuReportPdf } from "../src/lib/jju/report-pdf";

const OUT = process.env.OUT ?? "docs/jju/r2/track-c";
let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) pass++; else bad.push(w);
  console.log(`  ${c ? "통과" : "걸림"}  ${w}${saw ? " — " + saw : ""}`);
};

async function main() {
  const rows = await query<{ attempt: string; login: string; uid: string }>(
    `SELECT a.id::text attempt, u.login_id login, u.id::text uid
       FROM v3_attempts a JOIN users u ON u.id = a.user_id
      WHERE a.university_code = 'JJU' AND u.login_id LIKE 'qa-jju-qa%' AND a.status = 'scored'
      ORDER BY u.login_id`);
  if (rows.length < 3) throw new Error("scripts/jju-verify.ts 를 먼저 돌린다(합성 학생 셋의 응시가 없다)");
  mkdirSync(`${OUT}/pdf`, { recursive: true });
  const text: Record<string, string> = {};
  const link: string[] = ["| 학생 | 응시 | 답한 문항 | 묶음(영역: 상태) | 할 일 수 | 리포트 9절 중 학생별로 갈린 절 |", "|---|---|---|---|---|---|"];
  for (const r of rows) {
    const id = r.login.replace("qa-jju-qa", "").toUpperCase();
    const got = await jjuReportFor(r.attempt, r.uid);
    ok(`${id} 본인 응시로 리포트가 선다`, got.ok, got.ok ? `절 ${got.sections.length}` : got.why);
    if (!got.ok) continue;
    writeFileSync(`${OUT}/pdf/jju-report-${id}.html`, got.html);
    const pdf = await jjuReportPdf(got.html);
    writeFileSync(`${OUT}/pdf/jju-report-${id}.pdf`, pdf);
    ok(`${id} PDF 가 나온다`, pdf.subarray(0, 4).toString() === "%PDF", `${pdf.length}바이트`);
    text[id] = got.sections.map((s) => `## ${s.no}. ${s.title}\n${s.lead ? s.lead + "\n" : ""}` + s.lines.map((l) => `- ${l.k ? l.k + ": " : ""}${l.v}`).join("\n")
      + (s.table ? "\n" + s.table.rows.map((x) => `  | ${x.join(" | ")} |`).join("\n") : "")).join("\n\n");
    const m = await latestResult(r.attempt);
    const ans = Object.keys(await answersOf(r.attempt)).length;
    link.push(`| ${id} | ${r.attempt} | ${ans} | ${m!.domains.filter((d) => d.zone !== "NOT_EXPLORED").map((d) => `${d.code}:${d.zone.slice(0, 2)}`).join(" ")} | ${m!.actions.length} | (아래 계산) |`);
  }
  /* 학생마다 갈린 절 */
  const ids = Object.keys(text);
  const per = (id: string) => Object.fromEntries(text[id].split("\n\n## ").map((s, i) => [i + 1, s]));
  const differs: number[] = [];
  for (let n = 1; n <= 9; n += 1) if (new Set(ids.map((id) => per(id)[n])).size > 1) differs.push(n);
  ok("학생 셋의 리포트에서 갈리는 절이 다섯 이상이다", differs.length >= 5, differs.join(","));
  for (let i = 2; i < link.length; i += 1) link[i] = link[i].replace("(아래 계산)", differs.join(", "));

  /* 같은 문장이 셋 모두에 나가는가: 첫 절의 이끄는 줄(요청 C12 우회) */
  const leads = ids.map((id) => text[id].split("\n")[1]);
  ok("첫 절 이끄는 줄이 셋 모두 다르다", new Set(leads).size === ids.length, leads.join(" / "));
  const sec3 = ids.map((id) => per(id)[3]);
  ok("근거 없는 연결이 없다(3절이 확인된 영역에서만 선다)", sec3.every((s) => /근거:|적지 않습니다/.test(s)));

  /* 내주지 말아야 할 자리 */
  const [a, b] = rows;
  const swap = await jjuReportFor(a.attempt, b.uid);
  ok("남의 응시 번호로는 리포트가 서지 않는다(ID 교체)", !swap.ok && swap.why === "NOT_FOUND", swap.ok ? "열림" : swap.why);
  const admin = await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id = 'qa-jju-admin'`);
  const asAdmin = admin ? await jjuReportFor(a.attempt, admin.id) : { ok: false as const, why: "NOT_FOUND" as const };
  ok("담당자 계정으로 학생 리포트가 서지 않는다", !asAdmin.ok, asAdmin.ok ? "열림" : asAdmin.why);
  const pcu = await queryOne<{ attempt: string; uid: string }>(
    `SELECT a.id::text attempt, a.user_id::text uid FROM v3_attempts a WHERE a.university_code = 'PCU' AND a.status='scored' LIMIT 1`);
  if (pcu) {
    const other = await jjuReportFor(pcu.attempt, pcu.uid);
    ok("다른 학교 응시는 본인이어도 JJU 리포트로 그리지 않는다", !other.ok && other.why === "NOT_JJU", other.ok ? "열림" : other.why);
  }
  ok("없는 응시 번호는 서지 않는다", !(await jjuReportFor("999999", a.uid)).ok);

  writeFileSync(`${OUT}/report-text.json`, JSON.stringify(text, null, 1));
  writeFileSync(`${OUT}/link-table.md`, ["# 응답 → 결과 → 리포트 연결", "", ...link, ""].join("\n"));
  writeFileSync(`${OUT}/jju-report.log`, `통과 ${pass} · 걸림 ${bad.length}\n${bad.join("\n")}\n`);
  console.log(`\n  통과 ${pass} · 걸림 ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
