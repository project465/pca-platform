/**
 * **제품 루프가 끊기지 않는가.** 사람이 누르는 차례 그대로 기계가 눌러 본다.
 *
 * `v3:gate` 가 묻는 것은 `쪽이 서는가` 이고 여기가 묻는 것은 **`그 쪽에서
 * 다음 쪽으로 갈 수 있는가`** 다. 둘은 다른 질문이다: 열두 쪽이 전부 200
 * 이면서 그 사이를 이을 길이 하나도 없을 수 있다.
 *
 * 규격 §17·§19·§23·§24·§30 이 요구한 자리를 센다.
 *
 *   1. 로그인 → 홈 → 지금 할 일 → 경험 추가 → 저장 → 달라진 것 → 현재 상태
 *   2. 홈의 주된 단추가 실제로 다음 쪽을 연다
 *   3. 막다른 길 0 — 작업공간 안의 링크가 전부 열린다
 *   4. 한 화면에 짙은 단추가 하나다
 *   5. 빈 카드 0
 *   6. 손님 화면에 공개 전 배포 문구 0
 *   7. 결과지에 금지 표현 0 (지원서에 바로 쓸 수 있는 · 검증 · 적합 · 강점)
 *   8. 로그아웃하고 다시 들어와도 이어진다
 *
 * **열쇠는 이 자리에서 만들고 해시만 남긴다.** 저장소에도 문서에도 로그에도
 * 적지 않는다.
 *
 *   UI_BASE=http://127.0.0.1:3100 npx tsx scripts/v3-loop-check.ts
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  BASE as B, cloneFinished, fillExperience, gateCreds, login, makeStudent,
} from "./_loop-fixture";
import { chromium, type Browser } from "playwright";

const LOGIN = "v3loop@example.com";

/**
 * 결과지와 작업공간에서 **쓰지 않기로 한 말**(규격 §11).
 *
 * 이 검사가 재지 않은 것을 단정하는 문장을 막는다. 부정문은 지나간다:
 * 규격이 막는 것은 결론이지 그 결론을 막는 문장이 아니다.
 */
const BANNED: { re: RegExp; why: string }[] = [
  { re: /지원서에 바로 쓸 수 있는/, why: "바로 쓸 수 있다고 단정한다" },
  { re: /검증(됐|되었|된) /, why: "검증했다고 단정한다" },
  { re: /적합(합니다|한 영역|도가 높)/, why: "적합을 판정한다" },
  { re: /높은 가능성|합격 (가능성|확률)/, why: "가능성을 말한다" },
  { re: /강점(입니다|이 있습니다|을 발휘)/, why: "강점을 단정한다" },
  { re: /확정(됐|되었)습니다/, why: "확정했다고 단정한다" },
];

let pass = 0, fail = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? ` — ${d}` : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? ` — ${d}` : ""}`); }
}




async function main(): Promise<void> {
  const stu = await makeStudent(LOGIN);
  const attemptId = await cloneFinished(stu.id);
  const browser: Browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  const gate = gateCreds();
  const opts = gate ? { httpCredentials: gate } : {};

  try {
    const ctx = await browser.newContext({ ...opts, viewport: { width: 1440, height: 900 } });
    const p = await login(ctx, LOGIN, stu.pw);

    /* ── 1. 홈의 주된 단추가 다음 쪽을 연다 ─────────────────────── */
    console.log("\n── 1. 홈의 주된 단추");
    await p.goto(`${B}/me`, { waitUntil: "networkidle" });
    const mains = await p.locator(".cm-btn.is-primary").count();
    ok("홈에 짙은 단추가 하나다", mains === 1, `${mains}개`);
    const href = await p.locator(".cm-btn.is-primary").first()
      .getAttribute("href").catch(() => null);
    const isForm = await p.locator("form .cm-btn.is-primary").count();
    if (href) {
      const r = await p.goto(B + href, { waitUntil: "networkidle" });
      ok("홈의 짙은 단추가 실제 쪽을 연다", r?.status() === 200, `${href} ${r?.status()}`);
    } else {
      ok("홈의 짙은 단추가 폼이다 (이어하기)", isForm > 0);
    }

    /* ── 2. 막다른 길 ───────────────────────────────────────────── */
    console.log("\n── 2. 막다른 길");
    const PAGES = ["/me", "/me/state", "/me/next", "/me/experience",
      "/me/experience/new", "/me/results", "/me/explore", "/me/region",
      "/me/apply", "/me/track", "/me/recompute", "/cores", "/my"];
    const dead: string[] = [];
    const seen = new Set<string>();
    for (const path of PAGES) {
      await p.goto(B + path, { waitUntil: "networkidle" });
      const hrefs = await p.$$eval("a[href]", (as) =>
        as.map((a) => a.getAttribute("href") ?? "")
          .filter((h) => h.startsWith("/") && !h.startsWith("//")));
      for (const h of hrefs) {
        /* 종이를 만드는 길은 열어 보지 않는다. 한 번 열면 머리 없는
           브라우저가 뜨고, 그 비용이 이 검사의 뜻과 상관이 없다 */
        if (h.includes("/pdf") || seen.has(h)) continue;
        seen.add(h);
        const r = await p.request.get(B + h, { timeout: 30_000 }).catch(() => null);
        const s = r ? r.status() : 0;
        if (s >= 400) dead.push(`${path} → ${h} (${s})`);
      }
    }
    ok("작업공간 안에 막다른 길이 없다", dead.length === 0,
      dead.length ? dead.slice(0, 3).join(" / ") : `링크 ${seen.size}개`);

    /* ── 3. 한 화면에 짙은 단추 하나 · 빈 카드 0 ────────────────── */
    console.log("\n── 3. 짙은 단추와 빈 카드");
    const many: string[] = [];
    const empties: string[] = [];
    for (const path of PAGES) {
      await p.goto(B + path, { waitUntil: "networkidle" });
      const n = await p.locator(".cm-btn.is-primary").count();
      if (n > 1) many.push(`${path}:${n}`);
      /* 머리글만 있고 속이 빈 칸. **점선 테두리에 `아직 없습니다` 만
         적힌 칸이 넷까지 서면** 읽는 사람은 결과가 덜 만들어진 줄 안다 */
      const blank = await p.$$eval(".cm-card, .cm-pane", (els) =>
        els.filter((e) => {
          const t = (e.textContent ?? "").replace(/\s+/g, "");
          const head = (e.querySelector("h2, h3")?.textContent ?? "").replace(/\s+/g, "");
          return t.length - head.length < 4;
        }).length);
      if (blank > 0) empties.push(`${path}:${blank}`);
    }
    ok("한 화면에 짙은 단추가 하나다", many.length === 0,
      many.length ? many.join(" / ") : `쪽 ${PAGES.length}자리`);
    ok("빈 카드가 없다", empties.length === 0,
      empties.length ? empties.join(" / ") : `쪽 ${PAGES.length}자리`);

    /* ── 4. 행동 루프: 경험 → 저장 → 달라진 것 → 현재 상태 ──────── */
    console.log("\n── 4. 행동 루프");
    const title = `루프 점검 ${randomBytes(3).toString("hex")}`;
    /* **폼을 여기서 적지 않는다.** 세 걸음짜리 폼을 누르는 줄을 검사마다
       따로 들고 있으면 걸음이 넷이 되는 날 한 곳만 고쳐지고, 가린 판의
       칸은 눌리지 않아 **아무것도 골리지 않은 채로 저장된다** */
    const checked = await fillExperience(p, title);
    ok("기술영역이 실제로 골라졌다", checked > 0, `${checked}개`);

    const afterSave = new URL(p.url()).pathname;
    ok("저장하면 달라진 것을 먼저 보여 준다", afterSave === "/me/recompute", afterSave);

    const planTxt = await p.evaluate(() => document.body.innerText);
    ok("달라진 것 화면이 무엇을 할지 말한다",
      /더하|달라|바뀌|아직/.test(planTxt), planTxt.replace(/\s+/g, " ").slice(0, 50));

    const applyBtn = p.locator('form button[type="submit"]');
    if (await applyBtn.count()) {
      await applyBtn.first().click({ force: true }).catch(() => undefined);
      await p.waitForLoadState("networkidle").catch(() => undefined);
      await p.waitForTimeout(1200);
      const at = new URL(p.url()).pathname;
      ok("반영하면 현재 상태로 이어진다", at === "/me/state", at);
      const t = await p.evaluate(() => document.body.innerText);
      ok("달라진 수를 그 자리에서 적는다", /더했습니다/.test(t),
        /반영했습니다/.test(t) ? "적는다" : "안 적는다");
    } else {
      /* 반영할 거리가 없으면 그 사실을 적는 것이 맞다 */
      ok("반영할 거리가 없으면 그 사실을 적는다", /아직|없습니다/.test(planTxt));
      ok("반영할 거리가 없어도 나갈 길이 있다",
        (await p.locator('a[href^="/me"]').count()) > 0);
    }

    await p.goto(`${B}/me`, { waitUntil: "networkidle" });
    const home = await p.evaluate(() => document.body.innerText);
    ok("홈이 최근 경험에 방금 적은 것을 적는다", home.includes(title),
      home.includes(title) ? title : "홈에 없다");

    /* ── 5. 결과지의 금지 표현 ──────────────────────────────────── */
    console.log("\n── 5. 금지 표현");
    if (!attemptId) {
      ok("볼 결과지가 있다", false, "굳은 결과가 하나도 없다");
    } else {
      /* 남의 응시는 열리지 않는다. 그래서 **쪽을 열지 않고 글만** 본다:
         결과 문장을 만드는 자리는 `text.ko.ts` 이고 그 파일을 읽는다 */
      /* **주석을 걷어 내고 본다.** 이 저장소는 `왜 그렇게 쓰지 않는가` 를
         주석으로 남기는 쪽을 택했고, 그 기록에는 쓰지 않기로 한 말이
         그대로 들어 있다. 세면 맞는 기록을 지우라고 요구하게 된다 */
      const ko = readFileSync(
        resolve(process.cwd(), "src/lib/me-v3/result/text.ko.ts"), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .split("\n").filter((l) => !/^\s*(\/\/|\*)/.test(l)).join("\n");
      const hits = BANNED.filter((b) => b.re.test(ko));
      ok("결과 문장에 금지 표현이 없다", hits.length === 0,
        hits.length ? hits.map((h) => h.why).join(" / ") : `규칙 ${BANNED.length}가지`);
    }

    /* ── 6. 손님 화면 ───────────────────────────────────────────── */
    console.log("\n── 6. 손님 화면");
    const guest = await browser.newContext(opts);
    const gp = await guest.newPage();
    const bad: string[] = [];
    for (const path of ["/", "/pricing", "/product", "/login", "/signup", "/support"]) {
      const r = await gp.goto(B + path, { waitUntil: "networkidle" }).catch(() => null);
      if (!r || r.status() >= 400) continue;
      const t = await gp.evaluate(() => document.body.innerText);
      if (/공개 전|시험 배포|staging/i.test(t)) bad.push(path);
    }
    ok("손님 화면에 공개 전 배포 문구가 없다", bad.length === 0, bad.join(" / "));
    await guest.close();

    /* ── 7. 로그아웃하고 다시 들어와도 이어진다 ─────────────────── */
    console.log("\n── 7. 다시 들어오기");
    await ctx.clearCookies();
    const back = await p.goto(`${B}/me`, { waitUntil: "networkidle" });
    const landed = new URL(p.url()).pathname;
    ok("쿠키가 없으면 로그인으로 보낸다",
      landed.startsWith("/login") || back?.status() === 401, landed);
    const p2 = await login(ctx, LOGIN, stu.pw);
    await p2.goto(`${B}/me/experience`, { waitUntil: "networkidle" });
    const again = await p2.evaluate(() => document.body.innerText);
    ok("다시 들어오면 적어 둔 경험이 그대로 있다", again.includes(title),
      again.includes(title) ? title : "사라졌다");
    await ctx.close();
  } finally {
    await browser.close();
  }

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  if (fail) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
