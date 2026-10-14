/**
 * **열여덟 자리를 밟는 차례 그대로 찍는다** (규격 §31).
 *
 * `pcu-wow-shots` 가 찍는 열 자리는 **쪽 단위**였다. 이번 회차가 손대는
 * 자리는 쪽이 아니라 결과지 안의 **절**이고(Radar 자리 · Evidence · Gap ·
 * Industry/Role · Action), 쪽 전체를 찍으면 그 절이 1,000px 짜리 그림
 * 가운데 100px 로 들어가 BEFORE / AFTER 를 나란히 놓고 읽을 수 없다.
 * 그래서 절은 **그 요소만** 찍는다.
 *
 *   OUT=docs/metri/shots/pcu-premium/before \
 *   UI_BASE=http://127.0.0.1:3100 V3_PREVIEW_OPEN='*' \
 *     npx tsx scripts/pcu-premium-shots.ts
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

const OUT = process.env.OUT ?? "docs/metri/shots/pcu-premium/before";
const UNI = "PCU";
const DEPT = process.env.DEPT ?? "";

const WIDE = { width: 1440, height: 900 };
const NARROW = { width: 375, height: 812 };

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass += 1; console.log(`  통과  ${w}${saw ? " — " + saw : ""}`); }
  else { bad.push(w); console.log(`  걸림  ${w}${saw ? " — " + saw : ""}`); }
};

/** 찍으면서 가로 넘침을 함께 센다. 재는 자리와 찍는 자리가 같아야 한다 */
const overflow: { where: string; px: number }[] = [];
/** 같은 그림이 두 이름으로 저장되면 자리를 잘못 찾은 것이다 */
const seen = new Map<string, string>();
const dup: string[] = [];

async function note(p: Page, name: string, who: string): Promise<void> {
  const over = await p.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (over > 1) overflow.push({ where: `${name}.${who}`, px: over });
}

function stamp(file: string, name: string): void {
  const h = execFileSync("sha256sum", [file]).toString().split(" ")[0];
  const was = seen.get(h);
  if (was) dup.push(`${name} = ${was}`);
  else seen.set(h, name);
}

async function shot(p: Page, name: string, who: "d" | "m"): Promise<void> {
  const file = `${OUT}/${name}.${who === "d" ? "desktop" : "mobile"}.png`;
  await p.waitForLoadState("networkidle").catch(() => undefined);
  await p.waitForTimeout(220);
  await note(p, name, who);
  await p.screenshot({ path: file, fullPage: true });
  stamp(file, `${name}.${who}`);
}

/**
 * 절 하나만 찍는다.
 *
 * **못 찾으면 쪽 맨 위를 찍어 두지 않는다.** 그러면 열두 그림이 전부 쪽
 * 머리가 되고(한 번 그렇게 찍혔다) 아무 검사도 그것을 세지 못한다.
 */
async function shotEl(
  p: Page, sel: string, name: string, who: "d" | "m",
): Promise<boolean> {
  const el = p.locator(sel).first();
  if (!await el.count()) { bad.push(`${name}.${who} 자리를 못 찾았다 (${sel})`); return false; }
  await el.scrollIntoViewIfNeeded().catch(() => undefined);
  await p.waitForTimeout(180);
  await note(p, name, who);
  const file = `${OUT}/${name}.${who === "d" ? "desktop" : "mobile"}.png`;
  await el.screenshot({ path: file });
  stamp(file, `${name}.${who}`);
  pass += 1;
  return true;
}

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

/** 결과 상세를 펴 둔다. 접힌 자리는 높이가 0 이라 찍으면 빈 그림이 된다 */
async function openDetail(p: Page): Promise<void> {
  for (const sel of [".rs-openbtn", ".rs-foldbtn", "summary.rs-sum"]) {
    const n = await p.locator(sel).count();
    for (let i = 0; i < n; i += 1) {
      await p.locator(sel).nth(i).click({ timeout: 2500 }).catch(() => undefined);
    }
  }
  await p.waitForTimeout(500);
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

  const mail = `pcupv-${Date.now()}@test.invalid`;
  const st = await makeStudent(mail);
  await registerCampusStudent(st.id, UNI, row.leaf.code);
  await query(
    `INSERT INTO entitlements
       (user_id, product_code, kind, tier, major_code, assessment_version, status)
     VALUES ($1,'ME_V3_PRO_KR','report','PRO','ME','ME_V3_2','active')`, [st.id]);

  const staffLogin = "pcupv-staff";
  const staffPw = "pv-" + Math.random().toString(36).slice(2, 12);
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


  /**
   * 담당자 화면을 찍으려면 사람이 다섯을 넘어야 한다.
   *
   * `campusV3` 는 응시자가 `MIN_CELL` 보다 적으면 **아래를 아예 세지
   * 않는다**(네 명짜리 표에서는 전공과 학위를 겹치면 누구인지 짐작이
   * 된다). 그래서 BEFORE 를 한 명으로 찍으면 KPI 넷만 서고 단과대학과
   * 학과 절이 한 줄도 없다. 그 그림으로는 §22 의 자리를 견줄 수 없다.
   *
   * **응답을 채우지 않는다**: 여기가 재는 것은 담당자 화면의 집계이고,
   * 그 집계가 세는 것은 응시 줄이다. 채점과 결과 모델은 건드리지 않는다.
   */
  const crowd = Number(process.env.CROWD ?? 6);
  const other = rows.find((r) => r.leaf.code !== row.leaf.code
    && r.leaf.core_code && r.college.code === row.college.code);
  for (let i = 0; i < crowd; i += 1) {
    const where = i < crowd - 1 ? row : (other ?? row);
    const peer = await makeStudent(`pcupv-${Date.now()}-${i}@test.invalid`);
    await registerCampusStudent(peer.id, UNI, where.leaf.code);
    const at = await openAttempt({
      userId: peer.id, tier: "PRO", stage: "bachelor", gradField: null,
      campus: {
        university_code: u.university_code, college_code: "",
        department_code: where.leaf.code,
        core_code: where.leaf.core_code as string,
        specialization: where.leaf.specialization ?? null,
      },
    });
    await query(
      `UPDATE v3_attempts SET status='scored', submitted_at=now() WHERE id=$1`,
      [at.id]);
  }
  console.log(`  담당자 집계용으로 ${crowd}명을 더 세웠다 (응답은 채우지 않는다)\n`);

  const gate = gateCreds();
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ args: ["--no-sandbox"] });
    const mk = async (v: typeof WIDE): Promise<BrowserContext> =>
      (browser as Browser).newContext({
        viewport: v, deviceScaleFactor: 2,
        ...(gate ? { httpCredentials: gate } : {}),
      });

    /* 01~03. 로그인하지 않은 사람이 보는 세 자리. **과도하게 만지지 않는
       자리이므로**(규격 §2) 여기 BEFORE 는 AFTER 와 같아야 한다 */
    const anonD = await mk(WIDE), anonM = await mk(NARROW);
    const ad = await anonD.newPage(), am = await anonM.newPage();
    await both(ad, am, `/campus/${UNI.toLowerCase()}`, "01-landing");
    await both(ad, am, `/campus/${UNI.toLowerCase()}/majors`, "02-department");
    await both(ad, am, `/campus/${UNI.toLowerCase()}/login`, "03-login");
    ok("학교 진입 세 자리를 찍었다", true);
    await anonD.close(); await anonM.close();

    /* 04. 검사. 주소로 열지 않고 그 사람의 길을 밟는다 */
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

    let found = false;
    for (let i = 0; i < 24 && !found; i += 1) {
      await d.waitForLoadState("networkidle").catch(() => undefined);
      if (/\/v3\/\d+/.test(d.url()) && await d.locator(".qs-own").count()) {
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

    /* 05~11. 결과. 검사는 서버에서 끝까지 채운다 — 여기가 재는 것은 결과를
       받은 사람이 보는 화면이고, 검사가 도는지는 `v3:runtime` 이 센다 */
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

    /** 결과지의 절 일곱. BEFORE 에 그래프가 있는 자리는 없다 */
    const SECTS: [string, string][] = [
      ["05-result-hero", ".rs-hero"],
      ["06-result-summary", ".rs-top"],
      ["07-radar", "#spread, #zones"],
      ["08-evidence", "#evidence"],
      ["09-gap", "#gaps"],
      ["10-industry", "#industry"],
      ["11-action", "#plan"],
    ];
    for (const [p, who] of [[d, "d"], [m, "m"]] as const) {
      await p.goto(`${BASE}/v3/${a0.id}/result`, { waitUntil: "domcontentloaded" });
      await openDetail(p);
      for (const [name, sel] of SECTS) await shotEl(p, sel, name, who);
    }
    ok("결과지 절 일곱을 두 폭으로 찍었다", true);

    /* 12~15. 종이. **쪽 번호를 글자로 적지 않는다**: 절이 늘면 그 번호가
       다른 쪽을 가리키고, 그림은 멀쩡히 저장되어 아무도 모른다 */
    const res = await d.request.get(`${BASE}/v3/${a0.id}/result/pdf`, { timeout: 180000 });
    const pdfOk = res.status() === 200
      && (res.headers()["content-type"] ?? "").includes("pdf");
    if (pdfOk) {
      const file = `${OUT}/report.pdf`;
      writeFileSync(file, await res.body());
      const txt = execFileSync("pdftotext", ["-layout", file, "-"]).toString();
      const pages = txt.split("\f");
      /* **표지를 건너뛰고 찾는다.** 표지가 아홉 절의 차례를 들고 있어서,
         첫 쪽부터 찾으면 세 낱말이 모두 1쪽에서 걸리고 **그림 넷이 전부
         표지로 저장된다**(한 번 그렇게 저장됐다) */
      const find = (kw: string): number => {
        const i = pages.findIndex((t, n) => n > 0 && t.includes(kw));
        return i < 0 ? 1 : i + 1;
      };
      const want: [string, number][] = [
        ["12-pdf-cover", 1],
        ["13-pdf-radar", find("기술영역")],
        ["14-pdf-evidence", find("지원서")],
        ["15-pdf-action", find("다음에 할 일")],
      ];
      for (const [name, pg] of want) {
        execFileSync("pdftoppm", ["-f", String(pg), "-l", String(pg), "-r", "110",
          "-png", "-singlefile", file, `${OUT}/${name}`]);
        stamp(`${OUT}/${name}.png`, name);
      }
      ok(`종이 ${pages.length}쪽에서 네 쪽을 떴다`, true,
        want.map(([n, p]) => `${n}=${p}`).join(" · "));
    } else ok("종이를 뽑았다", false, `HTTP ${res.status()}`);

    /* 16. 작업공간 */
    await both(d, m, "/me", "16-me");

    /* 17~18. 담당자. 학과 drill-down 은 아직 쪽이 없어서 첫 화면의 절을
       찍는다 — 그 사실이 이 회차가 고칠 자리다(규격 §22) */
    const od = await mk(WIDE), om = await mk(NARROW);
    const gd = await login(od, staffLogin, staffPw);
    const gm = await login(om, staffLogin, staffPw);
    await both(gd, gm, "/org/v3", "17-admin-overview");
    for (const [p, who] of [[gd, "d"], [gm, "m"]] as const) {
      const sect = p.locator("section.sf-section")
        .filter({ has: p.locator("h2.sf-h2", { hasText: "학과" }) }).first();
      if (await sect.count()) {
        await sect.scrollIntoViewIfNeeded().catch(() => undefined);
        await p.waitForTimeout(150);
        const f = `${OUT}/18-admin-department.${who === "d" ? "desktop" : "mobile"}.png`;
        await sect.screenshot({ path: f });
        stamp(f, `18-admin-department.${who}`);
        pass += 1;
      } else bad.push(`18-admin-department.${who} 학과 절이 서지 않았다`);
    }
    ok("담당자 두 자리를 찍었다", !/\/login/.test(gd.url()), gd.url());
    await od.close(); await om.close();
    await sd.close(); await sm.close();
  } finally {
    await browser?.close().catch(() => undefined);
  }

  ok(`가로로 밀리지 않는다 — 넘친 자리 ${overflow.length}`,
    !overflow.length, overflow.map((x) => `${x.where} ${x.px}px`).join(" · "));
  ok(`같은 그림이 두 이름으로 저장되지 않았다 — ${dup.length}`,
    !dup.length, dup.join(" · "));

  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length} · ${OUT}`);
  if (bad.length) { console.log(bad.map((b) => `  · ${b}`).join("\n")); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
