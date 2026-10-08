/**
 * ME_V3 검사 화면을 실제 브라우저로 찍는다.
 *
 * 그림만 남기지 않는다. 찍는 자리마다 넷을 같이 센다: **내부 코드가
 * 화면에 보이는가** · 가로 스크롤이 생기는가 · 브라우저 오류가 나는가 ·
 * 초점 표시가 보이는가. 눈으로 보면 넷 다 지나간다.
 *
 * 먼저 띄워 두어야 한다.
 *
 *   npx next build && npx next start -p 3100
 *   npx tsx scripts/v3-shot-prep.ts > /tmp/targets.json
 *   node scripts/v3-shots.mjs /tmp/targets.json
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";

const B = process.env.UI_BASE ?? "http://127.0.0.1:3100";
const OUT = "docs/metri/shots/v3";
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
  : execFileSync("npx", ["tsx", "scripts/v3-shot-prep.ts"], { encoding: "utf8" }));
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

const log = [];
const problems = [];
for (const t of plan.targets) {
  for (const size of ["desktop", "mobile"]) {
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

/* 320px 과 키보드 이동은 한 자리에서만 본다. 열다섯 자리를 다 보면
   컨테이너가 메모리에서 죽는다.
   **누르는 점검이라 응답이 바뀐다.** 그래서 다 찍은 뒤에 하고, 자리도
   맨 끝 것을 쓴다 */
const qa = plan.targets[plan.targets.length - 1];
{
  const p = await ctx[qa.who].newPage();
  await p.setViewportSize(SIZES.narrow);
  await p.goto(B + qa.path, { waitUntil: "networkidle" });
  const overflow = await p.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) problems.push("320px: 가로 스크롤이 생긴다");
  await p.screenshot({ path: `${OUT}/${qa.name}__narrow.png` });

  /* 키보드만으로 보기를 고를 수 있는가 */
  await p.setViewportSize(SIZES.desktop);
  await p.keyboard.press("Tab");
  for (let i = 0; i < 12; i += 1) {
    const tag = await p.evaluate(() => {
      const el = document.activeElement;
      return el ? `${el.tagName}:${el.getAttribute("type") ?? ""}` : "";
    });
    if (tag === "INPUT:radio") break;
    await p.keyboard.press("Tab");
  }
  const onRadio = await p.evaluate(() =>
    document.activeElement?.tagName === "INPUT");
  if (!onRadio) problems.push("키보드로 보기에 닿지 않는다");
  else {
    await p.keyboard.press("ArrowDown");
    const picked = await p.evaluate(() =>
      document.querySelectorAll(".qs-opt.is-on").length);
    if (!picked) problems.push("키보드로 고른 것이 화면에 나타나지 않는다");
    const ring = await p.evaluate(() => {
      const el = document.activeElement?.closest(".qs-opt, .qs-cell");
      if (!el) return "";
      return getComputedStyle(el).outlineStyle;
    });
    if (ring === "none") problems.push("초점 표시가 없다");
    await p.screenshot({ path: `${OUT}/${qa.name}__focus.png` });
  }
  log.push(`${qa.name} 320px·키보드`.padEnd(26) + " 확인");
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
