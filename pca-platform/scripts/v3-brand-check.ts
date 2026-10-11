/**
 * 상표가 어디서나 **같은 파일 하나**인가 (규격 A-4 · A-5).
 *
 * 글자로 `BrandMark` 를 세는 것으로는 모자란다: 쓰는 자리를 지우지 않고
 * 그 옆에 네모를 하나 더 그려 넣어도 그 검사는 통과한다. 그래서 **실제로
 * 그려진 쪽**에서 센다.
 *
 *   1. 상표 자리에 선 그림의 주소가 전부 공식 파일 하나인가
 *   2. 그 주소가 200 으로 내려오는가 (배포본에 실제로 담겼는가)
 *   3. 금지한 모양이 남아 있지 않은가 — 글자 `CM` 과 `H` 로 그린 표시,
 *      배경만 칠한 네모, 화면마다 따로 그린 `svg`
 *   4. 워드마크가 `CareerMatri` 한 철자인가
 *
 * 그리고 같은 길에서 일곱 자리를 찍는다(데스크톱 넷 · 손전화 셋).
 *
 *   UI_BASE=http://127.0.0.1:3100 OUT=docs/metri/shots/brand npm run v3:brand
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "./_loop-fixture";

loadEnv();

/* eslint-disable import/first */
import { chromium, devices, type Page } from "playwright";
import { BASE, cloneFinished, gateCreds, login, makeStudent } from "./_loop-fixture";
import { BRAND_MARK_SRC } from "../src/components/sf/brand-mark";

const OUT = process.env.OUT || "docs/metri/shots/brand";
let bad = 0;
function say(t: string, cond: boolean, n: string): void {
  bad += cond ? 0 : 1;
  console.log(`  ${cond ? "통과" : "걸림"}  ${t} — ${n}`);
}

/** 상표 자리에 실제로 선 것을 모은다. **머리띠와 띠 안만 본다** */
async function marks(p: Page): Promise<{ src: string[]; inline: number; text: string[] }> {
  return p.evaluate(() => {
    const zones = [...document.querySelectorAll(
      ".cm-rail-brand, .cm-topbar-brand, .sf-brand, .qs-brand, .rs-brand, .rs-head, .sf-door-brand")];
    const src: string[] = []; const text: string[] = []; let inline = 0;
    for (const z of zones) {
      for (const i of z.querySelectorAll("img")) src.push(i.getAttribute("src") || "");
      inline += z.querySelectorAll("svg").length;
      const t = (z.textContent || "").replace(/\s+/g, " ").trim();
      if (t) text.push(t);
    }
    /* 띠 밖에 혼자 선 상표(결과지 머리의 `rs-mark`)도 센다 */
    for (const i of document.querySelectorAll("img.rs-mark, img.sf-brand-mark, img.cm-rail-mark"))
      src.push(i.getAttribute("src") || "");
    return { src: [...new Set(src)], inline, text };
  });
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const who = `brand-${Date.now()}@example.com`;
  const me = await makeStudent(who);
  await cloneFinished(me.id, "PRO");
  const br = await chromium.launch({ args: ["--no-sandbox"] });

  /* 공식 파일이 배포본에서 내려오는가 */
  const probe = await br.newContext({ httpCredentials: gateCreds() ?? undefined });
  const res = await probe.request.get(`${BASE}${BRAND_MARK_SRC}`);
  const body = await res.text();
  say("공식 상표 파일이 내려온다", res.status() === 200 && body.includes("<path"),
    `${res.status()} · ${body.length}바이트`);
  /* **`<path>` 수를 세지 않는다.** 앞 판본은 그 수를 넷으로 못 박고
     있었는데, 그러면 겹친 자리를 그리는 줄을 더하는 날 멀쩡한 상표가
     걸린다. 세는 것은 **잎이 넷인가**와 **테를 두르지 않았는가**다 */
  const leaves = (body.match(/data-leaf=/g) || []).length;
  const laps = (body.match(/data-lap=/g) || []).length;
  say("공식 상표가 잎 넷이다", leaves === 4, `잎 ${leaves}장`);
  say("잎이 서로 겹친 자리가 넷이다", laps === 4, `겹친 자리 ${laps}곳`);
  say("테도 stroke 도 두지 않는다", !/\bstroke=/.test(body),
    /\bstroke=/.test(body) ? "stroke 있음" : "없음");
  await probe.close();

  const where: [string, string, boolean][] = [
    ["home", "/me", false], ["assessment", "/v3/start", false],
    ["result", "RESULT", false], ["account", "/my", false],
    ["login", "/login", false],
    ["m-home", "/me", true], ["m-assessment", "/v3/start", true],
    ["m-account", "/my", true],
  ];
  for (const [name, path, mobile] of where) {
    const ctx = await br.newContext({
      ...(mobile ? devices["Pixel 5"] : {}),
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      httpCredentials: gateCreds() ?? undefined,
    });
    const p = path === "/login" ? await ctx.newPage() : await login(ctx, who, me.pw);
    let url = `${BASE}${path}`;
    if (path === "RESULT") {
      const a = await p.evaluate(() => {
        const l = [...document.querySelectorAll("a")]
          .map((x) => x.getAttribute("href") || "")
          .find((h) => /^\/v3\/\d+\/result$/.test(h));
        return l || "";
      });
      url = `${BASE}${a || "/me"}`;
    }
    await p.goto(url, { waitUntil: "networkidle" });
    await p.waitForTimeout(250);
    const m = await marks(p);
    const foreign = m.src.filter((s) => s !== BRAND_MARK_SRC);
    say(`${name} 상표가 공식 파일 하나다`, m.src.length > 0 && foreign.length === 0,
      m.src.length ? `${m.src.length}자리 · ${foreign[0] ?? "전부 같은 파일"}` : "상표가 없다");
    say(`${name} 상표 자리에 따로 그린 그림이 없다`, m.inline === 0, `svg ${m.inline}개`);
    const wrong = m.text.filter((t) => /Careermetri|CM\b|^H$/.test(t));
    say(`${name} 워드마크가 CareerMatri 하나다`, wrong.length === 0,
      wrong[0] ?? (m.text[0] ?? "").slice(0, 28));
    writeFileSync(resolve(OUT, `${name}.png`), await p.screenshot());
    await ctx.close();
  }
  await br.close();
  console.log(`\n상표 확인 ${bad === 0 ? "전부 통과" : `걸림 ${bad}`} — 그림은 ${OUT}/`);
  process.exitCode = bad ? 1 : 0;
}
main().then(() => process.exit(process.exitCode ?? 0),
  (e) => { console.error(e); process.exit(1); });
