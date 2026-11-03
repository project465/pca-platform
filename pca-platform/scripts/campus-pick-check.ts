/**
 * **참여자가 분야를 직접 고르는 기관**(`participant_picks`, 2026-11-03 대표 결정)을 실제 브라우저로 걷는다.
 *
 *   BASE=http://127.0.0.1:3100 UNI=SJEPA npm run campus:pick
 *
 * 두 사람을 발급한다: 명단에 분야가 적힌 사람(탐방 명단처럼 전기·전자)과 분야 칸을 비운 사람.
 * 둘 다 첫 검사 전에 고르는 쪽이 서는지, 미리 골라 둔 값이 없는지, 고르지 않으면 지나가지 못하는지,
 * 고른 분야가 계정 · 응시 · 담당자 화면에 남는지, 프로그램 소속과 MAT 이용권이 그대로인지 본다.
 * 계정은 이 점검이 만들고 끝나면 지운다. 로컬 · 시험 DB 에서만 돌린다(운영 DB 에서 돌리지 않는다).
 */
import { randomBytes } from "node:crypto";
import { chromium, type Page } from "playwright";
import { loadEnv, BASE } from "./_loop-fixture";

loadEnv();
const UNI = (process.env.UNI ?? "SJEPA").toUpperCase();
const results: { ok: boolean; name: string; why: string }[] = [];
const ok = (name: string, pass: boolean, why = "") => {
  results.push({ ok: pass, name, why });
  console.log(`  ${pass ? "통과" : "걸림"}  ${name}${why ? ` — ${why}` : ""}`);
};

(async () => {
  const { query, queryOne } = await import("../src/lib/db");
  const { applyImport } = await import("../src/lib/campus/manage");
  const { hashPassword } = await import("../src/lib/password");
  const { activeTrack } = await import("../src/lib/track");
  const { university, allLeaves, offered, statusOf, picksOwnField } = await import("../src/lib/campus/registry");
  const u = university(UNI);
  if (!u) throw new Error(`등록부에 ${UNI} 가 없습니다`);
  if (!picksOwnField(u)) throw new Error(`${UNI} 는 분야를 직접 고르는 기관이 아닙니다(participant_picks)`);
  const org = await queryOne<{ id: string }>(`SELECT id::text FROM organizations WHERE code = $1`, [UNI]);
  if (!org) throw new Error(`${UNI} 기관 줄이 없습니다`);
  const agency = u.org_kind === "agency";
  const ready = allLeaves(u).filter((r) => offered(r) && !r.leaf.routing_only && statusOf(u, r) === "READY");
  const registered = ready.find((r) => r.leaf.code.endsWith("_EE")) ?? ready[0];
  const picks = ready.filter((r) => r.leaf.code !== registered.leaf.code).slice(0, 2);
  console.log(`  고를 수 있는 분야 ${ready.length}개 · 명단 분야 ${registered.leaf.name} · 고를 분야 ${picks.map((r) => r.leaf.name).join(", ")}`);

  const adminPw = `A${randomBytes(9).toString("base64url")}9!`;
  const adminLogin = `pick-admin-${Date.now()}`;
  const admin = (await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash, status, locale, pw_login, must_reset_pw)
     VALUES ($1, $2, '분야 고르기 점검 담당자', $3, 'active', 'ko', TRUE, FALSE) RETURNING id::text`,
    [adminLogin, `${adminLogin}@example.invalid`, await hashPassword(adminPw)]))!;
  await query(`INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, 'org_admin')`, [admin.id, org.id]);

  const ids = [0, 1].map((k) => agency ? `0109${String(Date.now()).slice(-6)}${k}` : `9${String(Date.now()).slice(-7)}${k}`);
  const head = `${agency ? "휴대전화번호" : "학번"},이름,${agency ? "전공계열" : "학과"}\n`;
  const csv = head + `${ids[0]},분야점검가,${registered.leaf.code}\n${ids[1]},분야점검나,\n`;
  const made = await applyImport(UNI, org.id, csv, { userId: admin.id, role: "org_admin", orgId: org.id } as never);
  ok("CSV: 분야가 적힌 사람과 빈 사람 둘 다 발급된다", made.ok && made.created.length === 2,
    made.why ?? JSON.stringify(made.rejected.map((r) => r.why)));
  const uid = async (sid: string) => (await queryOne<{ id: string }>(
    `SELECT u.id::text FROM users u JOIN campus_students s ON s.user_id = u.id
      WHERE s.university_code = $1 AND s.student_id = $2`, [UNI, sid]))?.id ?? "";

  /* 첫 사람은 탐방 명단처럼: 프로그램 기수와 MAT 이용권을 미리 준다 */
  const A = await uid(ids[0]);
  const co = await queryOne<{ id: string }>(
    `SELECT id::text FROM cohorts WHERE org_id = $1::bigint AND program_code IS NOT NULL ORDER BY id LIMIT 1`, [org.id]).catch(() => null);
  if (co) await query(`INSERT INTO cohort_members (cohort_id, user_id) VALUES ($1::bigint, $2::bigint) ON CONFLICT DO NOTHING`, [co.id, A]);
  await query(
    `INSERT INTO entitlements (user_id, product_code, kind, starts_at, ends_at, status)
     VALUES ($1::bigint, 'CAMPUS_MAT_6M', 'track', now(), now() + interval '180 days', 'active')`, [A]);

  const br = await chromium.launch();
  const firstLogin = async (p: Page, sid: string) => {
    await p.goto(`${BASE}/campus/${UNI.toLowerCase()}/login`);
    await p.fill("#identifier", sid); await p.fill("#password", sid);
    await Promise.all([p.waitForLoadState("networkidle"), p.click('button[type="submit"]')]);
    if (!/\/password\/change/.test(p.url())) await p.goto(`${BASE}/password/change`);
    const next = `N${randomBytes(6).toString("base64url")}7!`;
    await p.fill("#current", sid); await p.fill("#next", next); await p.fill("#confirm", next);
    await p.click('button[type="submit"]');
    await p.waitForURL((x) => !x.pathname.startsWith("/password/change"), { timeout: 30000 }).catch(() => undefined);
  };

  const walk = async (label: string, sid: string, pick: typeof ready[number]) => {
    const ctx = await br.newContext();
    const p = await ctx.newPage();
    await firstLogin(p, sid);
    /* 이 주소를 바로 쳐도 고르는 쪽으로 간다 */
    await p.goto(`${BASE}/v3/start`); await p.waitForLoadState("networkidle");
    ok(`${label}: /v3/start 를 바로 쳐도 고르는 쪽으로 간다`, new URL(p.url()).pathname === `/campus/${UNI.toLowerCase()}/start`, p.url().replace(BASE, ""));
    await p.goto(`${BASE}/campus/${UNI.toLowerCase()}/start`);
    const h1 = (await p.locator("h1").first().textContent())?.trim() ?? "";
    ok(`${label}: 제목`, h1 === (agency ? "전공 계열을 골라 주세요" : "학과를 골라 주세요"), h1);
    const radios = p.locator('input[type="radio"][name="d"]');
    const n = await radios.count();
    ok(`${label}: 고를 수 있는 분야가 전부 보인다`, n === ready.length, `${n}개 / ${ready.length}개`);
    const checked = await p.locator('input[type="radio"][name="d"]:checked').count();
    ok(`${label}: 미리 골라 둔 값이 없다`, checked === 0, `${checked}개 골라져 있다`);
    const shown = await radios.evaluateAll((xs) => xs.map((x) => (x as HTMLInputElement).value));
    ok(`${label}: '분야 미정'(고르는 자리)은 목록에 없다`, !shown.some((c) => c.endsWith("_UNDECIDED")));
    /* 고르지 않고 누르면 지나가지 못한다 */
    await p.getByRole("button", { name: /검사 시작하기/ }).click();
    await p.waitForTimeout(1500);
    ok(`${label}: 고르지 않으면 지나가지 못한다`, new URL(p.url()).pathname === `/campus/${UNI.toLowerCase()}/start`, p.url().replace(BASE, ""));
    await p.check(`input[type="radio"][name="d"][value="${pick.leaf.code}"]`);
    await Promise.all([p.waitForURL(/\/v3\/\d+/, { timeout: 60000 }).catch(() => undefined), p.getByRole("button", { name: /검사 시작하기/ }).click()]);
    const att = /\/v3\/(\d+)/.exec(p.url())?.[1];
    ok(`${label}: 고른 분야로 응시가 열린다`, !!att, p.url().replace(BASE, ""));
    const me = await uid(sid);
    const row = await queryOne<{ department_code: string; college_code: string }>(
      `SELECT department_code, college_code FROM campus_students WHERE user_id = $1::bigint AND university_code = $2`, [me, UNI]);
    ok(`${label}: 고른 분야가 계정의 분야가 된다`, row?.department_code === pick.leaf.code && row?.college_code === pick.college.code,
      `${row?.department_code} / ${pick.leaf.code}`);
    const a = att ? await queryOne<{ department_code: string; core_code: string }>(
      `SELECT department_code, core_code FROM v3_attempts WHERE id = $1`, [att]) : null;
    ok(`${label}: 응시의 분야 · Core 가 고른 분야다`, a?.department_code === pick.leaf.code && a?.core_code === pick.leaf.core_code,
      `${a?.department_code} · ${a?.core_code} / ${pick.leaf.core_code}`);
    /* 한 번 시작한 뒤에는 고르는 쪽이 다시 서지 않는다 */
    await p.goto(`${BASE}/campus/${UNI.toLowerCase()}/start`);
    ok(`${label}: 시작한 뒤에는 고르는 쪽이 다시 서지 않는다`, (await p.locator('input[type="radio"][name="d"]').count()) === 0);
    await ctx.close();
    return me;
  };

  try {
    console.log(`\n── 명단에 ${registered.leaf.name} 로 적힌 사람`);
    await walk("분야 적힘", ids[0], picks[0]);
    ok("프로그램 기수 소속이 그대로다", !co || !!(await queryOne(`SELECT 1 FROM cohort_members WHERE cohort_id = $1::bigint AND user_id = $2::bigint`, [co.id, A])),
      co ? `기수 ${co.id}` : "프로그램 기수 없음(건너뜀)");
    ok("MAT 이용권이 그대로다", (await activeTrack(A)).on);
    console.log("\n── 명단에 분야를 비운 사람");
    await walk("분야 빈칸", ids[1], picks[1]);

    console.log("\n── 담당자 화면");
    const ctx = await br.newContext();
    const p = await ctx.newPage();
    await p.goto(`${BASE}/login`);
    await p.fill("#identifier", adminLogin); await p.fill("#password", adminPw);
    await Promise.all([p.waitForLoadState("networkidle"), p.click('button[type="submit"]')]);
    await p.goto(`${BASE}/org/v3/students?q=${encodeURIComponent("분야점검")}`); await p.waitForLoadState("networkidle");
    const body = await p.evaluate(() => document.body.innerText);
    for (const [k, pk] of picks.entries()) {
      const line = body.split("\n").find((l) => l.includes(`분야점검${k ? "나" : "가"}`)) ?? "";
      ok(`담당자 명단에 고른 분야가 보인다 (${pk.leaf.name})`, body.includes(pk.leaf.name), line.slice(0, 120));
    }
    await ctx.close();
  } finally {
    await br.close();
    const us = await query<{ id: string }>(
      `SELECT id::text FROM users WHERE id = $1 OR login_id = ANY($2::text[])`,
      [admin.id, made.created.map((c) => c.login_id)]);
    for (const x of us) {
      await query(`DELETE FROM v3_responses WHERE attempt_id IN (SELECT id FROM v3_attempts WHERE user_id = $1)`, [x.id]);
      await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [x.id]);
      await query(`DELETE FROM entitlements WHERE user_id = $1`, [x.id]);
      await query(`DELETE FROM cohort_members WHERE user_id = $1`, [x.id]);
      await query(`DELETE FROM campus_students WHERE user_id = $1`, [x.id]);
      await query(`DELETE FROM memberships WHERE user_id = $1`, [x.id]);
      await query(`DELETE FROM users WHERE id = $1`, [x.id]).catch(() => undefined);
    }
  }
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n확인 ${results.length}가지 — 통과 ${results.length - bad} · 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
