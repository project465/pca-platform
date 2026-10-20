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
import { buildJjuReport, jjuReportHtml } from "@/lib/jju/report";

export type JjuReportRefusal = "NOT_FOUND" | "NOT_JJU" | "NOT_SCORED" | "NO_REGISTRY";

export async function jjuReportFor(
  attemptId: string, userId: string,
): Promise<{ ok: true; html: string; sections: ReturnType<typeof buildJjuReport> } | { ok: false; why: JjuReportRefusal }> {
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
    /* 그 트랙 이름에 걸리는 지역 사실만. 트랙 이름 낱말(예: `피지컬 AI`)로 고른다 */
    region: regionFacts(u).filter((r) => r.tracks.some((k) => (t?.short ?? "").includes(k))).slice(0, 4),
    student: {
      name: who?.name ?? "학생", track: t?.short ?? a.department_code ?? "",
      cohort: t?.cohort.label ?? "", field: t?.field.name ?? "", spec: t?.spec_name ?? null,
    },
  };
  const sections = buildJjuReport(input);
  return { ok: true, html: jjuReportHtml(input, sections), sections };
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
    /* `return page.pdf()` 로 두면 finally 가 그리는 동안 브라우저를 닫는다
       (운영 요약 쪽이 그 자리에서 `Printing failed` 를 냈다) */
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
