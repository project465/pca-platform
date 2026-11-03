/**
 * 긴 결과지(PRO 책자)를 종이로 뽑는다.
 *
 * 웹 쪽(`/v3/{id}/result/book`)을 머리 없는 브라우저로 열어 그대로 인쇄한다.
 * 같은 HTML 을 따로 그려 넣지 않는 까닭은 웹과 종이가 갈리지 않게 하려는 것이다.
 *
 * 브라우저를 찾는 자리와 쿠키를 넘기는 모양은 결과지 PDF 와 같은 함수를 쓴다.
 * 운영에서만 나는 실패의 거의 전부가 그 둘이라, 두 벌로 적어 두면 한쪽만 고쳐진다.
 * 다른 것은 셋이다: 쪽 크기와 쪽머리를 책이 스스로 그리므로 여백과 쪽머리 틀을 끄고,
 * 기다리는 자리가 `.pg` 이고, 글꼴이 다 내려온 뒤에 뽑는다.
 */
import { stagingGate } from "@/lib/env";
import { cookiesFor, PdfFailed, resolveChromium } from "../result/pdf";

export type BookDrawOpts = {
  attemptId: string;
  baseUrl: string;
  cookie: string;
  /** 담당자가 뽑는다. 결과 쪽이 담당자 로그인을 읽게 `?as=staff` 를 붙인다(`session.ts`) */
  asStaff?: boolean;
};

export async function drawBookPdf(opts: BookDrawOpts): Promise<Buffer> {
  const { chromium } = await import("playwright");
  const { bin, tried } = resolveChromium();
  let browser;
  try {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
      ...(bin ? { executablePath: bin } : {}),
    });
  } catch (e) {
    throw new PdfFailed("browser",
      `${(e as Error).message.split("\n")[0]} / 찾아본 경로: ${tried.join(" ")}`);
  }
  try {
    const gate = stagingGate();
    const ctx = await browser.newContext({
      viewport: { width: 900, height: 1200 },
      ...(gate ? { httpCredentials: { username: gate.user, password: gate.pass } } : {}),
    });
    const base = opts.baseUrl.replace(/\/$/, "");
    if (opts.cookie) {
      try {
        await ctx.addCookies(cookiesFor(opts.cookie, base));
      } catch (e) {
        const names = cookiesFor(opts.cookie, base).map((c) => c.name).join(" ");
        throw new PdfFailed("cookie",
          `로그인 쿠키를 넘기지 못했습니다(${names}): ${(e as Error).message.split("\n")[0]}`);
      }
    }
    const page = await ctx.newPage();
    const path = `/v3/${encodeURIComponent(opts.attemptId)}/result/book`;
    const url = `${base}${path}${opts.asStaff ? "?as=staff" : ""}`;
    let res;
    try {
      res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    } catch (e) {
      throw new PdfFailed("open", `${url} 로 못 갔습니다: ${(e as Error).message.split("\n")[0]}`);
    }
    if (!res || res.status() !== 200) {
      throw new PdfFailed("open", `쪽이 ${res ? res.status() : 0} 입니다 (${url})`);
    }
    /* 로그인 쪽으로 떨어진 것을 본문 없음으로 적지 않는다 */
    if (!page.url().startsWith(url)) {
      throw new PdfFailed("auth", `로그인 쪽으로 떨어졌습니다: ${page.url().slice(0, 120)}`);
    }
    try {
      await page.waitForSelector(".pg", { state: "attached", timeout: 20000 });
      await page.waitForLoadState("load", { timeout: 20000 }).catch(() => undefined);
      await page.evaluate("document.fonts.ready");
      /* 쪽 모으기가 끝난 뒤에 뽑는다 */
      await page.waitForSelector("html[data-packed]", { state: "attached", timeout: 30000 });
    } catch (e) {
      throw new PdfFailed("render",
        `쪽이 열렸는데 본문이 서지 않았습니다: ${(e as Error).message.split("\n")[0]}`);
    }
    await page.emulateMedia({ media: "print" });
    /* 여기서 기다린다. 기다리지 않고 돌려주면 아래 finally 가 브라우저를 먼저 닫는다 */
    const pdf = await page.pdf({
      format: "A4", printBackground: true, preferCSSPageSize: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    return pdf;
  } catch (e) {
    if (e instanceof PdfFailed) throw e;
    throw new PdfFailed("render", (e as Error).message.split("\n")[0]);
  } finally {
    await browser.close();
  }
}
