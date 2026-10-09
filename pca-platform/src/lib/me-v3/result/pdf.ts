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
import { existsSync } from "node:fs";
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

/**
 * 못 뽑은 자리를 **단계로 적는다.**
 *
 * 전에는 부르는 쪽이 `catch {}` 로 받아 `pdf failed` 만 돌려줬다. 그래서
 * 브라우저가 안 뜬 것과 결과 쪽이 500 인 것과 종이를 접다 멈춘 것이
 * 운영 로그에서 **똑같이 생겼고**, 원인을 아무도 알 수 없었다.
 *
 * `cookie` 와 `auth` 가 뒤에 더 붙었다. 쿠키를 못 넣은 것과 로그인 쪽으로
 * 떨어진 것이 전에는 둘 다 `render` 시간 초과로 적혔는데, 그 둘은 결과지
 * 쪽을 아무리 뒤져도 안 나온다.
 */
export type PdfStep = "browser" | "cookie" | "open" | "auth" | "render";
export class PdfFailed extends Error {
  constructor(readonly step: PdfStep, message: string) {
    super(message);
    this.name = "PdfFailed";
  }
}

/**
 * 결과지를 그릴 브라우저를 찾는다.
 *
 * **한 자리를 못 박지 않는다.** 전에는 `CHROMIUM_PATH` 하나를 그대로
 * `executablePath` 로 넘겼고, 그 값이 `/usr/bin/chromium-browser` 였다.
 * 알파인은 판올림을 하면서 chromium 실행 파일 이름을 바꿔 왔고, 그 자리가
 * 없으면 플레이라이트는 `executable doesn't exist at ...` 로 던진다.
 * 그 한 줄이 `pdf failed` 로 뭉개지면 아무도 못 찾는다.
 *
 * 그래서 **있는 것을 골라 쓴다**: 꽂아 준 값이 실제로 있으면 그것, 없으면
 * 알려진 자리를 차례로 보고, 그래도 없으면 `null` 을 돌려 **플레이라이트가
 * 제 것을 찾게** 둔다. 찾아본 자리는 실패 문면에 그대로 적는다.
 */
const CHROMIUM_CANDIDATES = [
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/lib/chromium/chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
];

export function resolveChromium(): { bin: string | null; tried: string[] } {
  const want = (process.env.CHROMIUM_PATH ?? "").trim();
  const tried: string[] = [];
  for (const c of want ? [want, ...CHROMIUM_CANDIDATES] : CHROMIUM_CANDIDATES) {
    if (tried.includes(c)) continue;
    tried.push(c);
    try { if (existsSync(c)) return { bin: c, tried }; } catch { /* 못 보면 다음 */ }
  }
  return { bin: null, tried };
}

/**
 * 쿠키 머리글을 플레이라이트가 받는 모양으로.
 *
 * **`domain` 과 `path` 로 적지 않고 `url` 로 적는다.** 운영에서만 나는
 * 탈이 여기 있었다. 로그인 쿠키의 이름이 https 에서는
 * `__Secure-authjs.session-token` 인데(Auth.js 가 붙인다), `__Secure-`
 * 가 붙은 쿠키는 **secure 가 켜져 있어야만** 브라우저가 받는다.
 * `domain`/`path` 로 적으면 secure 가 꺼진 채로 들어가서 크로뮴이
 * 그 줄을 버리고, 그리는 브라우저는 로그인하지 않은 사람이 되어
 * 결과 쪽 대신 로그인 쪽을 받는다. `url` 로 적으면 **주소의 scheme 에서
 * secure 가 따라오고** `__Host-` 접두사의 조건(도메인 없음 · path `/`)도
 * 함께 맞는다.
 *
 * 로컬은 http 라 이름에 접두사가 붙지 않는다. 그래서 이 탈은 **운영에서만**
 * 나고, 로그에는 `step=render` 시간 초과로만 남았다.
 */
function cookiesFor(header: string, url: string) {
  const origin = new URL(url).origin;
  return header.split(";").map((x) => x.trim()).filter(Boolean).map((pair) => {
    const i = pair.indexOf("=");
    return { name: pair.slice(0, i), value: pair.slice(i + 1), url: origin };
  }).filter((c) => c.name);
}

export async function drawResultPdf(opts: DrawOpts): Promise<Buffer> {
  const { chromium } = await import("playwright");
  /* 운영 이미지에 브라우저를 두 벌 넣지 않는다. 깔려 있는 것을 쓴다 */
  const { bin, tried } = resolveChromium();
  let browser;
  try {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
      ...(bin ? { executablePath: bin } : {}),
    });
  } catch (e) {
    throw new PdfFailed("browser",
      `${(e as Error).message.split("\n")[0]} / 찾아본 자리: ${tried.join(" ")}`);
  }
  try {
    const gate = stagingGate();
    const ctx = await browser.newContext({
      viewport: { width: 1200, height: 900 },
      ...(gate ? { httpCredentials: { username: gate.user, password: gate.pass } } : {}),
    });
    const base = opts.baseUrl.replace(/\/$/, "");
    if (opts.cookie) {
      try {
        await ctx.addCookies(cookiesFor(opts.cookie, base));
      } catch (e) {
        /* 쿠키를 못 넣으면 그 다음은 전부 로그인 쪽이다. 여기서 끊어야
           로그에 `왜` 가 남는다 */
        throw new PdfFailed("cookie",
          `로그인 쿠키를 넘기지 못했습니다: ${(e as Error).message.split("\n")[0]}`);
      }
    }
    const page = await ctx.newPage();
    const url = `${base}/v3/${encodeURIComponent(opts.attemptId)}/result`;
    /* **`networkidle` 로 기다리지 않는다.** 결과 쪽에는 Next 가 화면에
       들어온 링크를 미리 불러오는 요청이 있어, 네트워크가 0.5초 조용해질
       때를 기다리면 멈추지 않는 날이 있다. 그러면 60초를 다 쓰고 시간
       초과로 떨어지는데, 그 실패는 브라우저가 안 뜬 것과 구별되지 않았다.
       **쪽이 섰는지는 쪽이 그린 자리로 본다** */
    let res;
    try {
      res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    } catch (e) {
      throw new PdfFailed("open",
        `${url} 로 못 갔습니다: ${(e as Error).message.split("\n")[0]}`);
    }
    if (!res || res.status() !== 200) {
      throw new PdfFailed("open",
        `결과 쪽이 ${res ? res.status() : 0} 입니다 (${url})`);
    }
    /* **로그인 쪽으로 떨어진 것을 본문 없음으로 적지 않는다.** 쿠키가
       안 넘어가면 결과 쪽이 아니라 로그인 쪽이 200 으로 열리고, 그러면
       아래의 기다림이 20초를 쓰고 `본문이 서지 않았습니다` 로 끝난다.
       고치는 사람은 그 줄을 보고 결과지를 뒤진다 */
    const landed = page.url();
    if (!landed.includes(`/v3/${opts.attemptId}/result`)) {
      throw new PdfFailed("auth",
        `로그인 쪽으로 떨어졌습니다: ${landed.slice(0, 120)}`);
    }
    try {
      await page.waitForSelector(".rs-main .rs-sect", { timeout: 20000 });
      await page.waitForLoadState("load", { timeout: 20000 }).catch(() => undefined);
    } catch (e) {
      throw new PdfFailed("render",
        `결과 쪽이 열렸는데 본문이 서지 않았습니다: ${(e as Error).message.split("\n")[0]}`);
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
  } catch (e) {
    if (e instanceof PdfFailed) throw e;
    throw new PdfFailed("render", (e as Error).message.split("\n")[0]);
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
