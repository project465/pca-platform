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
  /**
   * 쪽마다 위에 적는 한 줄. 학교 진입이면 `학교 · 학과 · 리포트 이름` 이다.
   *
   * **쪽머리에 상품 이름만 적지 않는다**(규격 §14). 종이는 학생이 보관하고
   * 학교가 결과물로 전달하는 자리다. 넘겨 보다 한 장만 떨어져 나와도 그
   * 장이 어느 학교의 무슨 문서인지 혼자 말해야 한다.
   */
  header?: string;
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

/** 쪽머리에 넣기 전에 꺾쇠를 막는다. 학교 이름에 `&` 가 들어갈 수 있다 */
/* 쪽머리와 쪽번호(화면 시안 2026-10-20). 쪽머리 앞에 파란 M 상표를 두고
   지금 쪽 번호를 파랑으로 적는다. 상표 그림은
   `public/brand/careermatri/mark.svg` 와 같은 모양이다 */
const MARK_SVG = '<svg width="10" height="10" viewBox="0 0 120 120">'
  + '<rect width="120" height="120" rx="34" fill="#2F6BFF"/>'
  + '<path transform="translate(60 60) scale(2.9) translate(-12 -12)" d="M5 19V5l7 8 7-8v14"'
  + ' fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"'
  + ' stroke-linejoin="round"/></svg>';
function headerTemplate(header: string | undefined): string {
  return '<div style="font-size:8pt;color:#3d4757;width:100%;padding:0 14mm;'
    + 'font-family:sans-serif;display:flex;align-items:center;gap:5px">'
    + MARK_SVG + '<span>' + escapeHtml(header ?? "CareerMatri") + '</span></div>';
}
const FOOTER_TEMPLATE = '<div style="font-size:8pt;color:#3d4757;width:100%;'
  + 'padding:0 14mm;text-align:right;font-family:sans-serif">'
  + '<span class="pageNumber" style="color:#2f6bff;font-weight:700"></span>'
  + ' / <span class="totalPages"></span></div>';

function escapeHtml(t: string): string {
  return t.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
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
      `${(e as Error).message.split("\n")[0]} / 찾아본 경로: ${tried.join(" ")}`);
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
           로그에 `왜` 가 남는다.
           **이름만 적는다.** 크로뮴이 거절한 까닭이 어느 줄에 있는지는
           이름으로 좁혀지고, 값은 그 사람의 세션 그 자체라 로그에 적지
           않는다(`oplog` 와 같은 규칙이다) */
        const names = cookiesFor(opts.cookie, base)
          .map((c) => c.name).join(" ");
        throw new PdfFailed("cookie",
          `로그인 쿠키를 넘기지 못했습니다(${names}): `
          + `${(e as Error).message.split("\n")[0]}`);
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
      /* **`attached` 로 기다린다.** 웹에서 본문 아홉 절은 `자세한 내용
         보기` 안에 접혀 있어(규격 §9) 화면에 보이지 않는다. 기본값인
         `visible` 로 기다리면 멀쩡한 결과지에서 20초를 쓰고 `본문이 서지
         않았습니다` 로 끝난다. 종이에서는 인쇄 규칙이 그 자리를 편다 */
      await page.waitForSelector(".rs-main .rs-sect", {
        state: "attached", timeout: 20000,
      });
      await page.waitForLoadState("load", { timeout: 20000 }).catch(() => undefined);
    } catch (e) {
      throw new PdfFailed("render",
        `결과 쪽이 열렸는데 본문이 서지 않았습니다: ${(e as Error).message.split("\n")[0]}`);
    }
    /* 접힌 자리를 눌러서도 펴 둔다. 인쇄 규칙 하나에만 기대면, 그 규칙이
       빠진 날 **빈 종이가 조용히 뽑힌다** */
    await page.locator(".rs-openbtn").first().click({ timeout: 3000 })
      .catch(() => undefined);
    /* **인쇄 매체로 바꿔 놓고 뽑는다.** 화면 규칙으로 뽑으면 종이에서
       손전화 화면이 된다(A4 의 글 폭이 690px 안팎이라 좁은 화면 규칙에
       걸린다) */
    await page.emulateMedia({ media: "print" });
    const pdfOpts = {
      format: "A4" as const, printBackground: true,
      /* **쪽수는 본문을 깎지 않고 여백에서 돌려받는다**(상용화 PHASE 0).
         위아래 16mm 는 쪽머리와 쪽번호가 들어가는 자리까지 치고도 남는
         값이었다. 14mm 로 줄여 쪽마다 두 줄을 더 싣는다. 좌우는 그대로
         둔다: 줄을 더 길게 하면 종이에서 읽는 속도가 떨어진다 */
      margin: { top: "14mm", bottom: "14mm", left: "14mm", right: "14mm" },
      displayHeaderFooter: true,
      headerTemplate: headerTemplate(opts.header),
      footerTemplate: FOOTER_TEMPLATE,
    };
    const first = await page.pdf(pdfOpts);
    /* **여기서 기다린다.** `return fitTail(...)` 로 두면 아래 `finally` 가
       브라우저를 먼저 닫고 둘째 인쇄가 `Printing failed` 로 떨어진다(한 번
       그렇게 503 이 났다). 운영 요약 쪽이 적어 둔 것과 같은 자리다 */
    return await fitTail(page, pdfOpts, first);
  } catch (e) {
    if (e instanceof PdfFailed) throw e;
    throw new PdfFailed("render", (e as Error).message.split("\n")[0]);
  } finally {
    await browser.close();
  }
}

/** PDF 바이트에서 쪽 수를 센다. `v3-pdf-audit` 이 쓰는 것과 같은 그림이다 */
function pageCount(buf: Buffer): number {
  return (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

/**
 * **마지막 쪽이 거의 빈 종이를 내보내지 않는다**(R34 §5).
 *
 * 쪽 높이가 고정이라 마지막 쪽이 얼마나 차는가는 **문서 길이가 쪽 경계에
 * 어디쯤 떨어지는가**로 정해진다. 그 길이는 응답마다 다르므로 CSS 한 벌로는
 * 어느 학생의 종이도 그 자리를 보장하지 못한다(실제 학생 한 벌이 11쪽 가운데
 * 마지막이 13% 였다). 그래서 **그 종이 하나에 대고** 맞춘다: 그대로 뽑은
 * 것에서 쪽 수를 세고, 글을 6% 안에서 줄여 **쪽이 하나 줄어드는 첫 배율**이
 * 있으면 그것을 쓴다. 줄어든 그 쪽이 들고 있던 것이 앞 쪽으로 올라오므로
 * 새 마지막 쪽은 늘 앞 쪽만큼 찬다.
 *
 * **담긴 글을 한 줄도 덜어내지 않고**, 쪽이 줄지 않으면 그대로 1.0 이다.
 * 6% 아래로는 내려가지 않는다: 본문 10pt 가 9.4pt 아래로 가면 종이에서
 * 읽는 속도가 떨어진다. 쪽이 둘뿐인 종이는 건드리지 않는다.
 */
async function fitTail(
  page: { pdf(o: Record<string, unknown>): Promise<Buffer> },
  opts: Record<string, unknown>, first: Buffer,
): Promise<Buffer> {
  const n0 = pageCount(first);
  if (n0 < 3) return first;
  for (const scale of [0.985, 0.97, 0.955, 0.94]) {
    const b = await page.pdf({ ...opts, scale });
    if (pageCount(b) < n0) return b;
  }
  return first;
}

/** 뽑은 종이를 자리에 둔다. 웹에서 바로 열리지 않는 자리다 */
export async function saveResultPdf(attemptId: string, pdf: Buffer): Promise<string> {
  await mkdir(V3_PDF_DIR, { recursive: true });
  const file = path.join(V3_PDF_DIR, `${attemptId}-${Date.now()}.pdf`);
  await writeFile(file, pdf);
  return file;
}

/**
 * 담당자가 받는 쪽을 그대로 A4 로 뽑는다(규격 §19).
 *
 * **결과지 함수를 돌려 쓰지 않는다.** 저쪽은 응시 하나를 열고 본문 절이
 * 섰는지로 기다리는데, 운영 요약은 응시가 없고 기다릴 자리도 다르다.
 * 한 함수에 분기를 넣으면 **결과지를 못 고치고는 운영 요약을 못 고친다.**
 *
 * 같이 쓰는 것은 **브라우저를 찾는 자리와 쿠키를 넘기는 모양**이다. 그
 * 둘이 운영에서만 나는 실패의 거의 전부라, 두 벌로 적어 두면 한쪽만
 * 고쳐지는 날이 온다(`__Secure-` 쿠키가 거절되던 자리가 그랬다).
 */
export type PageDrawOpts = {
  /** 뽑을 쪽. `/` 로 시작하는 이 배포본의 주소다 */
  path: string;
  baseUrl: string;
  cookie: string;
  header?: string;
  /** 쪽이 섰다고 볼 자리 */
  waitFor: string;
  /** 가로로 뽑는다. 표가 넓은 자리에서만 켠다 */
  landscape?: boolean;
};

export async function drawPagePdf(opts: PageDrawOpts): Promise<Buffer> {
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
      viewport: { width: 1200, height: 900 },
      ...(gate ? { httpCredentials: { username: gate.user, password: gate.pass } } : {}),
    });
    const base = opts.baseUrl.replace(/\/$/, "");
    if (opts.cookie) {
      try {
        await ctx.addCookies(cookiesFor(opts.cookie, base));
      } catch (e) {
        const names = cookiesFor(opts.cookie, base).map((c) => c.name).join(" ");
        throw new PdfFailed("cookie",
          `로그인 쿠키를 넘기지 못했습니다(${names}): `
          + `${(e as Error).message.split("\n")[0]}`);
      }
    }
    const page = await ctx.newPage();
    const url = `${base}${opts.path}`;
    let res;
    try {
      res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    } catch (e) {
      throw new PdfFailed("open",
        `${url} 로 못 갔습니다: ${(e as Error).message.split("\n")[0]}`);
    }
    if (!res || res.status() !== 200) {
      throw new PdfFailed("open", `쪽이 ${res ? res.status() : 0} 입니다 (${url})`);
    }
    /* **로그인 쪽으로 떨어진 것을 본문 없음으로 적지 않는다.** 쿠키가 안
       넘어가면 로그인 쪽이 200 으로 열리고, 그러면 아래 기다림이 시간을
       다 쓰고 `본문이 서지 않았습니다` 로 끝난다 */
    if (!page.url().startsWith(`${base}${opts.path.split("?")[0]}`)) {
      throw new PdfFailed("auth",
        `로그인 쪽으로 떨어졌습니다: ${page.url().slice(0, 120)}`);
    }
    try {
      await page.waitForSelector(opts.waitFor, { state: "attached", timeout: 20000 });
      await page.waitForLoadState("load", { timeout: 20000 }).catch(() => undefined);
    } catch (e) {
      throw new PdfFailed("render",
        `쪽이 열렸는데 본문이 서지 않았습니다: ${(e as Error).message.split("\n")[0]}`);
    }
    await page.emulateMedia({ media: "print" });
    /**
     * **여기서 기다린다.** `return page.pdf(...)` 로 두면 종이를 접는
     * 동안 아래 `finally` 가 브라우저를 닫고, 크로뮴이
     * `Printing failed` 로 거절한다. 그 실패는 밖에서 보면 **브라우저가
     * 못 뜬 것과 구별되지 않는다**(한 번 그렇게 적혔다).
     */
    const pdf = await page.pdf({
      format: "A4", printBackground: true, landscape: Boolean(opts.landscape),
      margin: { top: "14mm", bottom: "14mm", left: "14mm", right: "14mm" },
      displayHeaderFooter: true,
      headerTemplate: headerTemplate(opts.header),
      footerTemplate: FOOTER_TEMPLATE,
    });
    return pdf;
  } catch (e) {
    if (e instanceof PdfFailed) throw e;
    throw new PdfFailed("render", (e as Error).message.split("\n")[0]);
  } finally {
    await browser.close();
  }
}
