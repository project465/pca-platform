/**
 * 파일럿 예행 세 벌. **실제 브라우저로 끝까지 눌러 본다.**
 *
 * 묻는 것은 "코드가 그렇게 짜여 있는가" 가 아니고 "그 자리에서 그렇게
 * 도는가" 다. 그래서 자리 목록을 미리 만들어 두지 않고, 돌릴 때마다
 * 초대를 새로 찍고 사람을 새로 만들어 링크부터 누른다.
 *
 *   초대 링크 → 로그인 → 등록 → 검사 → 닫기 → 이어서 → 끝 → 결과
 *   → 종이 → 의견 → 운영 표
 *
 * 세 벌이 서로 다른 처지다. BASIC 학부 · STANDARD 석사 · PRO 박사·포닥.
 * 한 벌만 돌리면 등급마다 다른 화면이 서는지 알 수 없다.
 *
 * **기기도 세 벌이다.** 데스크톱 크로뮴 · Android Chrome · iPhone.
 * iPhone 은 **WebKit 엔진이 아니다**: 이 컨테이너에서 WebKit 을 내려받지
 * 못해 크로뮴에 iOS 화면 크기와 터치를 씌운 것이고, 그래서 Safari 전용
 * 탈(스크롤 튐 · 100vh · 입력 확대)은 **여기서 걸리지 않는다.** 그것은
 * 사람이 실기기에서 한 번 봐야 한다.
 *
 * **비밀번호를 적어 두지 않는다.** 돌릴 때마다 만들어 쓰고 버린다.
 *
 *   npm run v3:pilot:dry                       # 세 벌 · 세 기기
 *   DRY=std UI_BASE=http://127.0.0.1:3100 npm run v3:pilot:dry
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of (() => {
  try { return readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n"); }
  catch { return [] as string[]; }
})()) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { createInvites, inviteLink, type PilotTier } from "../src/lib/me-v3/pilot/enroll";

if ((process.env.APP_ENV ?? "").toLowerCase() === "production") {
  console.error("운영에서는 돌리지 않습니다.");
  process.exit(2);
}

const B = process.env.UI_BASE ?? "http://127.0.0.1:3100";
const OUT = "docs/metri/shots/v3dry";
const ADMIN = { id: "admin", pw: "pca-dev-admin-1234" };

type Run = {
  key: string; tier: PilotTier; stage: string; field: string | null;
  ko: string; device: "desktop" | "android" | "iphone";
};

const RUNS: Run[] = [
  { key: "dry1", tier: "BASIC", stage: "bachelor", field: null,
    ko: "Dry 1 · BASIC 학부", device: "desktop" },
  { key: "dry2", tier: "STANDARD", stage: "master", field: "STEM",
    ko: "Dry 2 · STANDARD 석사", device: "android" },
  { key: "dry3", tier: "PRO", stage: "postdoc", field: "STEM",
    ko: "Dry 3 · PRO 박사후연구원", device: "iphone" },
];

let fail = 0, pass = 0;
const log: string[] = [];
function ok(n: string, good: boolean, d = ""): void {
  const line = `  ${good ? "통과" : "걸림"}  ${n}${d ? " — " + d : ""}`;
  if (good) pass += 1; else fail += 1;
  console.log(line);
  log.push(line);
}

/** 내부 코드가 화면에 새는가. 가명 `V3-XXXXX` 만 빼고 본다 */
const INTERNAL = [
  /\bTD\d{2}\b/, /\bJ[1-8]\b/, /\bZ[1-4]_[A-Z_]+\b/,
  /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/,
  /\b(?:undefined|null|NaN|TODO|TBD)\b/,
];
function leaks(text: string): string[] {
  const out: string[] = [];
  for (const re of INTERNAL) {
    for (const m of text.match(new RegExp(re, "g")) ?? []) {
      if (/^V3-[A-Z0-9]{5}$/.test(m)) continue;
      if (["BASIC", "STANDARD", "PRO"].includes(m)) continue;
      out.push(m);
    }
  }
  return [...new Set(out)];
}

async function makeUser(key: string): Promise<{ login: string; pw: string }> {
  const login = `v3dry-${key}@example.com`;
  const pw = randomBytes(12).toString("base64url");
  const hash = await hashPassword(pw);
  /* 돌릴 때마다 처음부터. 지난번 응시가 남아 있으면 `이어서 하기` 가
     그 응시를 열고, 그러면 이번에 찍은 것이 지난번 상태다 */
  const had = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [login]);
  if (had) {
    await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [had.id]);
    await query(`DELETE FROM entitlements WHERE user_id = $1`, [had.id]);
    await query(`DELETE FROM v3_pilot_participants WHERE user_id = $1`, [had.id]);
    await query(
      `UPDATE users SET password_hash = $2, status = 'active', must_reset_pw = false
        WHERE id = $1`, [had.id, hash]);
    return { login, pw };
  }
  await query(
    `INSERT INTO users
       (login_id, email, display_name, password_hash, status, locale, is_demo, must_reset_pw)
     VALUES ($1,$1,'파일럿 예행',$2,'active','ko',TRUE,false)`, [login, hash]);
  return { login, pw };
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const only = (process.env.DRY ?? "").toLowerCase();
  const runs = only
    ? RUNS.filter((r) => r.key.includes(only) || r.tier.toLowerCase().startsWith(only))
    : RUNS;

  const { chromium, devices } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox"] });

  const seen: { code: string; attempt: string; tier: string }[] = [];

  for (const r of runs) {
    console.log(`\n${r.ko} · ${r.device}`);
    log.push(`\n### ${r.ko} · ${r.device}`);

    const { login, pw } = await makeUser(r.key);
    const [inv] = await createInvites(0, 1, `예행 ${r.key}`, r.tier);
    const url = inviteLink(B, inv.token);

    const base = r.device === "android" ? devices["Pixel 7"]
      : r.device === "iphone" ? devices["iPhone 14"]
        : { viewport: { width: 1440, height: 900 } };
    const ctx = await browser.newContext({
      ...base,
      httpCredentials: process.env.STAGING_BASIC_AUTH
        ? {
          username: process.env.STAGING_BASIC_AUTH.split(":")[0],
          password: process.env.STAGING_BASIC_AUTH.split(":").slice(1).join(":"),
        }
        : undefined,
    });
    const p = await ctx.newPage();
    const errs: string[] = [];
    p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
    p.on("response", (res) => {
      if (res.status() >= 500) errs.push(`${res.status()} ${new URL(res.url()).pathname}`);
    });

    /* 1. 초대 링크를 먼저 누른다. 로그인은 그 뒤에 나온다 */
    await p.goto(url, { waitUntil: "networkidle" });
    const atLogin = new URL(p.url()).pathname.startsWith("/login");
    ok(`${r.key} 초대 링크가 로그인으로 보낸다`, atLogin, p.url().replace(B, ""));

    await p.fill('input[name="identifier"]', login);
    await p.fill('input[name="password"]', pw);
    await p.click('button[type="submit"]');
    await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 30000 })
      .catch(() => {});

    /* 2. 로그인 뒤에 초대 링크를 한 번 더 누른다 — 받는 사람이 하는 일이다 */
    await p.goto(url, { waitUntil: "networkidle" });
    let text = await p.evaluate(() => document.body.innerText);
    const code = (/V3-[A-Z0-9]{5}/.exec(text) ?? [])[0] ?? "";
    ok(`${r.key} 가명이 선다`, /^V3-[A-Z0-9]{5}$/.test(code), code || text.slice(0, 60));
    ok(`${r.key} 초대가 준 가명과 같다`, code === inv.code, `${code} vs ${inv.code}`);

    /* 3. 등록 폼 */
    await p.selectOption('select[name="education_stage"]', r.stage);
    await p.fill('input[name="major_name"]', "기계공학");
    await p.selectOption('select[name="major_field"]', "STEM").catch(() => {});
    await p.selectOption('select[name="current_status"]', "enrolled").catch(() => {});
    await p.selectOption('select[name="experience_level"]',
      r.tier === "BASIC" ? "coursework" : "lab").catch(() => {});
    await p.selectOption('select[name="interest_area"]', "CAE").catch(() => {});
    await p.fill('input[name="career_interest"]', "완성차 구조해석");
    await Promise.all([
      p.waitForURL(/\/v3\/pilot\?ok=1/, { timeout: 30000 }).catch(() => {}),
      p.locator("form.rs-form button[type=\"submit\"]").click(),
    ]);
    await p.waitForLoadState("networkidle");
    ok(`${r.key} 등록이 적힌다`, /ok=1/.test(p.url()), p.url().replace(B, ""));
    await p.screenshot({ path: `${OUT}/${r.key}-01-join.png`, fullPage: true });

    /* 4. 검사 시작 — 등급은 초대가 준 이용권이 정한다 */
    await p.goto(`${B}/v3/start`, { waitUntil: "networkidle" });
    text = await p.evaluate(() => document.body.innerText);
    ok(`${r.key} 초대가 준 등급으로 선다`, text.includes(r.tier), text.slice(0, 80));

    /* 시작 화면은 고르기가 알약이다. `select` 가 아니다 */
    await pickByValue(p, "stage", r.stage);
    if (r.field) await pickByValue(p, "field", r.field);
    await Promise.all([
      p.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => {}),
      p.locator('button[type="submit"]').last().click({ force: true }),
    ]);
    await p.waitForLoadState("networkidle");
    const attempt = (/\/v3\/(\d+)/.exec(p.url()) ?? [])[1] ?? "";
    ok(`${r.key} 응시가 열린다`, /^\d+$/.test(attempt), p.url().replace(B, ""));

    /* 5. 절반쯤 풀고 창을 닫는다 */
    const half = await walk(p, 8);
    ok(`${r.key} 화면이 넘어간다`, half.screens >= 3, `화면 ${half.screens}`);
    await p.screenshot({ path: `${OUT}/${r.key}-03-mid.png`, fullPage: true });
    const answeredHalf = await count(attempt);
    await ctx.clearCookies();
    await p.goto(`${B}/v3/${attempt}`, { waitUntil: "networkidle" });
    ok(`${r.key} 남의 응시는 로그인 없이 열리지 않는다`,
      new URL(p.url()).pathname.startsWith("/login"), p.url().replace(B, ""));

    /* 6. 다시 들어와 이어서 한다 */
    await p.goto(`${B}/login`, { waitUntil: "networkidle" });
    await p.fill('input[name="identifier"]', login);
    await p.fill('input[name="password"]', pw);
    await p.click('button[type="submit"]');
    await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 30000 })
      .catch(() => {});
    await p.goto(`${B}/v3/start`, { waitUntil: "networkidle" });
    ok(`${r.key} 이어 볼 응시로 돌려보낸다`,
      new URL(p.url()).pathname === `/v3/${attempt}`, p.url().replace(B, ""));
    ok(`${r.key} 답한 것이 그대로 남아 있다`, (await count(attempt)) === answeredHalf,
      `${await count(attempt)} / ${answeredHalf}`);

    /* 7. 끝까지 */
    const rest = await walk(p, 400);
    const answered = await count(attempt);
    ok(`${r.key} 끝까지 간다`, rest.done, `화면 ${half.screens + rest.screens} · 응답 ${answered}`);
    /* 손가락으로 누르듯 눌러서 안 먹은 자리. **바닥 띠에 가린 보기다** */
    ok(`${r.key} 가려진 보기가 없다`, half.covered + rest.covered === 0,
      `${half.covered + rest.covered}자리`);

    const st = await queryOne<{ status: string }>(
      `SELECT status FROM v3_attempts WHERE id = $1`, [attempt]);
    ok(`${r.key} 제출된다`, st?.status !== "in_progress", st?.status ?? "없음");

    /* 8. 결과 */
    await p.goto(`${B}/v3/${attempt}/result`, { waitUntil: "networkidle" });
    text = await p.evaluate(() => document.body.innerText);
    ok(`${r.key} 결과가 열린다`, text.length > 400, `${text.length}자`);
    const bad = leaks(text);
    ok(`${r.key} 결과에 내부 코드가 없다`, bad.length === 0, bad.slice(0, 6).join(" "));
    const wide = await p.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`${r.key} 결과가 가로로 밀리지 않는다`, wide <= 1, `${wide}px`);
    await p.screenshot({ path: `${OUT}/${r.key}-05-result.png`, fullPage: true });

    /* 9. 종이 */
    const pdf = await ctx.request.get(`${B}/v3/${attempt}/result/pdf`);
    const body = pdf.ok() ? await pdf.body() : Buffer.alloc(0);
    ok(`${r.key} 종이가 뽑힌다`, pdf.ok() && body.length > 20000,
      `${pdf.status()} · ${Math.round(body.length / 1024)}KB`);
    /* 종이는 저장소에 두지 않는다. 한 벌이 1.5MB 이고 지어낸 응답이라
       다시 뽑으면 되는 것이다. 크기만 적어 둔다 */

    /* 10. 의견 — 결과를 본 뒤에만 열린다 */
    await p.goto(`${B}/v3/${attempt}/feedback`, { waitUntil: "networkidle" });
    ok(`${r.key} 의견 화면이 열린다`,
      new URL(p.url()).pathname.endsWith("/feedback"), p.url().replace(B, ""));
    text = await p.evaluate(() => document.body.innerText);
    const askedPrice = /14,900원/.test(text) && /21,900원/.test(text);
    ok(`${r.key} 두 값을 다 보여 준다`, askedPrice);
    const scales = await p.locator(".rs-scale").count();
    const picks = await p.locator(".rs-pick").count();
    ok(`${r.key} 척도와 고르는 칸이 둘 다 선다`, scales >= 5 && picks >= 3,
      `척도 ${scales} · 고르기 ${picks}`);
    await p.screenshot({ path: `${OUT}/${r.key}-06-feedback.png`, fullPage: true });

    /* 척도는 전부, 고르는 칸은 첫 보기, 자유입력은 한 칸만 — 빈칸도 남긴다 */
    for (let i = 0; i < scales; i += 1) {
      await p.locator(".rs-scale").nth(i).locator("label").nth(3).click();
    }
    for (let i = 0; i < picks; i += 1) {
      await p.locator(".rs-pick").nth(i).locator("label").first().click();
    }
    const areas = await p.locator("textarea").count();
    if (areas) await p.locator("textarea").first().fill("예행에서 적은 글입니다.");
    /* **보내기 전에 센다.** 보낸 뒤에 세면 쪽이 다시 뜨는 동안 0 이 나온다 */
    const hasAct = await p.locator('input[name="V15_ACTION_PICK"]').count();
    await Promise.all([
      p.waitForURL(/feedback\?ok=1/, { timeout: 30000 }).catch(() => {}),
      p.click('form.rs-fb button[type="submit"]'),
    ]);
    await p.waitForLoadState("networkidle");
    const fb = await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM v3_pilot_feedback WHERE attempt_id = $1`, [attempt]);
    ok(`${r.key} 의견이 적힌다`, Number(fb?.n ?? 0) >= scales, `${fb?.n ?? 0}칸`);
    /* 할 일을 고르는 칸은 결과지에 할 일이 있을 때만 선다. 없는 응시에서
       `안 적혔다` 로 세면 멀쩡한 자리가 빨갛게 보인다 */
    const picked = hasAct ? await queryOne<{ choice: string | null }>(
      `SELECT choice FROM v3_pilot_feedback
        WHERE attempt_id = $1 AND item_code = 'V15_ACTION_PICK'`, [attempt]) : null;
    if (hasAct) {
      ok(`${r.key} 고른 할 일이 적힌다`, !!picked?.choice, picked?.choice ?? "없음");
    } else {
      ok(`${r.key} 할 일이 없으면 고르는 칸도 서지 않는다`, true, "결과지에 할 일이 없다");
    }

    ok(`${r.key} 500 과 화면 오류가 없다`, errs.length === 0, errs.slice(0, 3).join(" | "));
    seen.push({ code, attempt, tier: r.tier });
    await ctx.close();
  }

  /* 11. 운영 표 — 세 벌이 다 서는지 */
  if (seen.length) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(`${B}/login`, { waitUntil: "networkidle" });
    await p.fill('input[name="identifier"]', ADMIN.id);
    await p.fill('input[name="password"]', ADMIN.pw);
    await p.click('button[type="submit"]');
    await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 30000 })
      .catch(() => {});
    await p.goto(`${B}/admin/v3-pilot`, { waitUntil: "networkidle" });
    const text = await p.evaluate(() => document.body.innerText);
    const missing = seen.filter((s) => !text.includes(s.code)).map((s) => s.code);
    ok("운영 표에 예행 세 벌이 다 선다", missing.length === 0, missing.join(" "));
    ok("운영 표에 전공명이 없다", !text.includes("기계공학"));
    await p.screenshot({ path: `${OUT}/admin-01-table.png`, fullPage: true });

    await p.goto(`${B}/admin/v3-pilot?done=done`, { waitUntil: "networkidle" });
    ok("거르기가 든다", (await p.evaluate(() => document.body.innerText)).includes("끝낸"));

    await p.goto(`${B}/admin/v3-pilot/${seen[seen.length - 1].attempt}`,
      { waitUntil: "networkidle" });
    const one = await p.evaluate(() => document.body.innerText);
    ok("한 사람 화면이 열린다", one.includes(seen[seen.length - 1].code), one.slice(0, 60));
    ok("한 사람 화면에 전공명이 없다", !one.includes("기계공학"));
    await p.screenshot({ path: `${OUT}/admin-02-one.png`, fullPage: true });
    await ctx.close();
  }

  await browser.close();
  writeFileSync(`${OUT}/README.md`,
    `# 파일럿 예행\n\n${B} 에서 돌렸다. 통과 ${pass} · 걸림 ${fail}\n\n`
    + "iPhone 줄은 크로뮴에 iOS 화면을 씌운 것이고 WebKit 엔진이 아니다.\n"
    + "Safari 전용 탈은 사람이 실기기에서 한 번 봐야 한다.\n\n"
    + "```\n" + log.join("\n") + "\n```\n");
  console.log(`\n예행 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  console.log(`  그림과 종이는 ${OUT}/ 에 있습니다.`);
  process.exitCode = fail ? 1 : 0;
}

/**
 * 보기 하나를 고른다.
 *
 * **가려져서 못 누른 것과 눌러도 안 먹는 것을 가른다.** 손전화 폭에서는
 * 바닥의 단추 띠가 마지막 보기 위에 겹칠 수 있다. 먼저 자리로 굴려서 손가락
 * 으로 누르듯 누르고, 그래도 안 먹으면 입력에 바로 누른다. 두 번째 길로
 * 넘어간 자리는 세어서 **가려진 자리로 보고한다** — 사람은 그 자리에서 막힌다.
 */
async function pickOne(
  box: import("playwright").Locator, want: number,
): Promise<"ok" | "covered" | "none"> {
  const labels = box.locator("label");
  if (!(await labels.count())) return "none";
  const label = labels.nth(want);
  await label.scrollIntoViewIfNeeded().catch(() => undefined);
  await label.click({ timeout: 2500 }).catch(() => undefined);
  if (await box.locator('input[type="radio"]:checked').count()) return "ok";
  await label.locator('input[type="radio"]')
    .evaluate((el) => (el as HTMLInputElement).click()).catch(() => undefined);
  return (await box.locator('input[type="radio"]:checked').count()) ? "covered" : "none";
}

/**
 * 지금 화면을 답하고 다음으로 넘긴다. 사람이 누르는 순서와 같다.
 *
 * **단추를 글자로 찾지 않는다.** 전환 화면은 `계속` 이고 질문은 `다음`
 * 이고 끝은 `결과 만들기` 라, 글자로 찾으면 문구를 고친 날 예행이 멈춘다.
 *
 * 고르는 값은 한쪽 끝으로 밀지 않는다. 전부 가장 높은 칸을 누르면 응답
 * 품질이 `다시 볼 것` 으로 붙고, 그러면 예행이 만든 자료가 파일럿 표에서
 * 손볼 일로 선다.
 */
async function walk(
  p: import("playwright").Page, max: number,
): Promise<{ screens: number; done: boolean; covered: number }> {
  let screens = 0, covered = 0, stuck = 0;
  for (let i = 0; i < max; i += 1) {
    await p.waitForLoadState("networkidle");

    /* 1. 고르는 묶음마다 하나씩. 이미 고른 자리는 덮지 않는다.
          **한 칸으로 밀지 않는다**: 열두 영역에 같은 값을 넣으면 영역
          사이에 차이가 없어 `차이 적음` 이 붙고, 그 응답으로는 결과지가
          사람을 가르는지 볼 수 없다. 화면 차례로 조금씩 흔든다 */
    const was = p.url();
    /* **영역 훑기의 줄도 고르는 묶음이다.** 열두 줄이 한 화면에 서고 줄마다
       보기가 셋이라, `fieldset.qs-opts` 만 찾으면 그 화면에서 아무것도
       고르지 않고 넘어간다 */
    const boxes = p.locator("fieldset.qs-opts, fieldset.qs-sw, .qs-cards, .qs-list");
    const bn = await boxes.count();
    let advanced = false;
    for (let g = 0; g < bn; g += 1) {
      const box = boxes.nth(g);
      /* 복수 선택 자리는 네모라 `radio` 로만 세면 매번 다시 고른다 */
      if (await box.locator("input:checked").count()) continue;
      const labels = box.locator("label");
      const n = await labels.count();
      if (!n) continue;
      const shake = [0.8, 0.4, 1, 0.2, 0.6][(i + g) % 5];
      const want = n <= 2 ? 0 : Math.min(n - 1, Math.round((n - 1) * shake));
      const how = await pickOne(box, want);
      if (how === "covered") covered += 1;
      await p.waitForTimeout(40);
      /* **한 선택으로 끝나는 화면은 눌리면 저절로 넘어간다.** 그 뒤에
         `다음` 을 또 누르면 한 화면을 건너뛴다 */
      if (p.url() !== was) { advanced = true; break; }
    }
    if (advanced) {
      screens += 1;
      await p.waitForLoadState("networkidle");
      stuck = 0;
      continue;
    }

    /* 2. 근거 칩은 묶음마다 둘. 소유는 근거 둘 이상일 때만 선다.
          **이미 고른 칩을 다시 누르지 않는다**: 칩은 켜고 끄는 자리라
          같은 자리를 다시 누르면 꺼진다. 한 화면을 두 번 지나면 고른 것이
          사라지고, 그 자리에서 영영 못 넘어간다 */
    const groups = p.locator(".qs-chips");
    const gn = await groups.count();
    for (let g = 0; g < gn; g += 1) {
      const chips = groups.nth(g).locator("label.qs-chip");
      const cn = await chips.count();
      let on = await groups.nth(g).locator('input:checked').count();
      for (let c = 0; c < cn && on < 2; c += 1) {
        const chip = chips.nth(c);
        if (await chip.locator("input:checked").count()) continue;
        await chip.scrollIntoViewIfNeeded().catch(() => undefined);
        await chip.click({ timeout: 2500 }).catch(() => undefined);
        on = await groups.nth(g).locator('input:checked').count();
        await p.waitForTimeout(40);
      }
    }

    /* 3. 덧붙이는 한 줄. **응답이 아니다** — 결과지가 그 사람 말로 옮길 때 읽는다 */
    const areas = p.locator("textarea");
    const an = await areas.count();
    for (let t = 0; t < an; t += 1) {
      if (await areas.nth(t).inputValue().catch(() => "")) continue;
      await areas.nth(t).fill("구속 조건과 하중을 직접 정해 해석에 넣었습니다.")
        .catch(() => undefined);
      await areas.nth(t).blur().catch(() => undefined);
    }

    screens += 1;

    /* 4. 끝 화면이면 결과로 */
    const seeResult = p.locator("a.qs-btn-main");
    if (await seeResult.count()) {
      await seeResult.first().click().catch(() => undefined);
      await p.waitForLoadState("networkidle");
      return { screens, done: true, covered };
    }
    const go = p.locator("button.qs-btn-main");
    if (!(await go.count())) return { screens, done: false, covered };
    const before = p.url();
    await go.first().click({ force: true }).catch(() => undefined);
    await p.waitForTimeout(400);
    await p.waitForLoadState("networkidle");
    if (/\/result/.test(p.url())) return { screens, done: true, covered };
    if (p.url() === before) {
      /* **같은 자리에서 맴돌면 그만둔다.** 사백 번을 돌고 나서 `끝까지 가지
         못했다` 만 적으면 어디서 막혔는지 모른다. 세 번 더 보고 멈춘다 */
      stuck += 1;
      if (stuck < 3) continue;
      return { screens, done: false, covered };
    }
    stuck = 0;
  }
  return { screens, done: false, covered };
}

/** 알약으로 고르는 자리. `select` 가 아니라 `label` 을 누른다 */
async function pickByValue(
  p: import("playwright").Page, name: string, value: string,
): Promise<void> {
  const input = p.locator(`input[name="${name}"][value="${value}"]`);
  if (!(await input.count())) return;
  const label = p.locator(`label:has(input[name="${name}"][value="${value}"])`);
  await (await label.count() ? label.first() : input.first())
    .click({ force: true }).catch(() => undefined);
  await p.waitForTimeout(80);
}

async function count(attemptId: string): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM v3_responses WHERE attempt_id = $1`, [attemptId]);
  return Number(r?.n ?? 0);
}

main().then(() => process.exit(process.exitCode ?? 0),
  (e) => { console.error(e); process.exit(1); });
