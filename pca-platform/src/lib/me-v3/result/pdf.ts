/**
 * 결과지를 A4 로 뽑는다. **웹과 종이가 같은 쪽을 읽는다.**
 *
 * 따로 그리면 어느 날 둘이 갈리고, 갈린 날 상담 자리에서 다른 종이를 들고
 * 앉는다. 여기서 하는 일은 그 사람의 결과 쪽을 **인쇄 매체로 열어** 종이로
 * 접는 것뿐이고, **값을 다시 계산하지 않는다.**
 *
 * **열쇠를 만들어 내지 않는다.** 결과 쪽은 로그인한 본인에게만 열리므로,
 * 그리는 브라우저에는 **부른 사람이 들고 온 쿠키를 그대로** 넘긴다. 따로
 * 토큰을 만들면 그 토큰이 결과지를 여는 두 번째 길이 되고, 두 번째 길은
 * 첫 번째 길보다 늘 허술하다.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { stagingGate } from "@/lib/env";

export const V3_PDF_DIR = process.env.REPORT_PDF_DIR
  ? path.join(process.env.REPORT_PDF_DIR, "v3")
  : path.join(process.cwd(), "var", "reports", "v3");

export type DrawOpts = {
  attemptId: string;
  baseUrl: string;
  /** 부른 사람이 들고 온 쿠키 머리글 그대로 */
  cookie: string;
};

/** 쿠키 머리글을 플레이라이트가 받는 모양으로 */
function cookiesFor(header: string, url: string) {
  const { hostname } = new URL(url);
  return header.split(";").map((x) => x.trim()).filter(Boolean).map((pair) => {
    const i = pair.indexOf("=");
    return {
      name: pair.slice(0, i),
      value: pair.slice(i + 1),
      domain: hostname,
      path: "/",
    };
  }).filter((c) => c.name);
}

export async function drawResultPdf(opts: DrawOpts): Promise<Buffer> {
  const { chromium } = await import("playwright");
  /* 운영 이미지에 브라우저를 두 벌 넣지 않는다. 알파인에 깔린 것을 쓴다 */
  const bin = process.env.CHROMIUM_PATH || undefined;
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    ...(bin ? { executablePath: bin } : {}),
  });
  try {
    const gate = stagingGate();
    const ctx = await browser.newContext({
      viewport: { width: 1200, height: 900 },
      ...(gate ? { httpCredentials: { username: gate.user, password: gate.pass } } : {}),
    });
    const base = opts.baseUrl.replace(/\/$/, "");
    if (opts.cookie) await ctx.addCookies(cookiesFor(opts.cookie, base));
    const page = await ctx.newPage();
    const url = `${base}/v3/${encodeURIComponent(opts.attemptId)}/result`;
    const res = await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    if (!res || res.status() !== 200) {
      throw new Error(`결과 쪽을 열지 못했습니다 (${res ? res.status() : 0})`);
    }
    /* **인쇄 매체로 바꿔 놓고 뽑는다.** 화면 규칙으로 뽑으면 종이에서
       손전화 화면이 된다(A4 의 글 폭이 690px 안팎이라 좁은 화면 규칙에
       걸린다) */
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({
      format: "A4", printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size:7pt;color:#5f6e86;width:100%;'
        + 'padding:0 14mm;font-family:sans-serif">CareerMatri</div>',
      footerTemplate: '<div style="font-size:7pt;color:#5f6e86;width:100%;'
        + 'padding:0 14mm;text-align:right;font-family:sans-serif">'
        + '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
    return pdf;
  } finally {
    await browser.close();
  }
}

/** 뽑은 종이를 자리에 둔다. 웹에서 바로 열리지 않는 자리다 */
export async function saveResultPdf(attemptId: string, pdf: Buffer): Promise<string> {
  await mkdir(V3_PDF_DIR, { recursive: true });
  const file = path.join(V3_PDF_DIR, `${attemptId}-${Date.now()}.pdf`);
  await writeFile(file, pdf);
  return file;
}
