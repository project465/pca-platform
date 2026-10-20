/**
 * 전주대 학생 리포트를 **본인에게만** 내준다.
 *
 * 묻는 차례는 제품 PDF 경로(`/v3/{id}/result/pdf`)와 같다: 그 응시가 이
 * 사람의 것인가(`attemptOf` 가 남의 응시면 `null`) → 결과가 굳었는가. 여기에
 * 하나를 더 본다: **그 응시가 전주대 학교 맥락으로 열린 것인가.** 다른
 * 기관의 응시를 이 묶음으로 그리면 남의 학교 이름이 머리에 선다.
 *
 * 화면과 종이가 같은 HTML 을 쓴다. 종이는 그 HTML 을 브라우저에 그대로 얹어
 * 뽑으므로 쿠키를 넘길 일이 없다(공통 `drawResultPdf` 는 결과 주소를 못 박고
 * 있어 학교 묶음을 그릴 수 없다 — 요청 C9).
 */
import { queryOne } from "@/lib/db";
import { answersOf, attemptOf, latestResult } from "@/lib/me-v3/runtime/session";
import { resolveChromium } from "@/lib/me-v3/result/pdf";
import { coverageOf } from "@/lib/jju/coverage";
import { JJU_CODE, jjuUniversity, officialProgram, regionFacts, tracksOf } from "@/lib/jju/program";
import { buildJjuReport } from "@/lib/jju/report";
import { buildGold } from "@/lib/jju/gold";
import { buildWorkbook } from "@/lib/jju/gold-workbook";
import { goldHtml } from "@/lib/jju/gold-html";

export type JjuReportRefusal = "NOT_FOUND" | "NOT_JJU" | "NOT_SCORED" | "NO_REGISTRY";

export async function jjuReportFor(
  attemptId: string, userId: string,
): Promise<{ ok: true; html: string; sections: ReturnType<typeof buildJjuReport>;
  gold: ReturnType<typeof buildGold>; work: ReturnType<typeof buildWorkbook> } | { ok: false; why: JjuReportRefusal }> {
  const u = jjuUniversity();
  if (!u) return { ok: false, why: "NO_REGISTRY" };
  const a = await attemptOf(attemptId, userId);
  if (!a) return { ok: false, why: "NOT_FOUND" };
  if (a.university_code !== JJU_CODE) return { ok: false, why: "NOT_JJU" };
  const m = await latestResult(attemptId);
  if (!m) return { ok: false, why: "NOT_SCORED" };
  const t = tracksOf(u).find((x) => x.code === a.department_code);
  const program = officialProgram(u);
  const who = await queryOne<{ name: string }>(
    `SELECT display_name AS name FROM users WHERE id = $1::bigint`, [userId]);
  const input = {
    model: m, core: a.core_code, program, mode: t?.mode ?? "PREPARING",
    coverage: coverageOf(a.core_code, program?.courses.flatMap((c) => c.topics) ?? []),
    answered: Object.keys(await answersOf(attemptId)),
    /* 그 학과·과정에 거는 지역 사실만(`region_tags`). 이름 글자로 고르지 않는다:
       `인공지능학과` 라는 이름은 어느 사실의 낱말과도 겹치지 않는다 */
    region: regionFacts(u).filter((r) => r.tracks.some((k) => (t?.region_tags ?? []).includes(k))).slice(0, 4),
    student: {
      name: who?.name ?? "학생", track: t?.short ?? a.department_code ?? "",
      /* 소속(단과대학) 또는 운영(사업단). 전공 검사 칸에는 검사 이름을 적는다 */
      cohort: t?.field.name ?? "", field: t?.core_name ?? "", spec: t?.spec_name ?? null,
    },
  };
  /* 열 절 데이터 층(`buildJjuReport`)은 그대로 둔다: 회귀 검사가 그 값을 읽는다.
     종이와 웹은 Gold Master 편집본이 같은 결과 모델에서 다시 그린다 */
  const sections = buildJjuReport(input);
  const at = await queryOne<{ d: string }>(
    `SELECT to_char(coalesce(submitted_at, last_saved_at, started_at) AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') d
       FROM v3_attempts WHERE id = $1::bigint`, [attemptId]);
  const gold = buildGold({ ...input, attemptId, submitted: at?.d ?? "" });
  const course = program?.courses.find((c) => c.status !== "EXISTS_DETAIL_UNVERIFIED") ?? null;
  const work = buildWorkbook(m, a.core_code, { roles: gold.roles.map((r) => r.code), course });
  return { ok: true, html: goldHtml(gold, work), sections, gold, work };
}

export async function jjuReportPdf(html: string): Promise<Buffer> {
  const { chromium } = await import("playwright");
  const { bin } = resolveChromium();
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    ...(bin ? { executablePath: bin } : {}),
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    /* 한글 글꼴이 다 들어온 뒤에 뽑는다. 덜 들어온 채로 뽑으면 대체 글꼴로 그려진 줄이 남는다 */
    await page.evaluate(() => (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready);
    /* `return page.pdf()` 로 두면 finally 가 그리는 동안 브라우저를 닫는다
       (운영 요약 쪽이 그 자리에서 `Printing failed` 를 냈다) */
    /* 머리말·꼬리말과 쪽 번호는 HTML 의 `@page` 여백 상자가 그린다. 그래야 표지 한 쪽만
       여백 없이(`@page:first`) 꽉 채워 뽑을 수 있다 */
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
