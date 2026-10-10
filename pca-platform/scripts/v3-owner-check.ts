/**
 * 사업주가 눌러 볼 자리 가운데 **기계가 대신 눌러 볼 수 있는 것**.
 *
 * 이 파일이 재는 것은 넷이다.
 *
 *   1. 등급을 올려도 **같은 응시**가 이어지는가 (번호가 바뀌면 실패다)
 *   2. 답한 것이 **서버에** 있는가. 브라우저 저장소에 응답을 두지 않는가
 *   3. 닫고 다시 들어오면 **그 자리로** 돌아가는가
 *   4. 경험을 더해 다시 계산해도 **그때 낸 결과지가 그대로인가**
 *
 * **자동으로 통과한 것을 사람이 눌러 본 것으로 적지 않는다.** 여기서
 * 나오는 판정은 이 기계의 공개 전 배포본에서 돈 것이고, 밖에서 브라우저로
 * 여는 것은 `docs/metri/66_owner_test.md` 가 맡는다.
 *
 *   UI_BASE=http://127.0.0.1:3270 npx tsx scripts/v3-owner-check.ts
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

for (const line of (() => {
  try { return readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n"); }
  catch { return [] as string[]; }
})()) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { chromium, type BrowserContext, type Page } from "playwright";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { addExperience } from "../src/lib/me-v3/platform";
import { applyRecompute } from "../src/lib/me-v3/recompute";
import {
  attemptOf, content, newScreensAfterUpgrade, upgradeTier, type V3Attempt,
} from "../src/lib/me-v3/runtime/session";

const B = (process.env.UI_BASE || process.env.BASE
  || "http://127.0.0.1:3000").replace(/\/$/, "");
const GATE = process.env.STAGING_BASIC_AUTH || "";

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

const LOGIN = "v3owner@example.com";

async function wipe(id: string): Promise<void> {
  for (const t of ["v3_attempts", "v3_experiences", "v3_actions", "career_events",
                   "career_profiles", "v3_applications", "v3_track_interest",
                   "v3_saved_jobs", "memberships", "entitlements", "analytics_events"]) {
    await query(`DELETE FROM ${t} WHERE user_id = $1`, [id]).catch(() => undefined);
  }
  await query(`DELETE FROM users WHERE id = $1`, [id]).catch(() => undefined);
}

/** 열쇠는 이 자리에서 만든다. 저장소에도 문서에도 로그에도 남지 않는다 */
async function makeUser(): Promise<{ id: string; pw: string }> {
  const old = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [LOGIN]);
  if (old) await wipe(old.id);
  const pw = randomBytes(18).toString("base64url");
  const row = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash,
                        status, locale, is_demo, must_reset_pw)
     VALUES ($1,$1,'사업주 점검',$2,'active','ko',TRUE,FALSE) RETURNING id::text`,
    [LOGIN, await hashPassword(pw)]);
  await query(
    `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, NULL, 'student')
       ON CONFLICT DO NOTHING`, [row?.id]).catch(() => undefined);
  return { id: row?.id as string, pw };
}

async function login(ctx: BrowserContext, pw: string): Promise<Page> {
  const p = await ctx.newPage();
  await p.goto(`${B}/login`, { waitUntil: "domcontentloaded" });
  await p.fill('input[name="identifier"], input[name="loginId"], input[type="text"]', LOGIN);
  await p.fill('input[type="password"]', pw);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 30000 })
    .catch(() => undefined);
  return p;
}

/** 묶음마다 하나씩 고르고 한 화면 넘긴다. 사람이 누르는 순서와 같다 */
async function oneScreen(p: Page): Promise<boolean> {
  await p.waitForLoadState("networkidle");
  const was = p.url();
  const boxes = p.locator("fieldset.qs-opts, fieldset.qs-sw, .qs-cards, .qs-list");
  const bn = await boxes.count();
  for (let g = 0; g < bn; g += 1) {
    const box = boxes.nth(g);
    if (await box.locator("input:checked").count()) continue;
    const labels = box.locator("label");
    const n = await labels.count();
    if (!n) continue;
    const l = labels.nth(Math.min(n - 1, 2));
    await l.scrollIntoViewIfNeeded().catch(() => undefined);
    await l.click({ timeout: 2500 }).catch(() => undefined);
    await p.waitForTimeout(40);
    if (p.url() !== was) { await p.waitForLoadState("networkidle"); return true; }
  }
  const go = p.locator("button.qs-btn-main");
  if (!(await go.count())) return false;
  await go.first().click({ force: true }).catch(() => undefined);
  await p.waitForTimeout(300);
  await p.waitForLoadState("networkidle");
  return p.url() !== was;
}

async function main(): Promise<void> {
  const u = await makeUser();
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  const gate = GATE.includes(":")
    ? { username: GATE.split(":")[0], password: GATE.slice(GATE.indexOf(":") + 1) } : null;
  const opts = gate ? { httpCredentials: gate } : {};

  try {
    /* ── 1. 시작하고 몇 화면 눌러 둔다 ─────────────────────────────── */
    const ctx1 = await browser.newContext(opts);
    const p1 = await login(ctx1, u.pw);
    await p1.goto(`${B}/v3/start`, { waitUntil: "networkidle" });
    /* **학업 단계를 고른다.** 시작 화면은 더 이상 `학부` 를 미리 켜 두지
       않는다: 아직 아무 데도 적히지 않은 값을 켜 두면, 바로 다음 화면이
       응시에 적힌 값을 읽어 두 화면이 다른 단계를 보여 준다. 사람이
       고르는 것이 맞고, 그래서 이 검사도 고른다 */
    /* **이름표를 누른다.** 보기의 `input` 은 눈에 보이지 않게 숨겨 두고
       (`opacity: 0`) 이름표가 눌리는 자리다. `input` 을 직접 누르면 1px
       상자를 눌러 옆의 표식에 가로막힌다. 사람이 누르는 자리를 누른다 */
    await p1.locator('label:has(input[name="stage"][value="bachelor"])').first()
      .click().catch(() => undefined);
    const begin = p1.locator('button[type="submit"]').last();
    await Promise.all([
      p1.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined),
      begin.click({ force: true }).catch(() => undefined),
    ]);
    await p1.waitForLoadState("networkidle");
    const started = /\/v3\/\d+/.test(p1.url());
    ok("검사가 시작되고 응시 주소로 간다", started, new URL(p1.url()).pathname);
    const attemptId = (p1.url().match(/\/v3\/(\d+)/) ?? [])[1] ?? "";

    let moved = 0;
    for (let i = 0; i < 6; i += 1) if (await oneScreen(p1)) moved += 1;
    const stopped = new URL(p1.url()).pathname + new URL(p1.url()).search;
    ok("화면이 넘어간다", moved >= 3, `${moved}화면 · ${stopped}`);

    /* ── 2. 답은 서버에 있다 ───────────────────────────────────────── */
    const saved = await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM v3_responses WHERE attempt_id = $1`, [attemptId]);
    ok("답한 것이 서버에 적혀 있다", Number(saved?.n ?? 0) > 0, `${saved?.n}줄`);

    /* **브라우저 저장소에 응답을 두지 않는다.** 두면 다른 기기에서 이어
       풀 수 없고, 지운 사람의 응답이 그 기계에만 남는다 */
    /* **`evaluate` 안에 함수를 선언하지 않는다.** tsx 가 이름 붙은 함수에
       `__name` 보조를 붙이는데 그 보조는 브라우저 쪽에 없어서 그 자리에서
       터진다. 읽는 줄만 넣는다 */
    const store = await p1.evaluate(() => {
      const out: string[] = [];
      try {
        for (const s of [localStorage, sessionStorage]) {
          for (let i = 0; i < s.length; i += 1) {
            const k = s.key(i) as string;
            out.push(`${k}=${(s.getItem(k) ?? "").slice(0, 200)}`);
          }
        }
      } catch { return "못 봄"; }
      return out.join(" | ");
    });
    const leak = /v3_|answer|response|item_id|attempt/i.test(store);
    ok("브라우저 저장소에 응답이 없다", !leak,
       store === "못 봄" ? "저장소를 못 봤다" : `${store.length}자 · ${leak ? store.slice(0, 120) : "응답 꼴 없음"}`);

    /* ── 3. 닫고 다시 들어오면 그 자리 ────────────────────────────── */
    const where = await queryOne<{ s: string | null }>(
      `SELECT current_screen AS s FROM v3_attempts WHERE id = $1`, [attemptId]);
    await ctx1.close();
    const ctx2 = await browser.newContext(opts);
    const p2 = await login(ctx2, u.pw);
    /* `/me` 의 `검사 이어하기` 가 보내는 자리로 간다. 주소를 손으로 적지
       않는다: 사람이 누르는 길이 이것이다.

       **href 로 찾지 않는다.** 이 단추는 `Link` 가 아니라 폼이다. 링크로
       두면 Next 가 화면에 들어온 링크를 미리 불러오면서 누르지 않은
       사람까지 `이어하기를 눌렀다` 로 세어진다. 그래서 글자로 찾아 실제로
       누르고, 어느 응시로 갔는지를 주소에서 본다 */
    await p2.goto(`${B}/me`, { waitUntil: "networkidle" });
    const cont = p2.getByRole("button", { name: /이어하기/ }).first();
    const hasCont = await cont.count();
    ok("대시보드에 `검사 이어하기` 가 선다", hasCont > 0);
    if (hasCont) {
      await Promise.all([
        p2.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined),
        cont.click().catch(() => undefined),
      ]);
      await p2.waitForLoadState("networkidle");
    } else {
      await p2.goto(`${B}/v3/${attemptId}`, { waitUntil: "networkidle" });
    }
    const back = new URL(p2.url());
    /* **주소에 자리를 적지 않는다.** `?s=` 없이 들어오면 서버가 들고 있던
       자리를 꺼내 그 화면을 그린다(화면 이름에 영역 코드가 들어 있어서
       주소에 적으면 응시자가 그것을 본다). 그래서 **주소가 아니라 서버가
       같은 자리를 들고 있는지**와 질문이 실제로 섰는지를 본다 */
    const still = await queryOne<{ s: string | null }>(
      `SELECT current_screen AS s FROM v3_attempts WHERE id = $1`, [attemptId]);
    const drew = await p2.locator(".qs-q, fieldset.qs-opts, .qs-list, .qs-cards").count();
    ok("다시 들어오면 멈춘 자리로 간다",
       back.pathname === `/v3/${attemptId}` && still?.s === where?.s && drew > 0,
       `${back.pathname}${back.search} · 서버가 들고 있던 자리 ${where?.s ?? "없음"}`
       + ` → ${still?.s ?? "없음"} · 그린 묶음 ${drew}`);
    const after = await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM v3_responses WHERE attempt_id = $1`, [attemptId]);
    ok("다시 들어와도 앞 응답이 그대로다", after?.n === saved?.n,
       `${saved?.n} → ${after?.n}`);
    await ctx2.close();

    /* ── 4. 등급을 올려도 같은 응시 ───────────────────────────────── */
    const was = (await attemptOf(attemptId, u.id)) as V3Attempt;
    const std = await upgradeTier(attemptId, u.id, "STANDARD");
    const addStd = await newScreensAfterUpgrade(std, "BASIC");
    const pro = await upgradeTier(attemptId, u.id, "PRO");
    const addPro = await newScreensAfterUpgrade(pro, "STANDARD");
    const n = await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM v3_attempts WHERE user_id = $1`, [u.id]);
    ok("등급을 올려도 응시 번호가 그대로다",
       std.id === attemptId && pro.id === attemptId && n?.n === "1",
       `${was.tier} → ${std.tier} → ${pro.tier} · 응시 ${n?.n}개`);
    ok("올리면 묶음만 더해진다",
       addStd.added.length > 0 && addPro.added.length > 0
       && addStd.added.every((s) => s.items.length > 0),
       `STANDARD +${addStd.added.length}화면 · PRO +${addPro.added.length}화면`);
    const keep = await queryOne<{ n: string }>(
      `SELECT count(*)::text AS n FROM v3_responses WHERE attempt_id = $1`, [attemptId]);
    ok("올려도 앞 응답을 다시 묻지 않는다", keep?.n === saved?.n,
       `${saved?.n} → ${keep?.n}줄`);

    /* ── 5. 끝까지 풀고 종이를 뽑는다 ─────────────────────────────── */
    const ctx3 = await browser.newContext(opts);
    const p3 = await login(ctx3, u.pw);
    await p3.goto(`${B}/v3/${attemptId}`, { waitUntil: "networkidle" });
    /**
     * **자리를 번호로 넘긴다.** `다음` 단추로만 걸으면 이미 답해 둔
     * 자동 진행 화면에서 그 단추가 꺼져 있어 거기서 멈춘다. 사람이 누르는
     * 길은 앞의 여섯 화면과 `v3:pilot:dry` 가 맡고, 여기서 보려는 것은
     * **끝까지 갔을 때 판정이 서는가**다.
     */
    let guard = 0;
    for (let s = 0; s < 250; s += 1) {
      guard = s + 1;
      await p3.goto(`${B}/v3/${attemptId}?s=${s}`, { waitUntil: "networkidle" });
      const see = p3.locator("a.qs-btn-main");
      if (await see.count()) {
        await see.first().click().catch(() => undefined);
        await p3.waitForLoadState("networkidle");
        break;
      }
      const finish = p3.locator("button.qs-btn-main");
      const label = (await finish.first().textContent().catch(() => "")) ?? "";
      /* 고르는 묶음마다 하나씩 */
      const boxes = p3.locator("fieldset.qs-opts, fieldset.qs-sw, .qs-cards, .qs-list");
      for (let g = 0; g < (await boxes.count()); g += 1) {
        const box = boxes.nth(g);
        if (await box.locator("input:checked").count()) continue;
        const labels = box.locator("label");
        const n = await labels.count();
        if (!n) continue;
        const l = labels.nth(Math.min(n - 1, 2));
        await l.scrollIntoViewIfNeeded().catch(() => undefined);
        await l.click({ timeout: 2500 }).catch(() => undefined);
        await p3.waitForTimeout(60);
        if (!/\/v3\/\d+/.test(p3.url())) break;
      }
      /* 근거 칩은 묶음마다 둘. 소유는 근거 둘 이상일 때만 선다 */
      const groups = p3.locator(".qs-chips");
      for (let g = 0; g < (await groups.count()); g += 1) {
        const chips = groups.nth(g).locator("label.qs-chip");
        let on = await groups.nth(g).locator("input:checked").count();
        for (let c = 0; c < (await chips.count()) && on < 2; c += 1) {
          if (await chips.nth(c).locator("input:checked").count()) continue;
          await chips.nth(c).click({ timeout: 2500 }).catch(() => undefined);
          on = await groups.nth(g).locator("input:checked").count();
        }
      }
      for (const t of await p3.locator("textarea").all()) {
        if (await t.inputValue().catch(() => "")) continue;
        await t.fill("구속 조건과 하중을 직접 정해 해석에 넣었습니다.").catch(() => undefined);
        await t.blur().catch(() => undefined);
      }
      /* 마지막 화면이면 `결과 만들기` 를 누른다 */
      if (label.includes("결과")) {
        await finish.first().click({ force: true }).catch(() => undefined);
        await p3.waitForTimeout(600);
        await p3.waitForLoadState("networkidle");
        break;
      }
      await p3.waitForTimeout(120);
    }
    const done = await queryOne<{ st: string }>(
      `SELECT status AS st FROM v3_attempts WHERE id = $1`, [attemptId]);
    /* **어디서 멈췄는지 적는다.** `끝까지 가지 못했다` 만 적으면 다음
       사람이 그 자리를 찾는 데 한 회차를 쓴다 */
    ok("끝까지 풀면 판정이 선다", done?.st === "scored",
       `${done?.st} · ${guard}화면 · 멈춘 자리 ${new URL(p3.url()).pathname}${new URL(p3.url()).search}`);

    /**
     * **종이를 바이트로 견주지 않는다.** 크로뮴이 PDF 안에 만든 시각을
     * 적어서 같은 쪽을 두 번 뽑아도 바이트가 다르다. 견주는 것은 글자다.
     */
    const dir = mkdtempSync(join(tmpdir(), "v3pdf-"));
    const paper = async (name: string): Promise<{ code: number; text: string }> => {
      const r = await ctx3.request.get(`${B}/v3/${attemptId}/result/pdf`,
                                       { timeout: 180_000 });
      if (r.status() !== 200) return { code: r.status(), text: "" };
      const f = join(dir, `${name}.pdf`);
      writeFileSync(f, await r.body());
      let text = "";
      try { text = execFileSync("pdftotext", [f, "-"], { encoding: "utf8" }); }
      catch { text = ""; }
      return { code: r.status(), text: text.replace(/\s+/g, " ").trim() };
    };
    const before1 = await paper("before");
    ok("결과지 PDF 가 뽑힌다", before1.code === 200 && before1.text.length > 1000,
       `${before1.code} · 글자 ${before1.text.length}`);

    /*
     * **여기는 http 라 `__Secure-` 쿠키를 만들 수 없다.**
     *
     * 운영은 https 라 Auth.js 가 로그인 쿠키를 `__Secure-authjs.
     * session-token` 으로, CSRF 쿠키를 `__Host-authjs.csrf-token` 으로
     * 짓는다. 그 이름은 **secure 가 켜져 있어야만** 브라우저가 받고,
     * `domain`+`path` 로 넣으면 크로뮴이 묶음 전체를 거절한다
     * (`Invalid cookie fields`). 그러면 그리는 브라우저가 로그인하지
     * 않은 사람이 되어 결과 쪽 대신 로그인 쪽을 받고, 로그에는
     * `step=render` 로만 남았다. 이 기계에서는 http 라 접두사가 붙지
     * 않아서 **이 탈이 여기서는 나지 않는다.**
     *
     * 그래서 넣는 모양을 글자로 지킨다: `url` 로 넣어야 주소의 scheme
     * 에서 secure 가 따라온다.
     */
    const pdfSrc = readFileSync("src/lib/me-v3/result/pdf.ts", "utf8");
    const cookieFn = pdfSrc.slice(pdfSrc.indexOf("function cookiesFor"),
      pdfSrc.indexOf("export async function drawResultPdf"));
    ok("로그인 쿠키를 `url` 로 넘긴다 (운영의 `__Secure-` 이름)",
       /url:\s*origin/.test(cookieFn) && !/domain:/.test(cookieFn),
       "domain·path 로 넣으면 운영에서 묶음 전체가 거절된다");

    /* ── 6. 경험을 더해 다시 계산해도 그때 낸 결과지가 그대로다 ───── */
    const before = await queryOne<{ j: string }>(
      `SELECT s.result_model::text AS j FROM v3_snapshots s
         JOIN v3_attempts a ON a.id = s.attempt_id
        WHERE a.user_id = $1 ORDER BY s.created_at DESC, s.id DESC LIMIT 1`, [u.id]);
    const d0 = content().domains.domains[0];
    await addExperience(u.id, {
      kind: "capstone", title: "사업주 점검 경험", td_codes: [d0.code],
      problems: [], decisions: [],
      artifacts: (d0.artifacts ?? []).slice(0, 1),
      verifications: (d0.verify_targets ?? []).slice(0, 1),
      used_where: [],
    });
    await applyRecompute(u.id);
    const afterSnap = await queryOne<{ j: string }>(
      `SELECT s.result_model::text AS j FROM v3_snapshots s
         JOIN v3_attempts a ON a.id = s.attempt_id
        WHERE a.user_id = $1 ORDER BY s.created_at DESC, s.id DESC LIMIT 1`, [u.id]);
    ok("경험을 더해도 굳은 결과가 한 글자도 바뀌지 않는다",
       before?.j === afterSnap?.j, `${(before?.j ?? "").length}자`);
    const prof = await queryOne<{ at: string | null }>(
      `SELECT recomputed_at::text AS at FROM career_profiles WHERE user_id = $1`, [u.id]);
    ok("지금 값에는 다시 계산한 날이 적힌다", !!prof?.at, prof?.at?.slice(0, 16) ?? "없음");

    const after1 = await paper("after");
    ok("다시 계산한 뒤 뽑은 종이의 글자가 같다",
       after1.code === 200 && after1.text === before1.text,
       after1.text === before1.text ? `글자 ${after1.text.length}`
         : `${before1.text.length} ≠ ${after1.text.length}`);

    /* ── 7. 응시마다 판본 열한 가지가 적힌다 ─────────────────────── */
    const vrow = await queryOne<{ j: string }>(
      `SELECT s.module_versions::text AS j FROM v3_snapshots s
         JOIN v3_attempts a ON a.id = s.attempt_id
        WHERE a.user_id = $1 ORDER BY s.id DESC LIMIT 1`, [u.id]);
    const mv = JSON.parse(vrow?.j ?? "{}") as Record<string, unknown>;
    /* **끝난 뒤에는 되물을 수 없다.** 어느 화면으로 어느 문장을 읽고
       답했는지는 그때 적어 두지 않으면 영영 모른다 */
    const WANT = ["core_version", "item_bank_version", "scoring_version",
                  "assessment_ui_version", "assessment_copy_version",
                  "result_model_version", "result_copy_version", "result_ui_version",
                  "industry_pack_version", "role_pack_version", "region_layer_version",
                  /* 작업공간 한 칸. **판정에 쓰이지 않는다**: 결과를 받은 뒤
                     어느 작업공간으로 들어갔는지를 되짚는 자리다 */
                  "workspace_ui_version"];
    const gone = WANT.filter((k) => !(k in mv));
    ok("응시마다 판본 열두 가지가 적힌다", gone.length === 0,
       gone.length ? `빠진 칸 ${gone.join(" ")}`
         : `${WANT.length}가지 · 지역 층은 ${mv.region_layer_version ?? "없음"}`);

    /* ── 8. 결과 기록이 기준과 날짜를 가른다 ──────────────────────── */
    /*
     * **보는 자리를 `/me/results` 로 옮겼다.** 전에는 홈의 카드 한 줄에
     * 굳은 값과 지금 값이 나란히 있어서 날짜만 다른 같은 값으로 읽혔다.
     * 지금은 쪽을 따로 두고 **생김새로 가른다**: 굳은 쪽은 흰 카드에 날짜
     * 띠와 자물쇠 표시, 지금 쪽은 꺼진 바탕에 점선과 `바뀝니다`.
     *
     * 그래서 글자 둘만 보지 않고 **생김새가 실제로 갈렸는지**도 센다.
     */
    const me = await ctx3.request.get(`${B}/me/results`, { timeout: 60_000 });
    const html = await me.text();
    const frozen = html.includes("검사 당시 결과") && html.includes("고정됨");
    const live = html.includes("현재 상태") && html.includes("경험을 더하면 바뀝니다");
    const split = html.includes("cm-snap") && html.includes("cm-live");
    ok("결과 기록이 `검사 당시 결과` 와 `현재 상태` 를 가른다",
       frozen && live && split,
       `${frozen ? "굳은 값 ○" : "굳은 값 ✗"} · ${live ? "지금 값 ○" : "지금 값 ✗"}`
       + ` · ${split ? "생김새 갈림 ○" : "생김새 갈림 ✗"}`);
    ok("결과 이력에 그 결과지로 가는 길이 있다",
       html.includes(`/v3/${attemptId}/result`), `응시 ${attemptId}`);
    await ctx3.close();
  } finally {
    await browser.close();
    await wipe(u.id);
    console.log("\n  치웠다  점검용 사람과 그 자료를 지웠다");
  }

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  await query("SELECT 1");
  process.exit(fail ? 1 : 0);
}

void main();
