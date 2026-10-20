/**
 * 합성 QA 학생 셋의 전주대 리포트를 뽑는다(`src/lib/jju/report.ts` 구조).
 *
 * **굳은 결과만 읽는다.** `scripts/jju-verify.ts` 가 공통 엔진으로 제출해
 * 둔 응시의 `result_model` 을 꺼내 아홉 절로 묶고, HTML 과 PDF 를 남긴다.
 * 제품 PDF 경로(`/v3/{id}/result/pdf`)를 거치지 않는 **구조 시안**이고,
 * 문서 머리에 그 사실을 적는다.
 *
 *   V3_CAMPUS_FIXTURE=scripts/fixtures/campus-jju.json OUT=docs/jju/qa \
 *   npx tsx scripts/jju-report.ts
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { query } from "../src/lib/db";
import { latestResult } from "../src/lib/me-v3/runtime/session";
import { buildJjuReport, jjuReportHtml } from "../src/lib/jju/report";
import { jjuUniversity, officialProgram, tracksOf } from "../src/lib/jju/program";

const OUT = process.env.OUT ?? "docs/jju/qa";

async function main() {
  const u = jjuUniversity();
  if (!u) throw new Error("V3_CAMPUS_FIXTURE 가 없다(전주대는 시연 fixture 로만 선다)");
  const program = officialProgram(u);
  const notMeasured = JSON.parse(readFileSync(`${OUT}/not-measured.json`, "utf8")) as Record<string, string[]>;
  const rows = await query<{ attempt: string; login: string; name: string; dept: string; core: string; spec: string | null }>(
    `SELECT a.id::text attempt, u.login_id login, u.display_name name, a.department_code dept,
            a.core_code core, a.specialization_code spec
       FROM v3_attempts a JOIN users u ON u.id = a.user_id
      WHERE a.university_code = 'JJU' AND u.login_id LIKE 'qa-jju-qa%' AND a.status = 'scored'
      ORDER BY u.login_id`);
  mkdirSync(`${OUT}/pdf`, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const text: Record<string, string> = {};
  for (const r of rows) {
    const m = await latestResult(r.attempt);
    if (!m) throw new Error(`${r.login}: 굳은 결과가 없다`);
    const t = tracksOf(u).find((x) => x.code === r.dept)!;
    const input = {
      model: m, core: r.core, program, mode: t.mode, notMeasured: notMeasured[r.core] ?? [],
      student: { name: r.name, track: t.short, cohort: t.cohort.label, field: t.field.name, spec: t.spec_name },
    };
    const sections = buildJjuReport(input);
    const html = jjuReportHtml(input, sections);
    const id = r.login.replace("qa-jju-qa", "").toUpperCase();
    writeFileSync(`${OUT}/pdf/jju-report-${id}.html`, html);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({ path: `${OUT}/pdf/jju-report-${id}.pdf`, format: "A4", printBackground: true });
    await page.close();
    text[id] = sections.map((s) => `## ${s.no}. ${s.title}\n` + s.lines.map((l) => `- ${l.k ? l.k + ": " : ""}${l.v}`).join("\n")).join("\n\n");
    console.log(`  뽑음  ${id} · 응시 ${r.attempt} · 절 ${sections.length}`);
  }
  await browser.close();
  writeFileSync(`${OUT}/pdf/report-text.json`, JSON.stringify(text, null, 1));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
