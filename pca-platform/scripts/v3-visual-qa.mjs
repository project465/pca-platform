/**
 * 화면이 어느 폭에서도 · 어느 확대에서도 · 긴 글에서도 서는가.
 *
 * `v3:shots` 는 **그림을 남기고** 이 검사는 **숫자를 센다.** 눈으로는
 * 1440px 한 폭만 보게 되고, 신고는 늘 다른 폭에서 들어온다.
 *
 * 세 가지를 본다.
 *
 *   1. **폭 열하나**(320 · 360 · 375 · 390 · 430 · 768 · 1024 · 1280 · 1366 · 1440 ·
 *      1920). 가로로 밀리는가 · 글 폭이 창을 넘는가 · 바닥 띠가 본문
 *      마지막 줄을 덮는가. 특히 768~1280 은 아무도 안 보는 자리인데
 *      사이드바와 본문이 부딪히는 구간이 거기다.
 *   2. **확대 100 · 125 · 150%.** 윈도 크로뮴에서 흔한 설정이고, 고정
 *      띠가 있는 화면은 확대하면 띠가 본문을 덮는다. `zoom` 으로 실제로
 *      키워서 본다.
 *   3. **긴 글.** 제목 넉 줄 · 보기 석 줄 · 긴 기관 이름을 넣어 보고
 *      **말줄임으로 뜻이 잘리는 자리**가 있는지 센다.
 *
 * 먼저 `npm run stage:serve 3100` 으로 띄워 두어야 한다.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { devPassword } from "./dev-credentials.mjs";

const B = process.env.UI_BASE ?? "http://127.0.0.1:3100";
const FILE = process.argv[2];
const plan = JSON.parse(FILE
  ? readFileSync(FILE, "utf8")
  : execFileSync("npx", ["tsx", "scripts/v3-shot-prep.ts"], { encoding: "utf8" }));

const PW = { "me-admin": devPassword("org"), admin: devPassword("admin") };
/* **규격 §21 의 네 폭을 전부 넣는다**: 320 · 360 · 390 · 430. 360 은
   보급형 안드로이드이고 430 은 큰 iPhone 이라, 둘 다 가장 많이 쓰이는
   자리인데 빠져 있었다 */
const WIDTHS = [320, 360, 375, 390, 430, 768, 1024, 1280, 1366, 1440, 1920];
const ZOOMS = [1, 1.25, 1.5];

/** 재는 자리. 열다섯 화면 가운데 **모양이 실제로 갈리는 것**만 */
const WANT = [
  "00_start", "01_profile", "02_industry_pick", "03_industry_scene",
  "04_screening", "05_core_probe", "05b_transition", "06_deep_dive",
  "06b_grad_branch", "07_evidence", "08_role_pick", "12_done",
  "13_ownership", "16_result_top", "17_result_domains", "22_dashboard",
  "23_experience_new", "25_gap", "28_track",
];
/** 확대를 보는 자리. 고정 띠가 있거나 글이 긴 쪽 */
const ZOOM_AT = new Set([
  "04_screening", "13_ownership", "07_evidence", "22_dashboard", "16_result_top",
]);

const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox"] });

async function login(ctx, who) {
  const p = await ctx.newPage();
  await p.goto(`${B}/login`, { waitUntil: "networkidle" });
  await p.fill('input[name="identifier"], input[name="loginId"], input[type="text"]', who);
  await p.fill('input[type="password"]', PW[who]);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 20000 })
    .catch(() => {});
  const at = new URL(p.url()).pathname;
  await p.close();
  if (at.startsWith("/login")) throw new Error(`로그인이 안 됐습니다: ${who}`);
}

const ctx = {};
for (const [key, who] of Object.entries(plan.users)) {
  ctx[key] = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await login(ctx[key], who);
}

const bad = [];
const log = [];

/**
 * 가로로 밀리는가 · 창을 넘는 덩이가 있는가.
 *
 * **접힌 `<details>` 안은 세지 않는다.** 크로뮴은 접힌 자리의 내용을
 * `display: none` 이 아니라 `content-visibility: hidden` 으로 두는데,
 * 그러면 **안 보이는 줄에도 `getBoundingClientRect` 가 자리를 돌려준다.**
 * 처음 돌렸을 때 서른아홉 곳이 걸렸고 전부 그것이었다: 접힌
 * `보기가 어떻게 갈리나요` 의 네 줄이 바닥 띠 뒤에 있다고 나왔다.
 * **거짓 경보를 내는 검사는 그 다음부터 아무도 안 본다.**
 */
const measure = () => ({
  scrollW: document.scrollingElement.scrollWidth,
  clientW: document.scrollingElement.clientWidth,
  /* 창보다 넓은 덩이. 표와 코드처럼 **제 안에서 미는 것**은 뺀다 */
  wide: [...document.querySelectorAll("body *")]
    .filter((el) => {
      if (el.closest("details:not([open])")) return false;
      const r = el.getBoundingClientRect();
      if (r.width === 0) return false;
      if (r.right <= window.innerWidth + 1 && r.left >= -1) return false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ov = getComputedStyle(p).overflowX;
        if (ov === "auto" || ov === "scroll") return false;
      }
      return true;
    })
    .slice(0, 3)
    .map((el) => `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]}`),
  /* 말줄임으로 글이 잘린 자리. **뜻이 사라지는 자리만 센다**:
     한 줄 이름표(머리띠의 단계)는 일부러 줄인다 */
  clipped: [...document.querySelectorAll("h1, h2, h3, p, li, label, button, a")]
    .filter((el) => {
      if (el.closest("details:not([open])")) return false;
      const st = getComputedStyle(el);
      if (st.textOverflow !== "ellipsis" && st.overflow !== "hidden") return false;
      if (el.closest(".qs-crumb, .cm-rail, .sf-nav")) return false;
      return el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2;
    })
    .slice(0, 3)
    .map((el) => (el.textContent || "").trim().slice(0, 24)),
  /* 바닥에 붙은 띠가 본문 마지막 줄을 덮는가 */
  covered: (() => {
    const bar = document.querySelector(".qs-nav");
    if (!bar) return 0;
    const b = bar.getBoundingClientRect();
    const last = [...document.querySelectorAll(".qs-main *")]
      .filter((el) => !el.closest("details:not([open])"))
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.height > 0 && r.top < b.top + b.height && r.bottom > b.top);
    /* 문서를 끝까지 내렸을 때만 센다. 중간에서는 덮이는 것이 정상이다 */
    const atEnd = window.scrollY + window.innerHeight
      >= document.scrollingElement.scrollHeight - 2;
    return atEnd ? last.length : 0;
  })(),
});

for (const t of plan.targets) {
  if (!WANT.includes(t.name) || t.pdf) continue;
  const page = await ctx[t.who].newPage();
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: w < 500 ? 780 : 900 });
    const res = await page.goto(B + t.path, { waitUntil: "networkidle" });
    if ((res?.status() ?? 0) >= 400) { bad.push(`${t.name} ${w}px: ${res?.status()}`); continue; }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(80);
    const m = await page.evaluate(measure);
    if (m.scrollW > m.clientW + 1) bad.push(`${t.name} ${w}px: 가로로 ${m.scrollW - m.clientW}px 밀린다`);
    if (m.wide.length) bad.push(`${t.name} ${w}px: 창을 넘는 덩이 — ${m.wide.join(" · ")}`);
    if (m.clipped.length) bad.push(`${t.name} ${w}px: 말줄임으로 잘린 글 — ${m.clipped.join(" / ")}`);
    if (m.covered) bad.push(`${t.name} ${w}px: 바닥 띠가 본문 ${m.covered}곳을 덮는다`);
  }
  /* 확대. **고정 띠가 본문을 덮는 자리가 여기서 드러난다** */
  if (ZOOM_AT.has(t.name)) {
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const z of ZOOMS) {
      await page.goto(B + t.path, { waitUntil: "networkidle" });
      await page.evaluate((zz) => { document.documentElement.style.zoom = String(zz); }, z);
      await page.waitForTimeout(120);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(80);
      const m = await page.evaluate(measure);
      const at = `${t.name} 확대 ${Math.round(z * 100)}%`;
      if (m.scrollW > m.clientW + 2) bad.push(`${at}: 가로로 ${m.scrollW - m.clientW}px 밀린다`);
      if (m.covered) bad.push(`${at}: 바닥 띠가 본문 ${m.covered}곳을 덮는다`);
    }
  }
  log.push(`${t.name.padEnd(22)} 폭 ${WIDTHS.length}${ZOOM_AT.has(t.name) ? " · 확대 3" : ""}`);
  await page.close();
}

/* ── 긴 글 ──
   **제목 넉 줄과 보기 석 줄을 실제로 넣어 본다.** 데이터로는 안 오는
   길이지만 기관 이름과 과제 이름은 사람이 적는 칸이라 길어진다 */
{
  const page = await ctx.shots.newPage();
  const t = plan.targets.find((x) => x.name === "13_ownership");
  if (t) {
    for (const w of [320, 768, 1440]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(B + t.path, { waitUntil: "networkidle" });
      await page.evaluate(() => {
        const long = "연구 산출물로 제작에 쓸 도면이나 부품 사양을 직접 내 본 적이 있고 "
          + "그 도면이 사내 표준과 외부 규격을 동시에 만족하는지 확인한 뒤 "
          + "협력사 검토 의견까지 반영해 다시 낸 적이 있는지 떠올려 주세요";
        const h = document.querySelector(".qs-q");
        if (h) h.textContent = long;
        const l = document.querySelector(".qs-label");
        if (l) l.textContent = "조건과 기준까지 직접 정하고 그 결과가 다음 공정과 협력사 도면에 그대로 쓰였음";
      });
      await page.waitForTimeout(80);
      const m = await page.evaluate(measure);
      if (m.scrollW > m.clientW + 1) bad.push(`긴 글 ${w}px: 가로로 밀린다`);
      if (m.clipped.length) bad.push(`긴 글 ${w}px: 잘린 글 — ${m.clipped.join(" / ")}`);
    }
    log.push(`긴 글 stress          폭 3`);
  }
  await page.close();
}

/* ── 키보드 ──
   **Tab 으로 닿고 화살표로 고르고 눈에 보이는 테가 선다**(규격 §40) */
{
  const page = await ctx.shots.newPage();
  const t = plan.targets.find((x) => x.name === "13_ownership");
  if (t) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(B + t.path, { waitUntil: "networkidle" });
    const first = await page.$('.qs-opt input[type="radio"]');
    if (!first) bad.push("키보드: 보기 넷에 radio 가 없다");
    else {
      await first.focus();
      const ring = await page.evaluate(() => {
        const el = document.activeElement?.closest(".qs-opt");
        if (!el) return null;
        const st = getComputedStyle(el);
        return { w: st.outlineWidth, style: st.outlineStyle };
      });
      if (!ring || ring.style === "none" || parseFloat(ring.w) < 1) {
        bad.push("키보드: 초점 테가 보이지 않는다");
      }
      /* 라디오 묶음은 화살표로 옮긴다. 브라우저 기본 동작이지만
         `name` 이 갈려 있으면 안 먹는다 */
      const before = await page.evaluate(() =>
        [...document.querySelectorAll('.qs-opt input')].findIndex((x) => x.checked));
      await page.keyboard.press("ArrowDown");
      const after = await page.evaluate(() =>
        [...document.querySelectorAll('.qs-opt input')].findIndex((x) => x.checked));
      if (after === before) bad.push("키보드: 화살표로 보기를 옮기지 못한다");
    }
    /* 접힌 자리는 **hover 가 아니라 눌러서** 열린다(규격 §44) */
    log.push("키보드                 초점 테 · 화살표");
  }
  await page.close();
}

await browser.close();
console.log(log.join("\n"));
if (bad.length) {
  console.log(`\n${bad.length}곳이 걸렸다:\n  ` + bad.join("\n  "));
  process.exit(1);
}
console.log(`\n폭 열하나 · 확대 셋 · 긴 글 · 키보드 OK — 자리 ${log.length}`);
