/**
 * **지금 있는 운영자 화면을 그대로 찍어 본다.**
 *
 * 이 회차가 묻는 것은 `무엇을 더 만들까` 가 아니다. **배재대 담당자가
 * 지금 이 배포본에서 실제로 어느 화면을 보고 어디서 일을 끝낼 수 있는가**
 * 이고, 그 답을 코드 설명이 아니라 **찍은 그림과 눌러 본 결과**로 적는다.
 * 그래서 이 파일은 제품을 한 줄도 고치지 않고 읽고 누르고 찍기만 한다.
 *
 * **없는 화면을 억지로 찍지 않는다.** 자리가 없으면 `MISSING` 으로 적고
 * 그림을 만들지 않는다: 비슷한 쪽을 찍어 두면 다음 사람이 그것을 그
 * 화면으로 읽는다.
 *
 * **운영 자료를 건드리지 않는다.** 주소가 이 기계의 것이 아니면 그 자리에서
 * 멈추고, 만드는 사람과 기관은 전부 끝에서 치운다.
 *
 *   V3_PREVIEW_OPEN='*' bash scripts/stage-serve.sh 3100
 *   UI_BASE=http://127.0.0.1:3100 npx tsx scripts/pcu-ops-survey.ts
 */
import { loadEnv, BASE, assertFreshServer, gateCreds, login } from "./_loop-fixture";
loadEnv();
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { appEnv } from "../src/lib/env";
import { allLeaves, university } from "../src/lib/campus/registry";
import { clearCampusCohort, seedCampusCohort } from "./_campus-fixture";

const OUT = process.env.OUT ?? "docs/metri/shots/pcu-ops-survey";
const WIDE = { width: 1440, height: 900 };
const MID = { width: 1280, height: 860 };

/** 담당자 화면에 서면 읽는 사람이 집계가 깨진 줄로 본다 */
const CODES = [/\bZ[1-5]_[A-Z]/, /\bNOT_EXPLORED\b/, /\bTD\d{2}\b/, /_CORE_V\d/];

let pass = 0; const bad: string[] = [];
const shots: { no: string; name: string; file: string; note: string }[] = [];
/**
 * 같은 그림이 두 이름으로 저장되면 걸린다.
 *
 * 자리를 잘못 찾아 같은 쪽을 두 번 찍어 두면 목록은 늘고 본 자리는 늘지
 * 않는다. 이 저장소에서 여러 번 그렇게 속았다.
 */
const seen = new Map<string, string>();
const ok = (w: string, c: boolean, saw = ""): void => {
  if (c) { pass += 1; console.log(`  통과  ${w}${saw ? ` — ${saw}` : ""}`); }
  else { bad.push(w); console.log(`  걸림  ${w}${saw ? ` — ${saw}` : ""}`); }
};
const say = (w: string, saw: string): void => console.log(`  적어둠  ${w} — ${saw}`);

function assertLocalDb(): string {
  if (appEnv() === "production") throw new Error("운영에서는 돌리지 않습니다.");
  const url = process.env.DATABASE_URL ?? "";
  if (!url) throw new Error("DATABASE_URL 이 없습니다.");
  const host = (/@([^/:?]+)/.exec(url)?.[1] ?? "").toLowerCase();
  const local = !host || host === "localhost" || host === "127.0.0.1"
    || url.startsWith("postgres:///") || url.includes("/var/run/postgresql");
  if (!local) throw new Error(`이 기계의 DB 가 아닙니다(${host}). 쓰는 검사라 거절합니다.`);
  return host || "유닉스 소켓";
}

async function shoot(
  p: Page, no: string, name: string, tag: string, note: string,
  sel?: string,
): Promise<void> {
  await p.waitForLoadState("networkidle").catch(() => undefined);
  mkdirSync(OUT, { recursive: true });
  const file = `${no}-${name}-${tag}.png`;
  if (sel) {
    const el = p.locator(sel).first();
    const n = await el.count();
    if (!n) { ok(`${no} ${name} — 그 묶음이 선다`, false, sel); return; }
    await el.screenshot({ path: path.join(OUT, file) });
  } else {
    await p.screenshot({ path: path.join(OUT, file), fullPage: true });
  }
  const dig = createHash("sha256").update(readFileSync(path.join(OUT, file))).digest("hex");
  const twin = seen.get(dig);
  ok(`${no} ${name} ${tag} — 앞서 찍은 그림과 같지 않다`, !twin, twin ?? "");
  seen.set(dig, file);
  shots.push({ no, name, file, note });
  const over = await p.evaluate(() =>
    document.documentElement.scrollWidth - window.innerWidth);
  ok(`${no} ${name} ${tag} — 가로로 밀리지 않는다`, over <= 1, `${over}px`);
  const body = await p.evaluate(() => document.body.innerText);
  const hit = CODES.filter((re) => re.test(body)).map(String);
  ok(`${no} ${name} ${tag} — 안쪽 코드가 없다`, !hit.length, hit.join(" "));
}

/** 그 기관의 담당자 하나를 그 자리에서 만든다 */
async function staff(
  login_id: string, orgCode: string, role: string,
): Promise<{ id: string; pw: string }> {
  const org = await queryOne<{ id: string }>(
    `SELECT id::text FROM organizations WHERE code = $1`, [orgCode]);
  if (!org) throw new Error(`${orgCode} 기관 줄이 없습니다`);
  const pw = "sv-" + Math.random().toString(36).slice(2, 12);
  const hash = await hashPassword(pw);
  const old = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [login_id]);
  let id = old?.id;
  if (id) {
    await query(`UPDATE users SET password_hash=$2, status='active' WHERE id=$1`, [id, hash]);
    await query(`DELETE FROM memberships WHERE user_id = $1`, [id]);
  } else {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO users (login_id, email, display_name, password_hash,
                          status, locale, is_demo, must_reset_pw)
       VALUES ($1,$1,'학과 담당자',$2,'active','ko',TRUE,FALSE) RETURNING id::text`,
      [login_id, hash]);
    id = row?.id as string;
  }
  await query(`INSERT INTO memberships (user_id, org_id, role) VALUES ($1,$2,$3)`,
    [id, org.id, role]);
  return { id, pw };
}

async function dropUser(login_id: string): Promise<void> {
  const row = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [login_id]);
  if (!row) return;
  for (const t of ["campus_students", "v3_attempts", "memberships",
                   "entitlements", "career_profiles", "audit_logs"]) {
    await query(`DELETE FROM ${t} WHERE ${t === "audit_logs" ? "actor_id" : "user_id"} = $1`,
      [row.id]).catch(() => undefined);
  }
  await query(`DELETE FROM users WHERE id = $1`, [row.id]).catch(() => undefined);
}

async function main(): Promise<void> {
  assertFreshServer();
  const host = assertLocalDb();
  console.log(`\n── 운영자 화면 실사 (LOCAL · DB ${host})\n`);

  const u = university("PCU");
  if (!u) throw new Error("등록부에 PCU 가 없습니다");
  const leaves = allLeaves(u);

  const cohort = await seedCampusCohort("PCU", "sv");
  const admin = await staff("zzsv-staff", "PCU", "org_admin");

  /* 범위 밖 담당자. **등록부에 없는 기관이라 학교 화면이 닫힌다** */
  await query(
    `INSERT INTO organizations (code, name, country, org_type, is_demo)
     VALUES ('ZZSURVEY','검사용 기관','KR','university',TRUE)
     ON CONFLICT (code) DO NOTHING`).catch(() => undefined);
  const outsider = await staff("zzsv-outsider", "ZZSURVEY", "org_admin");

  const gate = gateCreds();
  const br: Browser = await chromium.launch();
  const mk = async (vp: { width: number; height: number }): Promise<BrowserContext> =>
    br.newContext({ viewport: vp, httpCredentials: gate ?? undefined, acceptDownloads: true });

  const ctx = await mk(WIDE);
  const p = await login(ctx, "zzsv-staff", admin.pw);
  ok("담당자 로그인이 /org 로 간다", new URL(p.url()).pathname.startsWith("/org"), p.url());

  const go = async (u2: string) => {
    await p.goto(`${BASE}${u2}`, { waitUntil: "networkidle" });
    return p.evaluate(() => document.body.innerText);
  };

  /* ── §2 열네 화면 ─────────────────────────────────────────── */
  console.log("\n── §2 화면\n");

  await go("/org");
  await shoot(p, "01", "org-home", "w1440", "담당자 첫 화면 /org");

  await go("/org/v3");
  await shoot(p, "02", "v3-overview", "w1440", "전체 응시 현황 /org/v3");
  await shoot(p, "03", "by-college", "sec",
    "단과대학별 현황 — /org/v3 안의 묶음",
    'section.sf-section:has(h2:text-is("단과대학별 응시 현황"))');
  await shoot(p, "04", "by-department", "sec",
    "학과별 현황 — /org/v3 안의 묶음",
    'section.sf-section:has(h2:text-is("학과"))');
  await shoot(p, "12", "export", "sec",
    "내려받기 — /org/v3 안의 묶음",
    'section.sf-section:has(h2:text-is("내려받기"))');

  await go("/org/v3/report");
  await shoot(p, "12b", "ops-report", "w1440",
    "대학 운영 요약 /org/v3/report — 종이로 뽑기 전에 화면에서 본다");

  await go("/org/v3/students");
  await shoot(p, "05", "students", "w1440", "학생 목록 /org/v3/students");

  const q = cohort.big.name;
  await go(`/org/v3/students?q=zzsv-big0`);
  await shoot(p, "07a", "students-search", "w1440", "검색 — q=학번");
  await go(`/org/v3/students?department=${encodeURIComponent(cohort.tiny.code)}`);
  await shoot(p, "07b", "students-filter-dept", "w1440", `학과 필터 — ${cohort.tiny.name}`);
  await go("/org/v3/students?state=none");
  await shoot(p, "07c", "students-filter-state", "w1440", "상태 필터 — 미응시");

  await go("/org/v3/students/import");
  await shoot(p, "08", "csv-import", "w1440", "CSV 등록 /org/v3/students/import");

  await go("/org/participants");
  await shoot(p, "15", "participants", "w1440", "참여자 /org/participants — 옛 검사 쪽 명단");
  await go("/org/licenses");
  await shoot(p, "16", "licenses", "w1440", "좌석 /org/licenses — 계약 좌석");

  await go("/org/settings");
  await shoot(p, "13", "org-settings", "w1440", "권한·설정 자리 — 아직 열려 있지 않다");

  /* ── §4 실제로 눌러 본다 ──────────────────────────────────── */
  console.log("\n── §4 눌러 본다\n");

  /* 학생 추가 */
  const sid = `zzsv-add-${Date.now() % 100000}`;
  await go("/org/v3/students");
  await p.locator("details.sf-fold summary").first().click();
  await p.fill('input[name="student_id"]', sid);
  await p.fill('input[name="name"]', "추가 확인");
  await p.selectOption('select[name="department_code"]', cohort.big.code);
  await p.click('button:has-text("계정 만들기")');
  await p.waitForSelector(".sf-issued, .sf-note.is-bad", { timeout: 20000 }).catch(() => undefined);
  await shoot(p, "06x", "student-add-issued", "w1440",
    "학생 한 명 추가 — 새 비밀번호를 한 번만 보여 준다");
  const added = await queryOne<{ id: string; status: string }>(
    `SELECT u.id::text, u.status FROM campus_students cs
       JOIN users u ON u.id = cs.user_id
      WHERE cs.university_code='PCU' AND cs.student_id = $1`, [sid]);
  ok("학생 추가가 실제로 줄을 만든다", Boolean(added), sid);

  /* 비밀번호 재발급 */
  const before = await queryOne<{ h: string }>(
    `SELECT password_hash h FROM users WHERE id = $1::bigint`, [added?.id ?? "0"]);
  await go(`/org/v3/students?q=${sid}`);
  p.once("dialog", (d) => d.accept());
  await p.locator('button:has-text("비밀번호 재발급")').first().click();
  await p.waitForSelector(".sf-issued", { timeout: 20000 }).catch(() => undefined);
  await shoot(p, "10", "password-reset", "w1440", "비밀번호 재발급 — 한 번만 보이는 새 열쇠");
  const after = await queryOne<{ h: string }>(
    `SELECT password_hash h FROM users WHERE id = $1::bigint`, [added?.id ?? "0"]);
  ok("비밀번호 재발급이 해시를 바꾼다", Boolean(before && after && before.h !== after.h));

  /* 비활성화 */
  await go(`/org/v3/students?q=${sid}`);
  await p.locator('button:has-text("계정 멈추기")').first().click();
  await p.waitForLoadState("networkidle").catch(() => undefined);
  await shoot(p, "11a", "account-disable", "w1440", "계정 멈추기를 누른 뒤");
  const off = await queryOne<{ s: string }>(
    `SELECT status s FROM users WHERE id = $1::bigint`, [added?.id ?? "0"]);
  ok("비활성화가 실제로 계정을 멈춘다", off?.s === "disabled", String(off?.s));

  await go("/org/v3/students?state=disabled");
  await shoot(p, "03s", "state-disabled", "w1440", "상태 — 비활성");

  /* 재활성화 */
  await go(`/org/v3/students?q=${sid}`);
  await p.locator('button:has-text("다시 열기")').first().click();
  await p.waitForLoadState("networkidle").catch(() => undefined);
  await shoot(p, "11b", "account-enable", "w1440", "다시 열기를 누른 뒤");
  const on = await queryOne<{ s: string }>(
    `SELECT status s FROM users WHERE id = $1::bigint`, [added?.id ?? "0"]);
  ok("재활성화가 실제로 계정을 연다", on?.s === "active", String(on?.s));

  /* CSV 미리 보기와 적용. **오류 줄을 일부러 섞는다** */
  const good1 = `zzsv-csv-a${Date.now() % 1000}`;
  const good2 = `zzsv-csv-b${Date.now() % 1000}`;
  const csv = [
    "student_id,name,department_code,email",
    `${good1},씨에스브이 하나,${cohort.big.code},`,
    `${good2},씨에스브이 둘,${cohort.tiny.code},`,
    `zzsv-csv-bad1,없는 학과,ZZ_NOT_IN_REGISTRY,`,
    `${good1},학번 겹침,${cohort.big.code},`,
    `zzsv-csv-bad3,메일 꼴 틀림,${cohort.big.code},not-an-email`,
  ].join("\n");
  const nSeed = Number((await queryOne<{ n: string }>(
    `SELECT count(*)::text n FROM campus_students WHERE university_code='PCU'`))?.n ?? "0");
  await go("/org/v3/students/import");
  await p.fill('textarea[name="csv"]', csv);
  await p.click('button:has-text("미리 보기")');
  await p.waitForSelector(".sf-table, .sf-note.is-bad", { timeout: 20000 }).catch(() => undefined);
  /* **CSV 오류를 따로 찍지 않는다.** 거절된 줄과 그 까닭이 미리 보기와
     같은 화면에 서므로, 이름을 둘로 두면 같은 그림이 두 장이 된다 */
  await shoot(p, "09", "csv-preview", "w1440",
    "CSV 미리 보기 — 아직 아무것도 쓰지 않았다. **거절된 줄과 까닭이 이 화면에 함께 선다**");
  const cnt = async (): Promise<number> => Number((await queryOne<{ n: string }>(
    `SELECT count(*)::text n FROM campus_students WHERE university_code='PCU'`))?.n ?? "0");
  const nBefore = await cnt();
  ok("미리 보기는 아무것도 쓰지 않는다", nBefore === nSeed, `${nSeed} → ${nBefore}`);
  await p.locator('button:has-text("줄 적용")').first().click();
  /* **적용이 끝난 것을 기다린다.** 미리 보기 표가 이미 서 있어서
     `.sf-table` 을 기다리면 그 자리에서 바로 돌아오고, 그 상태로 센 줄
     수는 적용 전 값이다. 한 번 그렇게 멀쩡한 적용을 걸림으로 적었다 */
  await p.waitForSelector('h2:text-is("적용했습니다"), .sf-note.is-bad',
    { timeout: 60000 }).catch(() => undefined);
  await shoot(p, "09a", "csv-applied", "w1440", "CSV 적용 결과 — 만듦·고침·거절");
  const nAfter = await cnt();
  ok("CSV 적용이 정상 줄만 만든다", nAfter - nBefore === 2, `${nBefore} → ${nAfter}`);

  /* 내려받기 셋. **실제 바이트를 받아 본다** */
  for (const [name, p2] of [
    ["students.csv", "/org/v3/export/students.csv"],
    ["departments.csv", "/org/v3/export/departments.csv"],
    ["report.pdf", "/org/v3/report.pdf"],
  ] as const) {
    const r = await p.request.get(`${BASE}${p2}`);
    const buf = await r.body();
    ok(`내려받기 ${name} 가 실제로 나온다`, r.status() === 200 && buf.length > 200,
      `${r.status()} · ${buf.length}B`);
    mkdirSync(path.join(OUT, "files"), { recursive: true });
    writeFileSync(path.join(OUT, "files", name), buf);
  }

  /* ── §3 상태 ──────────────────────────────────────────────── */
  console.log("\n── §3 상태\n");
  await go("/org/v3/students?state=in_progress");
  await shoot(p, "03b", "state-in-progress", "w1440", "상태 — 진행중");
  await go("/org/v3/students?state=scored");
  await shoot(p, "03c", "state-scored", "w1440", "상태 — 완료");
  await go("/org/v3/students?q=zzzz-%EC%97%86%EB%8A%94%EC%9D%B4%EB%A6%84");
  await shoot(p, "03d", "state-empty-search", "w1440", "상태 — 빈 검색 결과");
  const emptyLeaf = leaves.find((r) =>
    r.leaf.code !== cohort.big.code && r.leaf.code !== cohort.tiny.code);
  if (emptyLeaf) {
    await go(`/org/v3/students?department=${encodeURIComponent(emptyLeaf.leaf.code)}`);
    await shoot(p, "03e", "state-zero-students", "w1440",
      `상태 — 학생 0명 (${emptyLeaf.leaf.name})`);
  }
  await go(`/org/v3?department=${encodeURIComponent(cohort.tiny.code)}`);
  await shoot(p, "03f", "state-suppressed", "w1440",
    `상태 — 5명 미만 (${cohort.tiny.name})`);

  /* 오류 상태: 등록부 밖 기관 */
  const ctx2 = await mk(WIDE);
  const p2 = await login(ctx2, "zzsv-outsider", outsider.pw);
  await p2.goto(`${BASE}/org/v3/students`, { waitUntil: "networkidle" });
  await shoot(p2, "03g", "state-scope-error", "w1440",
    "상태 — 학교 등록부에 없는 기관 (닫힌다)");
  const body2 = await p2.evaluate(() => document.body.innerText);
  ok("범위 밖 담당자에게 학생 목록이 열리지 않는다",
    body2.includes("학교 등록부에 연결된 기관이 아닙니다"));
  const r2 = await p2.request.get(`${BASE}/org/v3/export/students.csv`);
  ok("범위 밖 담당자는 내려받기도 막힌다",
    r2.status() !== 200 || !(await r2.text()).startsWith("﻿"),
    String(r2.status()));
  await ctx2.close();

  /* ── 1280 폭 ─────────────────────────────────────────────── */
  console.log("\n── 1280 폭\n");
  const ctxM = await mk(MID);
  const pm = await login(ctxM, "zzsv-staff", admin.pw);
  for (const [no, name, url] of [
    ["01", "org-home", "/org"],
    ["02", "v3-overview", "/org/v3"],
    ["05", "students", "/org/v3/students"],
    ["08", "csv-import", "/org/v3/students/import"],
  ] as const) {
    await pm.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
    await shoot(pm, no, name, "w1280", `${url} · 1280px`);
  }
  await ctxM.close();

  /* ── 운영사 전용 화면 (학교 담당자에게는 닫혀 있다) ──────── */
  console.log("\n── 운영사 전용\n");
  const r3 = await p.request.get(`${BASE}/admin/incidents`);
  ok("학교 담당자에게 /admin/incidents 가 열리지 않는다",
    r3.status() !== 200 || !(await r3.text()).includes("막혀 있는 것"),
    String(r3.status()));

  const su = "zzsv-super";
  const pwsu = "sv-" + Math.random().toString(36).slice(2, 12);
  const oldsu = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [su]);
  const hsu = await hashPassword(pwsu);
  if (oldsu) {
    await query(`UPDATE users SET password_hash=$2, status='active' WHERE id=$1`,
      [oldsu.id, hsu]);
    await query(`DELETE FROM memberships WHERE user_id = $1`, [oldsu.id]);
    await query(`INSERT INTO memberships (user_id, org_id, role)
                 SELECT $1, id, 'superadmin' FROM organizations WHERE code='PCA'`,
      [oldsu.id]);
  } else {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO users (login_id, email, display_name, password_hash,
                          status, locale, is_demo, must_reset_pw)
       VALUES ($1,$1,'운영자',$2,'active','ko',TRUE,FALSE) RETURNING id::text`,
      [su, hsu]);
    await query(`INSERT INTO memberships (user_id, org_id, role)
                 SELECT $1, id, 'superadmin' FROM organizations WHERE code='PCA'`,
      [row?.id]);
  }
  const ctx3 = await mk(WIDE);
  const p3 = await login(ctx3, su, pwsu);
  await p3.goto(`${BASE}/admin/incidents`, { waitUntil: "networkidle" });
  await shoot(p3, "14", "admin-incidents", "w1440",
    "사고·오류 관리 /admin/incidents — **운영사 전용**");
  await p3.goto(`${BASE}/admin/sites`, { waitUntil: "networkidle" });
  await shoot(p3, "14b", "admin-sites", "w1440", "사이트 /admin/sites — 운영사 전용 · 읽기만");
  await p3.goto(`${BASE}/admin/users`, { waitUntil: "networkidle" });
  await shoot(p3, "13b", "admin-users", "w1440",
    "권한·사용자 /admin/users — 자리만 잡아 두었다");
  await ctx3.close();

  await ctx.close();
  await br.close();

  /* ── 치운다 ──────────────────────────────────────────────── */
  await clearCampusCohort(cohort.logins);
  /* **`zzsv` 로 시작하는 줄은 이 검사의 것이다.** 하나씩 이름을 적어
     지우면 가운데서 터진 앞 회차의 줄이 남고, 남은 그 줄이 다음 번
     담당자 화면에 선다. 접두어로 쓸어 담는다 */
  const mine = await query<{ id: string; login_id: string }>(
    `SELECT id::text, login_id FROM users WHERE login_id LIKE 'zzsv%'`);
  for (const m of mine) {
    for (const t of ["campus_students", "v3_attempts", "memberships",
                     "entitlements", "career_profiles", "analytics_events"]) {
      await query(`DELETE FROM ${t} WHERE user_id = $1`, [m.id]).catch(() => undefined);
    }
    await query(`DELETE FROM audit_logs WHERE actor_id = $1::bigint`, [m.id])
      .catch(() => undefined);
    await query(`DELETE FROM users WHERE id = $1`, [m.id]).catch(() => undefined);
  }
  await query(`DELETE FROM organizations WHERE code = 'ZZSURVEY'`).catch(() => undefined);
  const left = await queryOne<{ n: string }>(
    `SELECT count(*)::text n FROM users WHERE login_id LIKE 'zzsv%'`);
  ok("쓴 자료를 끝에서 치운다", Number(left?.n) === 0, `${left?.n}명 남음`);

  /* ── 그림 목록 ───────────────────────────────────────────── */
  mkdirSync(OUT, { recursive: true });
  const idx = shots.map((s) => `| ${s.no} | ${s.name} | \`${s.file}\` | ${s.note} |`).join("\n");
  writeFileSync(path.join(OUT, "INDEX.md"),
    `# 운영자 화면 실사 — screenshot index\n\n`
    + `찍은 자리 ${shots.length}장. 자리가 없는 것은 그림을 만들지 않았다.\n\n`
    + `| 번호 | 이름 | 파일 | 무엇인가 |\n|---|---|---|---|\n${idx}\n`);
  console.log(`\n그림 ${shots.length}장 · ${OUT}/INDEX.md`);
  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  for (const b of bad) console.log(`  걸림  ${b}`);
  if (bad.length) process.exitCode = 1;
}

main().then(() => process.exit(process.exitCode ?? 0)).catch((e) => {
  console.error(e); process.exit(1);
});
