/**
 * **배재대 학생과 담당자가 보는 열 자리를 밟는 차례 그대로 찍는다.**
 *
 * BEFORE / AFTER 를 같은 길로 찍어야 나란히 놓고 읽을 수 있다. 자리
 * 목록을 주소로 열어 찍으면 그 쪽이 어떤 상태인지는 **지난번 누군가가
 * 눌러 둔 상태**에 달려 있고, 그러면 두 그림이 서로 다른 응시의 그림이
 * 된다. 그래서 학생 하나를 그 자리에서 만들고 그 사람의 길을 밟는다.
 *
 *   OUT=docs/metri/shots/pcu-wow/before \
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     npx tsx scripts/pcu-wow-shots.ts
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import {
  BASE, assertFreshServer, assertPreviewServer, gateCreds, loadEnv, login,
  makeStudent, registerCampusStudent,
} from "./_loop-fixture";
import { enterAssessment } from "./_v3-walk";
import { PEOPLE, answerAll } from "./_v3-answer";
import { hashPassword } from "../src/lib/password";
import { query, queryOne } from "../src/lib/db";
import { allLeaves, university } from "../src/lib/campus/registry";
import { attemptOf, openAttempt, submit, type CampusEntry, type V3Attempt }
  from "../src/lib/me-v3/runtime/session";

loadEnv();

const OUT = process.env.OUT ?? "docs/metri/shots/pcu-wow/before";
const UNI = "PCU";
/** 경영학과. 배재대에서 자료가 다 선 자리 가운데 가장 큰 단과대학이다 */
const DEPT = process.env.DEPT ?? "";

const WIDE = { width: 1440, height: 900 };
const NARROW = { width: 375, height: 812 };

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass += 1; console.log(`  통과  ${w}${saw ? " — " + saw : ""}`); }
  else { bad.push(w); console.log(`  걸림  ${w}${saw ? " — " + saw : ""}`); }
};

async function shot(p: Page, name: string, who: "d" | "m"): Promise<void> {
  const file = `${OUT}/${name}.${who === "d" ? "desktop" : "mobile"}.png`;
  await p.waitForLoadState("networkidle").catch(() => undefined);
  await p.waitForTimeout(220);
  await p.screenshot({ path: file, fullPage: true });
}

/** 두 폭을 같은 주소로 찍는다 */
async function both(
  d: Page, m: Page, url: string, name: string,
  after?: (p: Page) => Promise<void>,
): Promise<void> {
  for (const [p, who] of [[d, "d"], [m, "m"]] as const) {
    await p.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
    if (after) await after(p);
    await shot(p, name, who);
  }
}

async function main(): Promise<void> {
  assertFreshServer();
  mkdirSync(OUT, { recursive: true });

  const u = university(UNI);
  if (!u) throw new Error("등록부에 PCU 가 없습니다");
  const rows = allLeaves(u).filter((r) => r.leaf.core_code);
  const row = DEPT
    ? rows.find((r) => r.leaf.code === DEPT)
    : rows.find((r) => r.leaf.name.includes("경영학과")) ?? rows[0];
  if (!row) throw new Error("가리킬 자리가 없습니다");
  const core = row.leaf.core_code as string;
  assertPreviewServer(core);
  console.log(`  ${u.university_name} · ${row.college.name} · ${row.leaf.name} (${core})\n`);

  const mail = `pcuwow-${Date.now()}@test.invalid`;
  const st = await makeStudent(mail);
  await registerCampusStudent(st.id, UNI, row.leaf.code);
  await query(
    `INSERT INTO entitlements
       (user_id, product_code, kind, tier, major_code, assessment_version, status)
     VALUES ($1,'ME_V3_PRO_KR','report','PRO','ME','ME_V3_2','active')`, [st.id]);

  /* 담당자. **발급 계정을 건드리지 않는다**: 운영에서 쓰는 열쇠는 사람이
     받는 것이고, 찍는 자리가 그 줄의 해시를 갈아 끼우면 그 담당자가
     다음 날 못 들어온다 */
  const staffLogin = "pcuwow-staff";
  const staffPw = "wow-" + Math.random().toString(36).slice(2, 12);
  const org = await queryOne<{ id: string }>(
    `SELECT id::text FROM organizations WHERE code = 'PCU'`);
  if (!org) throw new Error("PCU 기관 줄이 없습니다 (npm run pcu:org)");
  const oldStaff = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [staffLogin]);
  if (oldStaff) await query(`DELETE FROM memberships WHERE user_id = $1`, [oldStaff.id]);
  const staff = oldStaff ?? await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash,
                        status, locale, is_demo, must_reset_pw)
     VALUES ($1,$1,'학과 담당자',$2,'active','ko',TRUE,FALSE) RETURNING id::text`,
    [staffLogin, await hashPassword(staffPw)]);
  if (oldStaff) {
    await query(`UPDATE users SET password_hash = $2 WHERE id = $1`,
      [oldStaff.id, await hashPassword(staffPw)]);
  }
  await query(
    `INSERT INTO memberships (user_id, org_id, role) VALUES ($1,$2,'org_admin')`,
    [staff?.id, org.id]);

  const gate = gateCreds();
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ args: ["--no-sandbox"] });
    const mk = async (v: typeof WIDE): Promise<BrowserContext> =>
      (browser as Browser).newContext({
        viewport: v, deviceScaleFactor: 2,
        ...(gate ? { httpCredentials: gate } : {}),
      });

    /* 1~3. 로그인하지 않은 사람이 보는 세 자리 */
    const anonD = await mk(WIDE), anonM = await mk(NARROW);
    const ad = await anonD.newPage(), am = await anonM.newPage();
    await both(ad, am, `/campus/${UNI.toLowerCase()}`, "01-landing");
    await both(ad, am, `/campus/${UNI.toLowerCase()}/majors`, "02-majors");
    await both(ad, am, `/campus/${UNI.toLowerCase()}/login`, "03-login");
    ok("학교 진입 세 자리를 찍었다", true);
    await anonD.close(); await anonM.close();

    /* 4. 검사. **주소로 열지 않고 그 사람의 길을 밟는다** */
    const sd = await mk(WIDE), sm = await mk(NARROW);
    const d = await login(sd, mail, st.pw);
    await d.goto(`${BASE}/campus/${UNI.toLowerCase()}/d/${row.leaf.code}`,
      { waitUntil: "domcontentloaded" });
    await Promise.all([
      d.waitForURL((x) => /\/v3\/\d+/.test(new URL(x).pathname), { timeout: 30000 })
        .catch(() => undefined),
      d.locator('form button[type="submit"], form input[type="submit"]').first()
        .click({ timeout: 10000 }).catch(() => undefined),
    ]);
    /* 학교 쪽 폼은 학업 단계를 묻는 자리로 보낸다. **거기서 멈추면 한
       문항도 안 푼 응시가 되고**, 그 상태로 `.qs-list` 를 찾으면 시작
       화면의 보기를 검사 화면으로 잘못 읽는다 */
    if (/\/v3\/start/.test(d.url())) {
      await d.locator('input[name="stage"][value="bachelor"]').first()
        .click({ timeout: 8000 }).catch(() => undefined);
      await Promise.all([
        d.waitForURL((x) => /\/v3\/\d+/.test(new URL(x).pathname), { timeout: 30000 })
          .catch(() => undefined),
        d.locator("button.qs-btn-go").first().click({ timeout: 10000 })
          .catch(() => undefined),
      ]);
    }
    await enterAssessment(d);
    const aid = (d.url().match(/\/v3\/(\d+)/) ?? [])[1] ?? null;
    ok("학교 쪽에서 응시가 열렸다", Boolean(aid), aid ?? d.url());

    /* 보기 넷이 선 화면까지 간다. 그 자리가 이 검사의 얼굴이다 */
    let found = false;
    for (let i = 0; i < 24 && !found; i += 1) {
      await d.waitForLoadState("networkidle").catch(() => undefined);
      /* **시작 화면의 보기를 검사 화면으로 읽지 않는다**: 주소가 응시
         번호를 들고 있을 때만 센다 */
      if (/\/v3\/\d+/.test(d.url()) && await d.locator(".qs-list").count()) {
        found = true; break;
      }
      const boxes = d.locator("fieldset.qs-opts, fieldset.qs-sw, .qs-cards, .qs-list");
      const bn = await boxes.count();
      const was = d.url();
      for (let g = 0; g < bn; g += 1) {
        const box = boxes.nth(g);
        if (await box.locator("input:checked").count()) continue;
        const labels = box.locator("label");
        const n = await labels.count();
        if (!n) continue;
        await labels.nth(Math.min(n - 1, 2)).click({ timeout: 2500 })
          .catch(() => undefined);
        await d.waitForTimeout(40);
        if (d.url() !== was) break;
      }
      if (d.url() === was) {
        await d.locator(".qs-nav button, .qs-nav a").last()
          .click({ timeout: 4000 }).catch(() => undefined);
      }
      await d.waitForTimeout(120);
    }
    ok("보기 넷이 선 검사 화면에 닿았다", found, d.url());
    await shot(d, "04-assessment", "d");
    const m = await login(sm, mail, st.pw);
    await m.goto(d.url(), { waitUntil: "domcontentloaded" });
    await enterAssessment(m);
    await shot(m, "04-assessment", "m");

    /* 5~8. 결과와 종이. 검사는 서버에서 끝까지 채운다 — 여기가 재는 것은
       결과를 받은 사람이 보는 화면이고, 검사가 도는지는 `v3:runtime` 이 센다 */
    const entry: CampusEntry = {
      university_code: u.university_code, college_code: "",
      department_code: row.leaf.code, core_code: core,
      specialization: row.leaf.specialization ?? null,
    };
    const a0 = await openAttempt({
      userId: st.id, tier: "PRO", stage: "bachelor", gradField: null, campus: entry,
    });
    await answerAll(core, a0, st.id, PEOPLE[2]);
    const done = (await attemptOf(a0.id, st.id)) as V3Attempt;
    await submit(done);
    ok("결과가 만들어졌다", true, `응시 ${a0.id}`);

    await both(d, m, `/v3/${a0.id}/result`, "05-result-summary");
    await both(d, m, `/v3/${a0.id}/result`, "06-result-detail", async (p) => {
      await p.locator(".rs-openbtn").first().click({ timeout: 4000 })
        .catch(() => undefined);
      await p.waitForTimeout(400);
    });

    const res = await d.request.get(`${BASE}/v3/${a0.id}/result/pdf`, { timeout: 180000 });
    const pdfOk = res.status() === 200
      && (res.headers()["content-type"] ?? "").includes("pdf");
    if (pdfOk) {
      const file = `${OUT}/report.pdf`;
      writeFileSync(file, await res.body());
      for (const [pg, name] of [[1, "07-pdf-p1"], [4, "08-pdf-p4"]] as const) {
        execFileSync("pdftoppm", ["-f", String(pg), "-l", String(pg), "-r", "110",
          "-png", "-singlefile", file, `${OUT}/${name}`]);
      }
    }
    ok("종이를 뽑고 쪽을 그림으로 떴다", pdfOk, `HTTP ${res.status()}`);

    /* 9. 작업공간 */
    await both(d, m, "/me", "09-me");

    /* 10. 담당자 */
    const od = await mk(WIDE), om = await mk(NARROW);
    const gd = await login(od, staffLogin, staffPw);
    const gm = await login(om, staffLogin, staffPw);
    await both(gd, gm, "/org/v3", "10-org");
    ok("담당자 화면을 찍었다", !/\/login/.test(gd.url()), gd.url());
    await od.close(); await om.close();
    await sd.close(); await sm.close();
  } finally {
    await browser?.close().catch(() => undefined);
  }

  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length} · ${OUT}`);
  if (bad.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
