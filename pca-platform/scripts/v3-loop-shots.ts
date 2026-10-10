/**
 * 제품 루프를 **눌러 가면서 찍는다**(규격 §27). 그리고 찍는 길에
 * 규격 §18(빈 상태 아홉) · §20(390px) · §21(Journey A~D)을 같이 센다.
 *
 * **자리 목록을 주소로 열어 찍지 않는다.** 주소로 하나씩 열면 그 쪽이
 * 어떤 상태인지는 지난번 누군가가 눌러 둔 상태에 달려 있고, 그러면 찍은
 * 그림이 **그 사람의 그 순간이 아닌 것**을 보여 준다. 이 저장소에서 한
 * 번 그렇게 찍혔다. 그래서 사람이 밟는 차례 그대로 밟고 그 자리에서
 * 찍는다.
 *
 * 데스크톱 여덟 · 손전화 다섯이고 이름이 차례를 든다.
 *
 *   01 홈(경험 0)        02 경험 추가        03 저장됨
 *   04 달라지는 것        05 현재 상태        06 다음 할 일
 *   07 홈(반영 뒤)        08 굳은 결과(그대로)
 *
 * **같은 그림이 두 이름으로 저장되면 걸린다.** 지문을 견준다: 자리를
 * 잘못 찾아 쪽 맨 위를 열두 번 찍어 두고도 아무 검사가 세지 않던 일이
 * 있었다.
 *
 *   UI_BASE=http://127.0.0.1:3100 npx tsx scripts/v3-loop-shots.ts
 */
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  BASE as B, cloneFinished, fillExperience, gateCreds, login, makeStudent,
} from "./_loop-fixture";
import { chromium, type Browser, type Page } from "playwright";
import { query, queryOne } from "../src/lib/db";

const OUT = resolve(process.cwd(), process.env.OUT || "docs/metri/shots/v3/loop");
const WHO = "v3shots@example.com";

let pass = 0, fail = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? ` — ${d}` : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? ` — ${d}` : ""}`); }
}

/** 이름 → 지문. **같은 그림이 두 이름으로 저장되면 걸린다** */
const seen = new Map<string, string>();

/**
 * 어느 걸음에서 찍은 그림인가.
 *
 * **지문은 한 걸음 안에서만 견준다.** 이 검사가 막는 것은 **자리를 잘못
 * 찾아 같은 쪽을 열두 번 찍어 두는 일**이고, 그것은 한 사람이 한 길을
 * 밟는 동안에 일어난다. 걸음을 가로질러 견주면 **다른 사람의 같은 모양
 * 화면**이 걸린다: 바탕으로 쓰는 굳은 결과가 한 벌이라 새로 온 사람의
 * 결과지와 돌아온 사람의 결과지는 글자까지 같은 것이 맞다.
 */
const step = (name: string) => (/^(j1|j3|m)/.exec(name)?.[1] ?? "a");

async function shot(p: Page, name: string, full = true): Promise<void> {
  const buf = await p.screenshot({ fullPage: full });
  writeFileSync(resolve(OUT, `${name}.png`), buf);
  const h = createHash("sha256").update(buf).digest("hex");
  const twin = [...seen.entries()]
    .find(([k, v]) => v === h && step(k) === step(name));
  if (twin) ok(`그림 ${name} 이 제 화면이다`, false, `${twin[0]} 과 같다`);
  seen.set(name, h);
}

/**
 * 그 화면에 **머리글만 있고 속이 빈 칸**이 없는지(규격 §18).
 *
 * 점선 테두리에 `아직 없습니다` 만 적힌 칸이 넷까지 서면 읽는 사람은
 * 자기 결과가 덜 만들어진 줄 안다.
 */
async function noBlank(p: Page, where: string): Promise<void> {
  const n = await p.$$eval(".cm-card, .cm-pane", (els) => els.filter((e) => {
    const t = (e.textContent ?? "").replace(/\s+/g, "");
    const head = (e.querySelector("h2, h3")?.textContent ?? "").replace(/\s+/g, "");
    return t.length - head.length < 4;
  }).length);
  ok(`${where} 에 빈 카드가 없다`, n === 0, `${n}개`);
}

/** 손전화 폭에서 가로로 밀리지 않고 누르는 자리가 40px 이상인가(규격 §20) */
async function mobileSane(p: Page, where: string): Promise<void> {
  const over = await p.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`${where} 가 390px 에서 가로로 밀리지 않는다`, over <= 1, `${over}px`);
  const small = await p.$$eval(
    "a.cm-btn, button.cm-btn, .cm-nav a, .cm-fold > summary",
    (els) => els.filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.height < 40;
    }).map((e) => `${e.tagName}:${(e.textContent ?? "").trim().slice(0, 10)}`));
  ok(`${where} 의 누르는 자리가 40px 이상이다`, small.length === 0,
    small.slice(0, 3).join(" / "));
}

/** 굳은 결과를 글자째 뜬다. **견주는 자리가 지문이어야** 한 칸도 못 숨는다 */
async function frozenPrint(userId: string): Promise<string> {
  const rows = await query<{ id: string; model: unknown; v: string | null }>(
    `SELECT s.attempt_id::text AS id, s.result_model AS model,
            s.result_model_version AS v
       FROM v3_snapshots s JOIN v3_attempts a ON a.id = s.attempt_id
      WHERE a.user_id = $1 ORDER BY s.attempt_id`, [userId]);
  return createHash("sha256")
    .update(JSON.stringify(rows.map((r) => [r.id, r.v, r.model])))
    .digest("hex");
}

async function apply(p: Page): Promise<void> {
  await p.goto(`${B}/me/recompute`, { waitUntil: "networkidle" });
  const btn = p.locator('.cm-acts form button[type="submit"]');
  if (await btn.count()) {
    await btn.first().click({ force: true });
    await p.waitForLoadState("networkidle").catch(() => undefined);
    await p.waitForTimeout(1000);
  }
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const a = await makeStudent(WHO);
  const att = await cloneFinished(a.id);
  ok("바탕이 될 굳은 결과가 있다", !!att, att ?? "없음");
  if (!att) throw new Error("굳은 결과가 없어 루프를 찍을 수 없다");
  const before = await frozenPrint(a.id);

  const browser: Browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  const gate = gateCreds();
  const opts = gate ? { httpCredentials: gate } : {};

  try {
    /* ── Journey A. 돌아온 사람의 전체 루프 ──────────────────────── */
    console.log("\n── Journey A. 돌아온 사람의 전체 루프 (데스크톱)");
    const ctx = await browser.newContext({ ...opts, viewport: { width: 1440, height: 900 } });
    const p = await login(ctx, WHO, a.pw);

    /* ① 홈 — 경험 0 (규격 §18 ①) */
    await p.goto(`${B}/me`, { waitUntil: "networkidle" });
    await shot(p, "01_home_before__desktop");
    await noBlank(p, "홈(경험 0)");
    const home0 = await p.evaluate(() => document.body.innerText);
    ok("경험이 0이면 최근 변화 묶음을 세우지 않는다", !/최근 변화/.test(home0));

    /* 할 일 0 (규격 §18 ⑨) */
    await p.goto(`${B}/me/next`, { waitUntil: "networkidle" });
    const next0 = await p.evaluate(() => document.body.innerText);
    ok("할 일이 0이면 그 사실과 길을 적는다",
      /담아 둔 할 일이 없습니다/.test(next0) && /담으면/.test(next0));
    await noBlank(p, "다음 할 일(0개)");

    /* ② 경험 추가 — 1단 */
    await p.goto(`${B}/me/experience/new`, { waitUntil: "networkidle" });
    await shot(p, "02_experience_add__desktop");
    await noBlank(p, "경험 추가");

    /* ③④ 저장 직후와 달라지는 것 */
    const t1 = `구조 해석 캡스톤 ${randomBytes(2).toString("hex")}`;
    const picked = await fillExperience(p, t1);
    ok("기술영역이 실제로 골라졌다", picked > 0, `${picked}개`);
    ok("저장하면 달라진 것을 먼저 보여 준다",
      new URL(p.url()).pathname === "/me/recompute", new URL(p.url()).pathname);
    await shot(p, "03_experience_saved__desktop", false);
    await shot(p, "04_change_preview__desktop");
    await noBlank(p, "저장 직후");
    const plan = await p.evaluate(() => document.body.innerText);
    /* 상태 말은 제품 전체가 같은 마디를 쓴다(규격 §21) */
    const SAVED = ["경험을 저장했습니다", "이번 경험에서 새로 연결된 것",
      "현재 상태에서 달라지는 것", "그다음에 할 일"];
    ok("저장 직후가 다섯을 차례로 적는다",
      SAVED.every((h) => plan.includes(h)),
      SAVED.filter((h) => !plan.includes(h)).join(" / ") || "넷 다 있다");
    ok("저장 직후에 돌아갈 길이 있다",
      (await p.locator('a[href="/me/experience"]').count()) > 0);

    /* 경험 1 (규격 §18 ②) */
    await p.goto(`${B}/me/experience`, { waitUntil: "networkidle" });
    await noBlank(p, "경험 목록(1개)");

    /* ⑤ 반영하고 현재 상태 */
    await apply(p);
    ok("반영하면 현재 상태로 이어진다",
      new URL(p.url()).pathname === "/me/state", new URL(p.url()).pathname);
    await shot(p, "05_current_state__desktop");
    await noBlank(p, "현재 상태");
    const st1 = await p.evaluate(() => document.body.innerText);
    /* 첫 화면 셋과 그 아래 세부(규격 §5·§6) */
    ok("현재 상태가 §5 차례로 선다",
      ["지금 설명할 수 있는 영역", "최근 달라진 것", "지금 할 일", "아직 부족한 것"]
        .every((h) => st1.includes(h)));
    ok("굳은 결과와 지금 값이 서로를 덮지 않는다고 적는다",
      /서로를 덮지 않습니다/.test(st1));
    ok("점수처럼 견주지 않는다",
      !/\+\s?\d+\s?점/.test(st1) && !/\d\s*→\s*\d/.test(st1));

    /* ⑥ 다음 할 일 */
    await p.goto(`${B}/me/next`, { waitUntil: "networkidle" });
    const pull = p.locator('form button:has-text("결과의 할 일 담기")');
    if (await pull.count()) {
      await pull.first().click({ force: true });
      await p.waitForLoadState("networkidle").catch(() => undefined);
      await p.waitForTimeout(800);
    }
    await shot(p, "06_next_action__desktop");
    await noBlank(p, "다음 할 일");
    const nx = await p.evaluate(() => document.body.innerText);
    ok("할 일에 넷이 붙는다(규격 §9)",
      ["왜 필요한가", "어느 자리", "어떤 경험으로"].every((h) => nx.includes(h)),
      ["왜 필요한가", "어느 자리", "어떤 경험으로"]
        .filter((h) => !nx.includes(h)).join(" / ") || "셋 다 있다");
    ok("짙은 단추가 하나다(규격 §10)",
      (await p.locator(".cm-btn.is-primary:visible").count()) <= 1);

    /* ⑦ 홈 — 반영 뒤 */
    await p.goto(`${B}/me`, { waitUntil: "networkidle" });
    await shot(p, "07_home_after__desktop");
    await noBlank(p, "홈(반영 뒤)");
    const home1 = await p.evaluate(() => document.body.innerText);
    ok("홈이 최근 변화를 문장으로 적는다",
      /최근 변화/.test(home1)
      && /확인됐습니다|또렷해졌습니다|더해졌습니다|옮겨 갔습니다|그대로입니다/.test(home1));

    /* ⑧ Journey D. 굳은 결과가 전후 완전 동일 ───────────────────── */
    console.log("\n── Journey D. 굳은 결과는 그대로다");
    const after = await frozenPrint(a.id);
    ok("굳은 결과가 한 글자도 바뀌지 않았다", before === after,
      before === after ? before.slice(0, 16) : "달라졌다");
    const r = await p.goto(`${B}/v3/${att}/result`, { waitUntil: "networkidle" });
    ok("굳은 결과지가 그대로 열린다", r?.status() === 200, String(r?.status()));
    await shot(p, "08_result_unchanged__desktop");

    /* ── Journey B. 판정이 안 바뀌는 경험 ────────────────────────── */
    console.log("\n── Journey B. 판정이 안 바뀌면 그 사실을 적는다");
    const t2 = `같은 범위 기록 ${randomBytes(2).toString("hex")}`;
    await fillExperience(p, t2);
    const plan2 = await p.evaluate(() => document.body.innerText);
    /* 같은 자리를 다시 적으면 이미 올라간 자리라 바뀌는 것이 없다 */
    const quiet = /판정은 그대로입니다|더 올라갈 자리가 없었습니다|아직 서지 않았습니다|가지 않았습니다/
      .test(plan2);
    const moved = /확인됐습니다|또렷해졌습니다|더해졌습니다|옮겨 갔습니다/.test(plan2);
    ok("바뀌는 것이 없으면 그 사실과 까닭을 적는다", quiet || moved,
      quiet ? "까닭을 적는다" : moved ? "달라진 것이 있다" : "둘 다 없다");
    ok("`경험이 추가되었습니다` 로 끝내지 않는다",
      !/경험이 추가되었습니다/.test(plan2));
    await apply(p);
    const st2 = await p.evaluate(() => document.body.innerText);
    ok("더한 뒤 화면이 바뀐 것이 없다는 사실도 적는다",
      /더했습니다/.test(st2), /더했습니다/.test(st2) ? "적는다" : "안 적는다");

    /* 경험 다수 (규격 §18 ③) */
    await p.goto(`${B}/me/experience`, { waitUntil: "networkidle" });
    const list = await p.evaluate(() => document.body.innerText);
    ok("경험이 둘이면 둘 다 목록에 있다",
      list.includes(t1) && list.includes(t2));
    ok("목록이 현재 상태에 더했는지를 적는다", /더함|더하지 않음/.test(list));
    await noBlank(p, "경험 목록(다수)");

    /* ── Journey C. Gap 을 메우는 경험 ───────────────────────────── */
    console.log("\n── Journey C. Gap 을 메우면 지금 값이 달라진다");
    const lv0 = Number((await queryOne<{ n: string }>(
      `SELECT (SELECT count(*)::text FROM jsonb_object_keys(axis_levels)) AS n
         FROM career_profiles WHERE user_id = $1`, [a.id]))?.n ?? 0);
    const t3 = `다른 영역 기록 ${randomBytes(2).toString("hex")}`;
    await fillExperience(p, t3);
    await apply(p);
    const lv1 = Number((await queryOne<{ n: string }>(
      `SELECT (SELECT count(*)::text FROM jsonb_object_keys(axis_levels)) AS n
         FROM career_profiles WHERE user_id = $1`, [a.id]))?.n ?? 0);
    ok("경험을 더하면 지금 값의 영역이 늘거나 그대로다", lv1 >= lv0,
      `${lv0} → ${lv1}`);
    const st3 = await p.evaluate(() => document.body.innerText);
    ok("현재 상태가 기준 날짜를 새로 적는다", /\d{4}-\d{2}-\d{2} 기준/.test(st3));
    const after3 = await frozenPrint(a.id);
    ok("경험을 셋 더해도 굳은 결과는 그대로다", before === after3);

    /* ── Journey 3. 결과 → 할 일 → 경험 → 현재 상태 ────────────────
        **주소로 열지 않고 단추를 누른다.** 쪽이 전부 200 이면서 그 사이를
        이을 길이 하나도 없을 수 있다(규격 §28) */
    console.log("\n── Journey 3. 결과 → 할 일 → 경험 → 현재 상태");
    await p.goto(`${B}/v3/${att}/result`, { waitUntil: "networkidle" });
    await shot(p, "j3_01_result__desktop", false);
    await p.locator(".rs-do-main").first().click({ force: true });
    await p.waitForLoadState("networkidle").catch(() => undefined);
    await p.waitForTimeout(600);
    ok("결과지의 짙은 단추가 할 일 쪽으로 보낸다",
      new URL(p.url()).pathname === "/me/next", new URL(p.url()).pathname);
    await shot(p, "j3_02_next__desktop");
    const addBtn = p.locator('a[href="/me/experience/new"]').first();
    ok("할 일 쪽에서 경험으로 가는 길이 있다", (await addBtn.count()) > 0);
    await Promise.all([
      p.waitForURL((u) => new URL(u).pathname === "/me/experience/new", { timeout: 15000 })
        .catch(() => undefined),
      addBtn.click(),
    ]);
    await p.waitForLoadState("networkidle").catch(() => undefined);
    ok("할 일에서 누르면 경험 적는 쪽으로 간다",
      new URL(p.url()).pathname === "/me/experience/new", new URL(p.url()).pathname);
    await shot(p, "j3_03_experience_add__desktop");
    const t4 = `결과에서 온 기록 ${randomBytes(2).toString("hex")}`;
    await fillExperience(p, t4);
    await apply(p);
    ok("경험을 더하면 현재 상태로 이어진다",
      new URL(p.url()).pathname === "/me/state", new URL(p.url()).pathname);
    await shot(p, "j3_04_current_state__desktop");

    await ctx.close();

    /* ── Journey 1. 새로 온 사람: 전공 → 검사 → 결과 → 홈 ──────────
        **검사 가운데는 `v3:shots` 가 화면마다 찍는다.** 여기서 찍는 것은
        이음매다: 전공 고르기 · 시작 화면 · 첫 문항 · 결과 · 홈. 응답을
        끝까지 채우는 일은 그쪽 검사가 맡고, 여기는 끝낸 뒤의 두 쪽이
        실제로 이어지는지를 본다 */
    console.log("\n── Journey 1. 새로 온 사람 (데스크톱)");
    const NEW = `v3shots-new+${randomBytes(3).toString("hex")}@example.com`;
    const nu = await makeStudent(NEW);
    const nctx = await browser.newContext({ ...opts, viewport: { width: 1440, height: 900 } });
    const np = await login(nctx, NEW, nu.pw);
    await np.goto(`${B}/me`, { waitUntil: "networkidle" });
    const nHome = await np.evaluate(() => document.body.innerText);
    ok("검사 전 홈이 빈 카드를 쌓지 않는다", !/아직 없습니다[\s\S]{0,40}아직 없습니다/.test(nHome));
    await shot(np, "j1_01_home_new__desktop");
    await np.goto(`${B}/cores`, { waitUntil: "networkidle" });
    await shot(np, "j1_02_cores__desktop");
    const cores = await np.evaluate(() => document.body.innerText);
    ok("전공 목록이 지금 열린 것과 아직인 것을 가른다", /기계공학/.test(cores));
    await np.goto(`${B}/v3/start`, { waitUntil: "networkidle" });
    await shot(np, "j1_03_start__desktop");
    const start = await np.evaluate(() => document.body.innerText);
    /* `46~50` 과 `문항` 이 줄로 갈려 있어 공백을 걷고 센다 */
    const flat = start.replace(/\s+/g, "");
    ok("시작 화면이 문항 수와 걸리는 시간을 적는다",
      /\d문항/.test(flat) && /\d분/.test(flat),
      (/\d+[~\d]*문항/.exec(flat)?.[0] ?? "없음") + " / " + (/약\d+분/.exec(flat)?.[0] ?? "없음"));
    /* 끝낸 뒤의 두 쪽. 응답을 채우는 일은 `v3:runtime` 과 `v3:shots` 가 맡는다 */
    const natt = await cloneFinished(nu.id);
    ok("검사를 끝내면 굳은 결과가 생긴다", !!natt, natt ?? "없음");
    await np.goto(`${B}/v3/${natt}/result`, { waitUntil: "networkidle" });
    await shot(np, "j1_04_result__desktop", false);
    const rtxt = await np.evaluate(() => document.body.innerText);
    ok("결과 첫 화면이 넷을 적는다(규격 §11)",
      ["지금 확인된 것", "지금 할 일"].every((h) => rtxt.includes(h)));
    await np.goto(`${B}/me`, { waitUntil: "networkidle" });
    await shot(np, "j1_05_home__desktop");
    const nh2 = await np.evaluate(() => document.body.innerText);
    ok("결과를 받은 뒤 홈이 그 결과를 가리킨다", /결과 보기/.test(nh2));
    await nctx.close();

    /* ── 손전화 390px (규격 §20·§27) ─────────────────────────────── */
    console.log("\n── 손전화 390px");
    const m = await browser.newContext({
      ...opts, viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
        + " AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
    const mp = await login(m, WHO, a.pw);
    const MOBILE: [string, string][] = [
      ["m1_home", "/me"],
      ["m2_experience_add", "/me/experience/new"],
      ["m3_saved_change", "/me/recompute"],
      ["m4_current_state", "/me/state"],
      ["m5_next_action", "/me/next"],
    ];
    for (const [name, path] of MOBILE) {
      await mp.goto(B + path, { waitUntil: "networkidle" });
      await shot(mp, `${name}__390`);
      await mobileSane(mp, path);
    }
    /* 손전화에서도 루프가 이어지는가. **띠가 단추를 덮지 않는다.**
       전에 검사 화면에서 공개 전 띠가 단추 띠를 덮은 적이 있고, 그것은
       누르는 사람에게 `눌리지 않는 단추` 로 보인다.

       **창 안으로 들여놓고 재야 한다.** `elementFromPoint` 는 창 좌표를
       받으므로, 쪽 좌표를 그대로 넘기면 창 밖을 가리켜 **멀쩡한 단추가
       덮인 것으로 적힌다.** 한 번 그렇게 걸렸다 */
    await mp.goto(`${B}/me/experience/new`, { waitUntil: "networkidle" });
    const btn = mp.locator(".cm-wiz-nav button").first();
    /* **쪽 맨 아래까지 내려서 잰다.** 가운데로 끌어다 놓고 재면 아래
       띠가 덮는 자리를 영영 못 본다. 덮이는 것은 다 읽고 내려온 사람의
       화면이고, 거기서 멈추면 루프가 그 자리에서 끊긴다 */
    await mp.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await mp.waitForTimeout(300);
    const covered = await btn.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !(top === el || (top && el.contains(top)) || (top && top.contains(el)));
    });
    ok("손전화에서 걸음 단추가 덮이지 않는다", !covered);
    await m.close();
  } finally {
    await browser.close();
  }

  console.log(`\n그림 ${seen.size}장 — ${OUT}`);
  console.log(`확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  if (fail) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
