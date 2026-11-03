/**
 * 기관 · 학교 참여자의 첫 로그인 끝까지(2026-11-03 진흥원 첫 로그인 신고).
 *
 * CSV 로 발급 → 학교(기관) 로그인 화면 → 첫 비밀번호 바꾸기 → 검사 시작까지를 **실제 브라우저로** 걷는다.
 * 같은 브라우저에 담당자가 들어와 있을 때와 없을 때 둘 다 본다: 담당자 쿠키가 있으면 공용 화면
 * (`/password/change`)이 엉뚱한 계정을 읽는지가 신고의 첫 짐작이었다.
 *
 *   BASE=http://127.0.0.1:3100 UNI=SJEPA npm run campus:first-login
 *
 * 계정은 이 점검이 만들고 끝나면 지운다. 담당자 비밀번호도 이 점검 안에서만 쓰는 무작위 값이다.
 * 로컬 · 시험 DB 에서만 돌린다(운영 DB 에서 돌리지 않는다).
 */
import { randomBytes } from "node:crypto";
import { chromium, type BrowserContext } from "playwright";
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
  const { university, allLeaves } = await import("../src/lib/campus/registry");
  const u = university(UNI);
  if (!u) throw new Error(`등록부에 ${UNI} 가 없습니다`);
  const org = await queryOne<{ id: string }>(`SELECT id::text FROM organizations WHERE code = $1`, [UNI]);
  if (!org) throw new Error(`${UNI} 기관 줄이 없습니다 (UNI=${UNI} APPLY=yes npm run pcu:org …)`);
  const agency = u.org_kind === "agency";
  const leaf = allLeaves(u).find((r) => r.leaf.core_code && !r.leaf.routing_only);
  if (!leaf) throw new Error("응시할 수 있는 학과가 없습니다");

  /* 이 점검만 쓰는 담당자 */
  const adminPw = `A${randomBytes(9).toString("base64url")}9!`;
  const adminLogin = `firstlogin-admin-${Date.now()}`;
  const admin = (await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, email, display_name, password_hash, status, locale, pw_login, must_reset_pw)
     VALUES ($1, $2, '첫 로그인 점검 담당자', $3, 'active', 'ko', TRUE, FALSE) RETURNING id::text`,
    [adminLogin, `${adminLogin}@example.invalid`, await hashPassword(adminPw)]))!;
  await query(`INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, 'org_admin')`, [admin.id, org.id]);

  const ids = [0, 1].map((k) => agency
    ? `0109${String(Date.now()).slice(-6)}${k}`
    : `9${String(Date.now()).slice(-7)}${k}`);
  const csv = `${agency ? "휴대전화번호" : "학번"},이름,${agency ? "전공계열" : "학과"}\n`
    + ids.map((s, k) => `${s},첫로그인점검${k},${leaf.leaf.code}`).join("\n") + "\n";
  const made = await applyImport(UNI, org.id, csv, { userId: admin.id, role: "org_admin", orgId: org.id } as never);
  ok("CSV 로 두 사람이 발급된다", made.ok && made.created.length === 2, made.why ?? JSON.stringify(made.rejected.map((r) => r.why)));
  ok("첫 비밀번호가 아이디 숫자와 같다", made.created.every((c, k) => c.password === ids[k]));

  const br = await chromium.launch();
  const walk = async (label: string, sid: string, withAdmin: boolean) => {
    const ctx: BrowserContext = await br.newContext();
    const p = await ctx.newPage();
    if (withAdmin) {
      await p.goto(`${BASE}/login`);
      await p.fill("#identifier", adminLogin); await p.fill("#password", adminPw);
      await Promise.all([p.waitForLoadState("networkidle"), p.click('button[type="submit"]')]);
      ok(`${label}: 담당자가 먼저 들어가 있다`, /\/org/.test(p.url()), p.url().replace(BASE, ""));
    }
    await p.goto(`${BASE}/campus/${UNI.toLowerCase()}/login`);
    await p.fill("#identifier", sid); await p.fill("#password", sid);
    await Promise.all([p.waitForLoadState("networkidle"), p.click('button[type="submit"]')]);
    if (!/\/password\/change/.test(p.url())) await p.goto(`${BASE}/password/change`);
    ok(`${label}: 첫 로그인은 비밀번호 바꾸기로 간다`, /\/password\/change/.test(p.url()), p.url().replace(BASE, ""));
    const shown = await p.getAttribute("[data-account]", "data-account").catch(() => null);
    ok(`${label}: 바꾸는 계정이 그 참여자다`, (shown ?? "").endsWith(sid), shown ?? "없다");
    const next = `N${randomBytes(6).toString("base64url")}7!`;
    await p.fill("#current", sid); await p.fill("#next", next); await p.fill("#confirm", next);
    await p.click('button[type="submit"]');
    /* 저장은 해시 계산이라 몇 초 걸린다. 화면을 떠나거나 까닭 줄이 설 때까지 기다린다 */
    await Promise.race([
      p.waitForURL((x) => !x.pathname.startsWith("/password/change"), { timeout: 30000 }),
      p.locator('p.notice.error').first().waitFor({ timeout: 30000 }),
    ]).catch(() => undefined);
    const err = await p.evaluate(() => document.querySelector('p.notice.error')?.textContent?.trim() ?? "");
    if (err || /\/password\/change/.test(p.url())) console.log("    화면:", (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, " | ").slice(0, 400));
    ok(`${label}: 임시 비밀번호로 새 비밀번호를 정한다`, !err && !/\/password\/change/.test(p.url()), err || p.url().replace(BASE, ""));
    /* 검사 시작: 학교 시작 화면 → 시작 화면 → 응시 */
    await p.goto(`${BASE}/campus/${UNI.toLowerCase()}/start`);
    const btn = p.locator('form button[type="submit"]').filter({ hasText: /검사 시작|시작하기/ }).first();
    if (await btn.count()) await Promise.all([p.waitForURL(/\/v3\//, { timeout: 30000 }).catch(() => undefined), btn.click()]);
    if (/\/v3\/start/.test(p.url())) {
      await Promise.all([p.waitForURL(/\/v3\/\d+/, { timeout: 60000 }).catch(() => undefined), p.locator('form button[type="submit"]').last().click()]);
    }
    const att = /\/v3\/(\d+)/.exec(p.url())?.[1];
    const row = att ? await queryOne<{ login_id: string }>(
      `SELECT u.login_id FROM v3_attempts a JOIN users u ON u.id = a.user_id WHERE a.id = $1`, [att]) : null;
    ok(`${label}: 그 참여자의 응시가 열린다`, !!row && row.login_id.endsWith(sid), row?.login_id ?? p.url().replace(BASE, ""));
    if (withAdmin) {
      await p.goto(`${BASE}/org/v3`);
      ok(`${label}: 담당자 화면은 담당자로 그대로다`, /\/org/.test(p.url()), p.url().replace(BASE, ""));
    }
    await ctx.close();
  };
  try {
    console.log("\n── 담당자 쿠키 없음");
    await walk("담당자 없음", ids[0], false);
    console.log("\n── 같은 브라우저에 담당자");
    await walk("담당자 있음", ids[1], true);
  } finally {
    await br.close();
    const us = await query<{ id: string }>(
      `SELECT id::text FROM users WHERE id = $1 OR login_id = ANY($2::text[])`,
      [admin.id, made.created.map((c) => c.login_id)]);
    for (const x of us) {
      await query(`DELETE FROM v3_responses WHERE attempt_id IN (SELECT id FROM v3_attempts WHERE user_id = $1)`, [x.id]);
      await query(`DELETE FROM v3_attempts WHERE user_id = $1`, [x.id]);
      await query(`DELETE FROM campus_students WHERE user_id = $1`, [x.id]);
      await query(`DELETE FROM memberships WHERE user_id = $1`, [x.id]);
      await query(`DELETE FROM users WHERE id = $1`, [x.id]).catch(() => undefined);
    }
  }
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n확인 ${results.length}가지 — 통과 ${results.length - bad} · 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
