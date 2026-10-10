/**
 * CareerMatri 작업공간을 실제 브라우저로 찍는다.
 *
 * **그림만 남기지 않는다.** 자리마다 일곱을 같이 센다: **그 화면이
 * 맞는가**(주소 · 머리글 · 가르는 글자) · 열리는가 · **내부 코드가
 * 화면에 보이는가** · 가로 스크롤이 생기는가 · 브라우저 오류가 나는가 ·
 * 누르는 자리가 40px 이 되는가 · **같은 그림이 두 이름으로 저장되는가.**
 *
 * 첫째가 이번에 들어왔다. 전에는 상태 코드만 보고 있어서, 첫 로그인
 * 비밀번호 변경이 걸린 계정으로 찍는 동안 **일곱 자리 스물한 장이 전부
 * `비밀번호를 정해주세요` 화면**이었는데 검사가 전부 초록이었다. 그
 * 화면은 200 이고 내부 코드도 가로 스크롤도 없다. **상태 코드는 "서버가
 * 뭔가를 돌려줬다" 까지만 말한다.**
 *
 * 폭 셋을 본다. 넓은 화면(1440) · 손전화(390) · 가장 좁은 자리(320).
 * **320 을 뺄 수 없다**: 왼쪽 띠가 접히고 아래 띠가 서는 자리라 여기서
 * 밀리면 손전화에서 제품이 못 쓰인다.
 *
 * 먼저 띄워 두어야 한다. `next start` 로 띄우면 **지난 빌드의 자산
 * 이름을 적은 HTML** 이 나와서 쪽은 200 이고 CSS 만 400 이다.
 *
 *   npm run build && bash scripts/stage-serve.sh 3330
 *   UI_BASE=http://127.0.0.1:3330 node scripts/workspace-shots.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { loginAs, makeDupeWatch, verifyScreen } from "./_shot-identity.mjs";

const B = (process.env.UI_BASE || "http://127.0.0.1:3100").replace(/\/$/, "");
const OUT = "docs/metri/shots/workspace";
const FILE = process.argv[2];
mkdirSync(OUT, { recursive: true });

/**
 * **자리 목록을 직접 만든다.**
 *
 * 전에 만들어 둔 목록을 그대로 쓰면 그 사람은 지난번에 눌러 둔 상태로
 * 남아 있고, 그러면 찍은 그림이 그 사람의 기록이 아닌 것을 보여 준다.
 */
const plan = JSON.parse(FILE
  ? readFileSync(FILE, "utf8")
  : execFileSync("npx", ["tsx", "scripts/workspace-prep.ts"], { encoding: "utf8" }));

const SIZES = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
  narrow: { width: 320, height: 720 },
};

/**
 * **비밀번호를 다른 스크립트의 소스에서 긁어 오지 않는다.**
 *
 * 전에는 `v3-shots.mjs` 와 `ui-shots.mjs` 를 정규식으로 훑어 비밀번호를
 * 뽑았다. 그래서 그 계정이 첫 로그인에 비밀번호를 바꿔야 한다는 것을
 * 이쪽이 몰랐고, 로그인은 "됐다" 로 세어지고 모든 그림이 비밀번호 변경
 * 화면이 됐다. 이제 준비 쪽이 계정을 만들고 열쇠를 함께 넘긴다.
 */

/**
 * 응시자에게 보이면 안 되는 모양. 결과지 쪽 검사와 같은 그림을 쓴다.
 *
 * **밑줄로 이어진 글자 묶음은 무엇이든 내부 코드로 본다.** 길이를 재는
 * 그림은 `TR_TAG_1` 을 놓쳤다.
 */
const INTERNAL = [
  /\bTD\d{2}\b/, /\bJ[1-8]\b/, /\bOC[1-7]\b/, /\bORG_[A-Z]+\b/,
  /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/,
  /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/,
  /\bZ[1-4]\b/, /NOT_OBSERVED|PARTICIPATED|CONFIRMED|OWNED|NOT_EXPLORED/,
  /\b(?:undefined|null|NaN|TODO|TBD)\b/,
];

const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });

const ctx = {};
const landed = {};
for (const [key, who] of Object.entries(plan.users)) {
  ctx[key] = await browser.newContext({ viewport: SIZES.desktop });
  /* 로그인 뒤 **어디에 떨어졌는지까지** 본다. 떨어지는 자리면 여기서 멈춘다 */
  landed[key] = await loginAs(ctx[key], who, B);
}

const log = [];
const problems = [];
/**
 * 같은 그림이 두 이름으로 저장되면 둘 중 하나는 그 화면이 아니다.
 *
 * **일부러 같아야 하는 자리만 적는다.** 지금은 없다: `w05_state_gaps` 도
 * 닻만 다를 뿐 같은 쪽이라 같은 그림이 나올 수 있어 자리 이름을 적어
 * 두었다 — 그것은 의도된 같음이다.
 */
const dupe = makeDupeWatch(["w05_state_gaps"]);

for (const t of plan.targets) {
  for (const size of ["desktop", "mobile", "narrow"]) {
    const p = await ctx[t.who].newPage();
    await p.setViewportSize(SIZES[size]);
    const errs = [];
    p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 140)));
    p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
    const r = await p.goto(B + t.path, { waitUntil: "networkidle" });
    await p.waitForTimeout(200);
    const code = r ? r.status() : 0;

    const text = await p.evaluate(() => document.body.innerText);
    const leaked = INTERNAL.map((re) => (text.match(re) ?? [])[0]).filter(Boolean);
    const overflow = await p.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1);

    /*
     * **누르는 자리가 40px 이다.**
     *
     * 세는 것은 실제로 누르는 것만이다. `.cm-chip` 은 `span` 이고 읽는
     * 이름표라 여기 넣지 않는다: 처음에 넣어 두었더니 멀쩡한 이름표
     * 서른 자리가 미달로 걸렸다. **거짓 경보를 내는 검사는 그 다음부터
     * 아무도 안 본다.** 글 가운데 있는 링크도 뺀다 — 그 자리는 줄 높이를
     * 따르는 것이 맞고, 띄우면 문단이 깨진다.
     */
    const small = await p.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll(
        "a.cm-btn, button, .cm-tabs > a, .cm-more > summary, a.cm-nav,"
        + " label.cm-pick, .cm-fold > summary")) {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (r.height < 40) out.push(`${el.className || el.tagName}:${Math.round(r.height)}`);
      }
      return out.slice(0, 4);
    });

    /*
     * **그림을 남기기 전에 그 화면이 맞는지 본다.**
     *
     * 닻(`#gaps`)은 주소에서 떼고 본다. 브라우저가 돌려주는 `location`
     * 에는 닻이 붙어 있어서 그대로 견주면 멀쩡한 자리가 걸린다.
     */
    const id = await verifyScreen(p, t.expect ?? {});

    const file = `${OUT}/${t.name}__${size}.png`;
    await p.screenshot({ path: file, fullPage: !!t.full && size === "desktop" });

    /* 같은 그림이 두 이름으로 저장되는가 */
    const bytes = statSync(file).size;
    const hash = createHash("sha256").update(readFileSync(file)).digest("hex");
    const sameAs = dupe.add(`${t.name}__${size}`, bytes, hash);

    const tag = `${t.name} ${size}`;
    log.push(`${tag.padEnd(28)} ${code}`
      + `${id.ok ? "" : " 다른화면"}`
      + `${sameAs ? " 같은그림" : ""}`
      + `${overflow ? " 가로스크롤" : ""}`
      + `${leaked.length ? ` 내부코드 ${leaked.join(",")}` : ""}`
      + `${small.length ? ` 작은단추 ${small.join(",")}` : ""}`
      + `${errs.length ? ` 오류 ${errs.length}` : ""}`);
    if (code !== 200) problems.push(`${tag}: ${code}`);
    /* **상태 코드가 200 이어도 그 화면이 아니면 걸린다.** 이 줄이 없어서
       비밀번호 변경 화면 스물한 장이 통과했다 */
    if (!id.ok) problems.push(`${tag}: 그 화면이 아니다 — ${id.miss.join(" / ")}`);
    if (sameAs) problems.push(`${tag}: ${sameAs}`);
    if (overflow) problems.push(`${tag}: 가로 스크롤이 생긴다`);
    if (leaked.length) problems.push(`${tag}: 내부 코드가 보인다 — ${leaked.join(", ")}`);
    if (small.length) problems.push(`${tag}: 누르는 자리가 40px 미만 — ${small.join(", ")}`);
    if (errs.length) problems.push(`${tag}: ${errs[0]}`);
    await p.close();
  }
}

/* ── 띠가 쪽을 옮겨도 그대로 서는가 ──
   작업공간이 파는 것이 그것이다. 띠가 끊기면 쪽 넷이 **서로 다른 사이트**
   로 읽힌다 */
{
  const p = await ctx.work.newPage();
  await p.setViewportSize(SIZES.desktop);
  const seen = [];
  for (const path of ["/me", "/me/results", "/me/state", "/me/next", "/me/experience"]) {
    await p.goto(B + path, { waitUntil: "networkidle" });
    const rail = await p.locator("nav.cm-rail a.cm-nav").count();
    const onNow = await p.locator("nav.cm-rail a.cm-nav.is-on").count();
    seen.push(`${path} 줄 ${rail} 켜짐 ${onNow}`);
    if (rail < 10) problems.push(`${path}: 왼쪽 띠가 ${rail}줄이다`);
    if (onNow !== 1) problems.push(`${path}: 지금 자리가 ${onNow}곳 켜졌다`);
  }
  log.push(`띠가 그대로 선다`.padEnd(28) + ` ${seen.join(" / ")}`);
  await p.close();
}

/* ── 손전화에서 아래 띠와 서랍 ── */
{
  const p = await ctx.work.newPage();
  await p.setViewportSize(SIZES.narrow);
  await p.goto(`${B}/me`, { waitUntil: "networkidle" });
  const tabs = await p.locator("nav.cm-tabs > a").count();
  await p.locator(".cm-more > summary").click();
  await p.waitForTimeout(150);
  const sheet = await p.locator(".cm-sheet a.cm-nav").count();
  await p.screenshot({ path: `${OUT}/w17_sheet__narrow.png` });
  log.push(`손전화 서랍`.padEnd(28) + ` 아래 띠 ${tabs}칸 · 서랍 ${sheet}줄`);
  /* **아래 띠는 넷이다**(규격 §13): 홈 · 검사 · 경험 · 더보기. 앞의 셋이
     링크이고 넷째가 서랍을 여는 자리라, 세는 것은 링크 셋이다. 다섯째를
     세우면 320px 에서 글자가 두 줄로 접히고 누르는 자리가 안 읽힌다 */
  if (tabs !== 3) problems.push(`아래 띠의 링크가 ${tabs}칸이다 (셋 + 더보기)`);
  if (sheet < 10) problems.push(`서랍이 ${sheet}줄이다`);
  await p.close();
}

await browser.close();
console.log(log.join("\n"));
console.log(`\n자리 ${plan.targets.length}곳 × 폭 3 — 그림 ${OUT} 에 남았다.`);
if (problems.length) {
  console.log(`\n걸린 것 ${problems.length}가지`);
  for (const x of problems) console.log(`  걸림  ${x}`);
} else {
  console.log("\n열리는가 · 내부 코드 · 가로 스크롤 · 오류 · 누르는 자리 전부 OK.");
}
process.exitCode = problems.length ? 1 : 0;
