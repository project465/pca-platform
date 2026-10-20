/**
 * KUS 리포트를 **본인에게만** 내준다. 화면과 종이가 같은 HTML 을 쓴다.
 *
 * 종이는 그 HTML 을 브라우저에 그대로 얹어 뽑는다(`setContent`). 그래서
 * 쿠키를 넘기거나 제 주소로 되돌아갈 일이 없고, 따로 토큰을 만들지 않는다.
 * 브라우저를 찾는 자리는 공통 `resolveChromium` 하나다.
 */
import { resolveChromium } from "@/lib/me-v3/result/pdf";
import { kusBundle, type KusRefusal } from "./load";
import { kusReportHtml } from "./report";

export async function kusReportFor(
  attemptId: string, userId: string,
): Promise<{ ok: true; html: string } | { ok: false; why: KusRefusal }> {
  const b = await kusBundle(userId, attemptId);
  if (!b.ok) return b;
  const v = b.value;
  const html = kusReportHtml(v.analysis, {
    attemptId, resultAt: v.resultAt, test: v.test,
    generatedAt: new Date().toISOString().slice(0, 10),
    modules: {
      ...(v.model.provenance.module_versions as unknown as Record<string, string | undefined>),
      result_model_version: v.model.provenance.result_model_version,
    },
  });
  return { ok: true, html };
}

export async function kusReportPdf(html: string): Promise<Buffer> {
  const { chromium } = await import("playwright");
  const { bin } = resolveChromium();
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    ...(bin ? { executablePath: bin } : {}),
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    /* `return page.pdf()` 로 두면 finally 가 그리는 동안 브라우저를 닫는다 */
    const pdf = await page.pdf({
      format: "A4", printBackground: true, displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `<div style="width:100%;font-size:7px;color:#8a96a8;padding:0 14mm;display:flex;justify-content:space-between;font-family:sans-serif"><span>CareerMatri · 고려대학교 세종캠퍼스 개인 리포트</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
