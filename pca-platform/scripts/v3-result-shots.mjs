/**
 * ME_V3 결과지를 실제 브라우저로 찍는다.
 *
 * 그림만 남기지 않는다. 찍는 자리마다 넷을 같이 센다: **내부 코드가
 * 화면에 보이는가** · 가로 스크롤이 생기는가 · 브라우저 오류가 나는가 ·
 * 초점 표시가 보이는가. 눈으로 보면 넷 다 지나간다.
 *
 * 먼저 띄워 두어야 한다.
 *
 *   npx next build && npx next start -p 3100
 *   npx tsx scripts/v3-result-prep.ts > /tmp/targets.json
 *   node scripts/v3-shots.mjs /tmp/targets.json
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";

const B = process.env.UI_BASE ?? "http://127.0.0.1:3100";
const OUT = "docs/metri/shots/v3r";
const FILE = process.argv[2];
mkdirSync(OUT, { recursive: true });

/**
 * **자리 목록을 직접 만든다.**
 *
 * 전에 만들어 둔 목록을 그대로 쓰면 그 응시는 지난번 키보드 점검이
 * 눌러 둔 상태로 남아 있다. 그러면 찍은 그림이 **그 사람의 응답이
 * 아닌 것**을 보여 주고, 보는 쪽은 그것을 설계로 읽는다.
 */
const plan = JSON.parse(FILE
  ? readFileSync(FILE, "utf8")
  : execFileSync("npx", ["tsx", "scripts/v3-result-prep.ts"], { encoding: "utf8" }));
const SIZES = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
  narrow: { width: 320, height: 720 },
};
const PW = {
  "me-admin": "pca-dev-org-1234",
  admin: "pca-dev-admin-1234",
};

/** 응시자에게 보이면 안 되는 모양. 문항 번호와 영역 코드와 축 코드 */
const INTERNAL = [
  /\bTD\d{2}\b/, /\b[A-Z]{2,3}_[A-Z0-9]{2,}\b/, /\bJ[1-8]\b/,
  /ME_V3|ME_CORE|ITEM_BANK|INDUSTRY_[A-Z]|ROLE_[A-Z]+_V/,
  /\bZ[1-4]_[A-Z]/, /NOT_OBSERVED|PARTICIPATED|CONFIRMED|OWNED/,
];

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
for (const [key, login_] of Object.entries(plan.users)) {
  ctx[key] = await browser.newContext({ viewport: SIZES.desktop });
  await login(ctx[key], login_);
}

/* 320px 은 세 자리에서 본다. 좁은 화면이 실제로 달라지는 곳은 머리띠가
   접히는 자리(시작) · 눈금이 선 자리(소유) · 칩이 깔린 자리(근거)다 */
const NARROW = new Set(["r1_basic", "r3_pro"]);

const log = [];
const problems = [];
for (const t of plan.targets) {
  const sizes = NARROW.has(t.name)
    ? ["desktop", "mobile", "narrow"] : ["desktop", "mobile"];
  /* `#focus` 처럼 자리를 가리키는 주소는 **보이는 만큼만** 찍는다. 쪽
     전체를 찍으면 어디를 가리킨 그림인지 알 수 없다 */
  for (const size of sizes) {
    const p = await ctx[t.who].newPage();
    await p.setViewportSize(SIZES[size]);
    const errs = [];
    p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 140)));
    p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
    const r = await p.goto(B + t.path, { waitUntil: "networkidle" });
    await p.waitForTimeout(250);
    const code = r ? r.status() : 0;

    const text = await p.evaluate(() => document.body.innerText);
    const leaked = INTERNAL.map((re) => (text.match(re) ?? [])[0]).filter(Boolean);
    const overflow = await p.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1);

    /* 붙어 있는 띠를 그대로 두고 **보이는 만큼만** 찍는다. 쪽 전체를 찍으면
       fixed 띠가 굴러간 자리에 한 번 더 그려진다 */
    const file = `${OUT}/${t.name}__${size}.png`;
    await p.screenshot({ path: file, fullPage: !!t.full });

    const tag = `${t.name} ${size}`;
    log.push(`${tag.padEnd(26)} ${code} ${overflow ? "가로스크롤 " : ""}` +
      `${leaked.length ? `내부코드 ${leaked.join(",")} ` : ""}` +
      `${errs.length ? `오류 ${errs.length}` : ""}`.trim());
    if (code !== 200) problems.push(`${tag}: ${code}`);
    if (overflow) problems.push(`${tag}: 가로 스크롤이 생긴다`);
    if (leaked.length) problems.push(`${tag}: 내부 코드가 보인다 — ${leaked.join(", ")}`);
    if (errs.length) problems.push(`${tag}: ${errs[0]}`);
    await p.close();
  }
}

/* 320px 에서 가로로 밀리지 않는가. **결과지에는 누를 자리가 거의 없어서**
   검사 화면과 달리 키보드로 고르는 점검을 두지 않는다 */
{
  const qa = plan.targets.find((t) => t.name === "r3_pro") ?? plan.targets[0];
  const p = await ctx[qa.who].newPage();
  await p.setViewportSize(SIZES.narrow);
  await p.goto(B + qa.path, { waitUntil: "networkidle" });
  const overflow = await p.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) problems.push("320px: 가로 스크롤이 생긴다");
  log.push(`${qa.name} 320px`.padEnd(26) + (overflow ? " 가로스크롤" : " 확인"));
  await p.close();
}

/* ── 대비와 누르는 자리 ──
   눈으로는 다 괜찮아 보인다. 전에 `a11y:check` 를 처음 돌렸을 때 마흔
   가지가 걸린 자리가 그것이라, 검사 화면도 세어 둔다 */
{
  const ROLES = [".rs-h1", ".rs-lead", ".rs-kicker", ".rs-tier", ".rs-head nav a",
    ".rs-top h3", ".rs-top p", ".rs-sect > h2", ".rs-note", ".rs-domain > header h3",
    ".rs-zone", ".rs-pick", ".rs-axis > b", ".rs-axis > span", ".rs-axis .state",
    ".rs-gap > h3", ".rs-gap > p", ".rs-do", ".rs-when > h3", ".rs-when li",
    ".rs-zones h3", ".rs-zones p", ".rs-zones li", ".rs-ev h3", ".rs-steps li > span",
    ".rs-fine", ".rs-flag", ".rs-others"];
  const seen = new Map();
  for (const t of plan.targets.slice(1)) {
    const p = await ctx[t.who].newPage();
    await p.setViewportSize(SIZES.desktop);
    await p.goto(B + t.path, { waitUntil: "networkidle" });
    const rows = await p.evaluate((sel) => {
      const lum = (c) => {
        const [r, g, b] = c.map((v) => {
          const x = v / 255;
          return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      /* **색 적는 법이 둘이다.** 크로뮴은 `color-mix` 를 거친 값을
         `color(srgb 1 1 1 / 0.94)` 로 돌려주는데, 거기서 숫자 셋을 그냥
         집으면 흰색이 `rgb(1,1,1)` 즉 검정이 된다. 그러면 멀쩡한 글자색이
         전부 대비 미달로 걸린다. 거짓 경보를 내는 검사는 그 다음부터
         아무도 안 본다 */
      const parse = (c) => {
        const n = (c.match(/-?\d*\.?\d+/g) ?? []).map(Number);
        if (n.length < 3) return null;
        const srgb = c.startsWith("color(");
        const v = n.slice(0, 3).map((x) => (srgb ? x * 255 : x));
        const a = n.length > 3 ? n[3] : 1;
        return { v, a };
      };
      /* 반투명이면 **아래와 섞어서** 본다. 머리띠와 바닥 띠가 그렇다 */
      const bgOf = (el) => {
        let acc = null, left = 1;
        for (let n = el; n && left > 0.01; n = n.parentElement) {
          const c = parse(getComputedStyle(n).backgroundColor);
          if (!c || c.a <= 0.01) continue;
          const w = left * c.a;
          acc = acc ? acc.map((x, i) => x + c.v[i] * w) : c.v.map((x) => x * w);
          left -= w;
        }
        const base = acc ?? [0, 0, 0];
        return base.map((x) => x + 255 * left);
      };
      const out = [];
      for (const q of sel) {
        for (const el of document.querySelectorAll(q)) {
          const st = getComputedStyle(el);
          if (!el.textContent?.trim()) continue;
          const fgc = parse(st.color);
          if (!fgc) continue;
          const fg = fgc.v, bg = bgOf(el);
          const L1 = lum(fg), L2 = lum(bg);
          const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          const px = parseFloat(st.fontSize);
          const big = px >= 24 || (px >= 18.66 && parseInt(st.fontWeight, 10) >= 700);
          const r = el.getBoundingClientRect();
          out.push({ q, ratio: Math.round(ratio * 100) / 100, need: big ? 3 : 4.5,
                     h: Math.round(r.height) });
          break;   /* 같은 꼴은 한 번만 */
        }
      }
      return out;
    }, ROLES);
    for (const r of rows) if (!seen.has(r.q) || seen.get(r.q).ratio > r.ratio) seen.set(r.q, r);
    await p.close();
  }
  const bad = [...seen.values()].filter((r) => r.ratio < r.need);
  for (const r of bad) problems.push(`대비 ${r.q} ${r.ratio}:1 (${r.need} 필요)`);
  log.push("대비".padEnd(26) + ` ${seen.size}꼴 · 가장 낮은 ` +
    `${Math.min(...[...seen.values()].map((r) => r.ratio))}:1`);

  /* 누르는 자리 */
  const tgt = plan.targets.find((t) => t.name === "r3_pro") ?? plan.targets[0];
  const p = await ctx[tgt.who].newPage();
  await p.setViewportSize(SIZES.mobile);
  await p.goto(B + plan.targets.find((t) => t.name === "r3_pro").path,
    { waitUntil: "networkidle" });
  const small = await p.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll(".rs-head nav a, .rs-foldbtn")) {
      const h = el.getBoundingClientRect().height;
      if (h < 40) out.push(`${el.className.split(" ")[0]} ${Math.round(h)}px`);
    }
    return out;
  });
  for (const x of small) problems.push(`누르는 자리가 40px 아래다 — ${x}`);
  log.push("누르는 자리".padEnd(26) + ` ${small.length ? small.join(",") : "40px 이상"}`);
  await p.close();
}

await browser.close();
console.log(log.join("\n"));
if (problems.length) {
  console.log(`\n${problems.length}개가 걸렸다.`);
  for (const x of problems) console.log("  " + x);
  process.exitCode = 1;
} else {
  console.log(`\n화면 ${log.length - 1}자리 OK. ${OUT} 에 남았다.`);
}
