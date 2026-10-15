/**
 * **사람이 눈으로 볼 묶음을 한 번에 뜬다**(규격 §58).
 *
 * 자리 목록을 주소로 열어 찍지 않는다. 학생 쪽은 **밟는 차례 그대로**
 * 지나며 찍고(포털 → 학과 → 로그인 → 시작 → 응시 → 결과 → 작업공간),
 * 담당자 쪽은 담당자 쿠키로 찍는다. 자리마다 **무엇을 보아야 하는지**를
 * 색인에 함께 적는다: 그림만 쌓아 두면 다음 사람이 무엇을 판정해야
 * 하는지 모른다.
 *
 * 찍는 길에 넷을 같이 센다. 그림은 멀쩡히 저장되면서 쪽이 쓸 수 없는
 * 모양일 수 있고, 그 셋은 상태 코드로 지나간다.
 *
 *   쪽이 열렸는가 · 안쪽 코드가 손님 화면에 서지 않는가 · 가로로 밀리지
 *   않는가 · **같은 그림이 두 이름으로 저장되지 않는가**(자리를 잘못
 *   찾아 같은 쪽을 열두 번 찍어 두는 일을 막는 자리다)
 *
 *   UI_BASE=http://127.0.0.1:3100 npm run pcu:review
 */
import {
  loadEnv, BASE, assertFreshServer, assertPreviewServer, gateCreds, login,
  makeStudent, registerCampusStudent, cloneFinished,
} from "./_loop-fixture";
loadEnv();
import { chromium, type BrowserContext, type Page } from "playwright";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { query, queryOne } from "../src/lib/db";
import { clearCampusCohort, seedCampusCohort } from "./_campus-fixture";
import { hashPassword } from "../src/lib/password";
import { addStudentAccount } from "../src/lib/campus/manage";
import { allLeaves, coreOf, statusOf, university } from "../src/lib/campus/registry";
import { attemptOf, planFor, type V3Attempt } from "../src/lib/me-v3/runtime/session";
import { walk, enterAssessment } from "./_v3-walk";

const UNI = "PCU";
const OUT = process.env.OUT ?? "docs/metri/shots/pcu-review";
const WIDTHS: [string, number, number][] = [["desktop", 1440, 900], ["mobile", 390, 844]];

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass++; console.log(`  통과  ${w}`); }
  else { bad.push(w); console.log(`  걸림  ${w} ${saw}`); }
};

/** 자리 하나. `look` 은 사람이 그 그림에서 볼 것이다 */
type Spot = { id: string; what: string; url: string; look: string; guest: boolean };

const CODE = /\bTD\d\d\b|\b[A-Z]{2,6}_CORE_V\d\b|\bSPEC_[A-Z_]+\b|\bPCU2[67]_[A-Z_]+\b|\bZ[1-4]_[A-Z_]+\b/;

async function shoot(
  ctx: BrowserContext, p: Page, s: Spot, w: string, dir: string,
  seen: Map<string, string>,
): Promise<void> {
  const res = await p.goto(`${BASE}${s.url}`, { waitUntil: "networkidle" })
    .catch(() => null);
  ok(`${s.id} ${w} 쪽이 열린다 — ${s.what}`,
    Boolean(res) && (res as { status(): number }).status() < 400,
    res ? String((res as { status(): number }).status()) : "열리지 않았다");
  const file = `${dir}/${s.id}-${w}.png`;
  await p.screenshot({ path: file, fullPage: true });
  const body = (await p.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ");
  if (s.guest) {
    const hit = CODE.exec(body);
    ok(`${s.id} ${w} 안쪽 코드가 없다`, !hit, hit ? hit[0] : "");
  }
  const over = await p.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth + 2);
  ok(`${s.id} ${w} 가로로 밀리지 않는다`, !over);
  /* **같은 그림이 두 이름으로 저장되면 자리를 잘못 찾은 것이다** */
  const sum = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
  const had = seen.get(`${w}:${sum}`);
  ok(`${s.id} ${w} 다른 자리와 같은 그림이 아니다`, !had, had ?? "");
  seen.set(`${w}:${sum}`, s.id);
}

async function staff(): Promise<{ login: string; pw: string }> {
  const name = "zzreview-staff";
  const pw = "rev-" + Math.random().toString(36).slice(2, 12);
  const org = await queryOne<{ id: string }>(
    `SELECT id::text FROM organizations WHERE code = $1`, [UNI]);
  if (!org) throw new Error(`${UNI} 기관 줄이 없습니다 (npm run pcu:org)`);
  const old = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [name]);
  const hash = await hashPassword(pw);
  let id = old?.id;
  if (id) {
    await query(`UPDATE users SET password_hash = $2, status = 'active' WHERE id = $1`,
      [id, hash]);
    await query(`DELETE FROM memberships WHERE user_id = $1`, [id]);
  } else {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO users (login_id, email, display_name, password_hash,
                          status, locale, is_demo, must_reset_pw)
       VALUES ($1,$1,'학과 담당자',$2,'active','ko',TRUE,FALSE) RETURNING id::text`,
      [name, hash]);
    id = row?.id as string;
  }
  await query(
    `INSERT INTO memberships (user_id, org_id, role) VALUES ($1,$2,'org_admin')`,
    [id, org.id]);
  return { login: name, pw };
}

/**
 * 감사 기록을 적을 담당자 하나.
 *
 * **`actor_id` 를 지어내지 않는다.** `audit_logs.actor_id` 가 `users` 를
 * 가리키는 외래키라, 없는 번호를 적으면 계정을 만드는 그 자리에서 터진다
 * (한 번 `0` 으로 적어 그렇게 멈췄다).
 */
async function auditActor(): Promise<{ id: string; login: string; pw: string }> {
  const name = "zzaudit-staff";
  const pw = "aud-" + Math.random().toString(36).slice(2, 12);
  const org = await queryOne<{ id: string }>(
    `SELECT id::text FROM organizations WHERE code = $1`, [UNI]);
  if (!org) throw new Error(`${UNI} 기관 줄이 없습니다 (npm run pcu:org)`);
  const had = await queryOne<{ id: string }>(
    `SELECT id::text FROM users WHERE login_id = $1`, [name]);
  const hash = await hashPassword(pw);
  let id = had?.id;
  if (id) {
    await query(`UPDATE users SET password_hash = $2, status = 'active' WHERE id = $1`,
      [id, hash]);
    await query(`DELETE FROM memberships WHERE user_id = $1`, [id]);
  } else {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO users (login_id, email, display_name, password_hash,
                          status, locale, is_demo, must_reset_pw)
       VALUES ($1,$1,'학과 담당자',$2,'active','ko',TRUE,FALSE) RETURNING id::text`,
      [name, hash]);
    id = row?.id as string;
  }
  await query(
    `INSERT INTO memberships (user_id, org_id, role) VALUES ($1,$2,'org_admin')`,
    [id, org.id]);
  return { id: id as string, login: name, pw };
}

async function main(): Promise<void> {
  assertFreshServer();
  mkdirSync(OUT, { recursive: true });
  const u = university(UNI);
  if (!u) throw new Error(`등록부에 ${UNI} 가 없습니다`);
  const leaves = allLeaves(u);
  const seat = leaves.find((r) => statusOf(u, r) === "READY" && coreOf(r.leaf));
  if (!seat) throw new Error("검사 가능한 자리가 없습니다 — V3_PREVIEW_OPEN 이 필요합니다");
  assertPreviewServer(seat.leaf.core_code ?? "");
  const route = leaves.find((r) => r.leaf.routing_only);
  if (!route) throw new Error("전공을 고르는 자리가 없습니다");
  const org = await queryOne<{ id: string }>(
    `SELECT id::text FROM organizations WHERE code = $1`, [UNI]);
  if (!org) throw new Error(`${UNI} 기관 줄이 없습니다 (npm run pcu:org)`);


  const boss = await auditActor();
  const actor = { userId: boss.id, role: "org_admin", orgId: Number(org.id) };
  const cohort = await seedCampusCohort(UNI, "review");
  const made: string[] = [];
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const spots: Spot[] = [];
  try {
    /* ── 바탕 셋: 응시 중인 학생 · 결과를 받은 학생 · 담당자 · 자율전공 ── */
    const sid = `zzrev${Date.now()}`;
    const st = await addStudentAccount(UNI, org.id, {
      student_id: sid, name: "검수용 학생", email: null, login_id: sid,
      college_code: seat.college.code, department_code: seat.leaf.code,
    }, actor);
    if (!st.ok || !st.password) throw new Error(`계정을 만들지 못했습니다: ${st.why}`);
    const stu = await queryOne<{ id: string }>(
      `SELECT id::text FROM users WHERE login_id = $1`, [sid]);
    if (!stu) throw new Error("발급한 계정을 찾지 못했습니다");
    made.push(stu.id);
    await query(`UPDATE users SET is_demo = FALSE WHERE id = $1::bigint`, [stu.id]);

    const rsid = `zzrevr${Date.now()}`;
    const rst = await addStudentAccount(UNI, org.id, {
      student_id: rsid, name: "자율전공 학생", email: null, login_id: rsid,
      college_code: route.college.code, department_code: route.leaf.code,
    }, actor);
    if (!rst.ok || !rst.password) throw new Error(`자율전공 계정: ${rst.why}`);
    const rstu = await queryOne<{ id: string }>(
      `SELECT id::text FROM users WHERE login_id = $1`, [rsid]);
    if (!rstu) throw new Error("자율전공 계정을 찾지 못했습니다");
    made.push(rstu.id);

    const who = await staff();
    const gate = gateCreds();
    const opts = gate ? { httpCredentials: gate } : {};

    /* 응시를 실제 길로 열고 몇 화면 답해 둔다 */
    const sctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
    const sp = await login(sctx, sid, st.password);
    await sp.goto(`${BASE}/campus/${UNI.toLowerCase()}/d/${seat.leaf.code}`,
      { waitUntil: "networkidle" });
    for (let t = 0; t < 2 && !/\/v3\//.test(sp.url()); t += 1) {
      await sp.locator('form button[type="submit"]').first().click({ timeout: 5000 })
        .catch(() => undefined);
      await sp.waitForURL((x) => !/\/campus\//.test(new URL(x).pathname),
        { timeout: 20000 }).catch(() => undefined);
      await sp.waitForLoadState("networkidle").catch(() => undefined);
    }
    /* 공통 시작 화면에서 학업 단계를 고른다(등급은 이용권이 정한다) */
    if (/\/v3\/start/.test(sp.url())) {
      await sp.getByText("학부", { exact: true }).click({ timeout: 5000 })
        .catch(() => undefined);
      await sp.getByRole("button", { name: "검사 시작" }).click({ timeout: 5000 })
        .catch(() => undefined);
      await sp.waitForURL(/\/v3\/\d+/, { timeout: 30000 }).catch(() => undefined);
      await sp.waitForLoadState("networkidle").catch(() => undefined);
    }
    const att = /\/v3\/(\d+)/.exec(sp.url())?.[1] ?? "";
    ok("응시가 실제 길로 열린다", Boolean(att), sp.url());
    /* 응시 화면 자리를 고르려면 계획이 필요하다 */
    await enterAssessment(sp);
    const a = (await attemptOf(att, stu.id)) as V3Attempt;
    const plan = await planFor(a);
    const grid = plan.screens.findIndex((s) => s.kind === "sweep");
    const quest = plan.screens.findIndex(
      (s) => s.kind === "single" || s.kind === "group");
    const last = plan.screens.length - 1;
    ok("응시 화면 자리를 찾는다", grid >= 0 && quest >= 0 && last > quest,
      `훑기 ${grid} · 문항 ${quest} · 끝 ${last}`);

    /* 결과를 받은 학생 하나 — 끝낸 응시를 베껴 오고 학교 맥락을 적는다 */
    const done = await cloneFinished(stu.id, "PRO");
    ok("결과를 받은 응시를 하나 둔다", Boolean(done), done ?? "없다");
    if (done) {
      await query(
        `UPDATE v3_attempts SET university_code = $2, college_code = $3,
                department_code = $4, specialization_code = $5, tier = 'PRO'
          WHERE id = $1::bigint`,
        [done, UNI, seat.college.code, seat.leaf.code,
          seat.leaf.specialization ?? null]);
    }

    const code = UNI.toLowerCase();
    const S: Spot[] = [
      { id: "S01", what: "학교 포털 첫 화면", url: `/campus/${code}`,
        look: "학교 이름과 다음 한 걸음. 개발 진행 숫자가 서지 않는다", guest: true },
      { id: "S02", what: "학과 고르기", url: `/campus/${code}/majors`,
        look: "단과대학 Tabs 와 학과 줄. 같은 본문이 되풀이되지 않는다", guest: true },
      { id: "S03", what: "학과 상세", url: `/campus/${code}/d/${seat.leaf.code}`,
        look: "그 전공이 다루는 영역과 시작 단추 하나", guest: true },
      { id: "S04", what: "학교 전용 로그인", url: `/campus/${code}/login`,
        look: "회원가입과 소셜 단추가 없다. 아이디가 학번이라고 적는다", guest: true },
      { id: "S05", what: "학과 확인과 시작", url: `/campus/${code}/start`,
        look: "학과를 다시 고르게 하지 않는다. 등급을 적지 않는다", guest: true },
      { id: "S06", what: "시작 안내", url: `/v3/${att}/intro`,
        look: "문항 수와 걸리는 시간. 그 전공에서 자주 서는 자리 셋", guest: true },
      { id: "S07", what: "영역 훑기", url: `/v3/${att}?s=${Math.max(grid, 0)}`,
        look: "격자 머리에 척도의 뜻이 한 번. 칸에는 번호만", guest: true },
      { id: "S08", what: "실제 판단 문항", url: `/v3/${att}?s=${Math.max(quest, 0)}`,
        look: "질문이 가장 크고 보기 넷이 한 행. 꼬리표 네 글자", guest: true },
      { id: "S09", what: "제출 전 검토", url: `/v3/${att}?s=${last}`,
        look: "빠뜨린 문항을 줄로 세우고 그 자리로 간다", guest: true },
      { id: "S10", what: "결과 첫 화면", url: done ? `/v3/${done}/result` : "/me",
        look: "지금 확인된 것 · 지금 할 일 · 먼저 채울 것 · 산업·직무 연결", guest: true },
      { id: "S11", what: "작업공간 홈", url: "/me",
        look: "지금 할 일이 1순위. 빈 카드가 서지 않는다", guest: true },
    ];
    const R: Spot[] = [
      { id: "R01", what: "자율전공 학생의 시작", url: `/campus/${code}/start`,
        look: "전공 고르기로 보낸다. 준비 중으로 적지 않고 전공을 정해 주지 않는다",
        guest: true },
    ];
    const U: Spot[] = [
      { id: "U01", what: "담당자 첫 화면", url: "/org",
        look: "지금 파는 검사의 집계로 가는 길", guest: false },
      { id: "U02", what: "집계", url: "/org/v3",
        look: "대상자 → 시작 → 완료 → 완료율 → 추이. 완료율이 100 을 넘지 않는다",
        guest: false },
      { id: "U03", what: "좁혀 본 집계",
        url: `/org/v3?college=${encodeURIComponent(seat.college.code)}`,
        look: "지금 보는 범위를 적는다", guest: false },
      { id: "U04", what: "학생 명단", url: "/org/v3/students",
        look: "개별 응답과 결과가 한 칸도 서지 않는다", guest: false },
      { id: "U05", what: "미응시만", url: "/org/v3/students?state=none",
        look: "상태 tab 마다 수가 적힌다", guest: false },
      { id: "U06", what: "CSV 로 한꺼번에 등록", url: "/org/v3/students/import",
        look: "오류 줄을 버리지 않고 줄 번호와 까닭을 적는다", guest: false },
      { id: "U07", what: "운영 요약", url: "/org/v3/report",
        look: "다섯 명 미만 칸이 수를 내지 않는다", guest: false },
    ];
    spots.push(...S, ...R, ...U);

    const seen = new Map<string, string>();
    for (const [w, ww, hh] of WIDTHS) {
      const dir = `${OUT}/${w}`;
      mkdirSync(dir, { recursive: true });
      /* 학생 — 발급 계정 */
      const c1 = await browser.newContext({ viewport: { width: ww, height: hh }, ...opts });
      const p1 = await login(c1, sid, st.password);
      for (const s of S) await shoot(c1, p1, s, w, OUT, seen);
      await c1.close();
      /* 자율전공 학생 */
      const c2 = await browser.newContext({ viewport: { width: ww, height: hh }, ...opts });
      const p2 = await login(c2, rsid, rst.password);
      for (const s of R) await shoot(c2, p2, s, w, OUT, seen);
      await c2.close();
      /* 담당자 */
      const c3 = await browser.newContext({ viewport: { width: ww, height: hh }, ...opts });
      const p3 = await login(c3, who.login, who.pw);
      for (const s of U) await shoot(c3, p3, s, w, OUT, seen);
      await c3.close();
    }
    await sctx.close();
  } finally {
    await browser.close();
    for (const id of made) {
      await query(`DELETE FROM v3_responses WHERE attempt_id IN
        (SELECT id FROM v3_attempts WHERE user_id = $1::bigint)`, [id]);
      await query(`DELETE FROM v3_snapshots WHERE attempt_id IN
        (SELECT id FROM v3_attempts WHERE user_id = $1::bigint)`, [id]);
      await query(`DELETE FROM v3_attempts WHERE user_id = $1::bigint`, [id]);
      await query(`DELETE FROM campus_students WHERE user_id = $1::bigint`, [id]);
      await query(`DELETE FROM memberships WHERE user_id = $1::bigint`, [id]);
      await query(`DELETE FROM entitlements WHERE user_id = $1::bigint`, [id]);
      await query(`DELETE FROM users WHERE id = $1::bigint`, [id]);
    }
    await clearCampusCohort(cohort.logins);
  }

  /* 색인. **무엇을 볼 것인가를 자리마다 적는다** */
  const lines = ["# PCU Human Review Pack", "",
    "자리 19 × 데스크톱 1440 · 손전화 390. 찍는 길은 밟는 차례 그대로다.", "",
    "| 자리 | 무엇 | 볼 것 | 데스크톱 | 손전화 |",
    "| --- | --- | --- | --- | --- |"];
  for (const s of spots) {
    lines.push(`| ${s.id} | ${s.what} | ${s.look} |`
      + ` \`${s.id}-desktop.png\` | \`${s.id}-mobile.png\` |`);
  }
  writeFileSync(`${OUT}/INDEX.md`, `${lines.join("\n")}\n`);
  console.log(`\n  색인 ${OUT}/INDEX.md`);
  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  if (bad.length) { for (const b of bad) console.log(`  - ${b}`); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
