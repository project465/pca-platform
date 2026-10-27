/**
 * **한 사람의 로그아웃이 다른 사람을 내보내지 않는가**(2026-10-27 사업주 지적).
 *
 *   npm run auth:scope        # 먼저 stage:serve 로 띄운다
 *
 * 세는 것:
 * - 같은 브라우저에 담당자와 학생이 같이 들어가 있을 때, 담당자 화면은
 *   담당자로 · 학생 화면은 학생으로 선다
 * - 학생 화면에서 로그아웃하면 담당자는 그대로, 담당자 화면에서 로그아웃하면
 *   학생은 그대로다
 * - 서로 다른 브라우저의 학생 둘 가운데 한 사람이 로그아웃해도 다른 사람은 그대로다
 */
import { chromium, type BrowserContext, type Page } from "playwright";
import { loadEnv, BASE, login, makeStudent } from "./_loop-fixture";
loadEnv();

let bad = 0;
const ok = (n: string, c: boolean, d = "") => {
  if (!c) bad += 1;
  console.log(`  ${c ? "통과" : "걸림"}  ${n}${d ? ` — ${d}` : ""}`);
};
const path = (p: Page) => new URL(p.url()).pathname;
async function open(ctx: BrowserContext, to: string): Promise<Page> {
  const p = await ctx.newPage();
  await p.goto(`${BASE}${to}`, { waitUntil: "domcontentloaded" });
  await p.waitForLoadState("networkidle").catch(() => undefined);
  return p;
}
async function logout(p: Page): Promise<void> {
  await p.locator('form button:has-text("로그아웃")').first().click();
  await p.waitForLoadState("networkidle").catch(() => undefined);
}
const inStaff = (p: Page) => /^\/(org|admin)/.test(path(p));
const inStudent = (p: Page) => /^\/(me|cores|v3)/.test(path(p));

(async () => {
  const { query, queryOne } = await import("../src/lib/db");
  const staff = await makeStudent("scope-check-staff");
  const org = await queryOne<{ id: string }>(`SELECT id::text FROM organizations ORDER BY id LIMIT 1`);
  await query(`DELETE FROM memberships WHERE user_id = $1`, [staff.id]);
  await query(`INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, 'org_admin')`, [staff.id, org?.id]);
  const a = await makeStudent("scope-check-a");
  const b = await makeStudent("scope-check-b");

  const br = await chromium.launch();
  console.log("\n── 같은 브라우저에 담당자와 학생");
  const one = await br.newContext();
  const s1 = await login(one, "scope-check-staff", staff.pw);
  ok("① 담당자는 담당자 화면으로 들어간다", inStaff(s1), path(s1));
  const t1 = await login(one, "scope-check-a", a.pw);
  ok("② 담당자가 들어가 있어도 학생 로그인 폼이 열리고 학생 화면으로 간다", inStudent(t1), path(t1));
  const s2 = await open(one, "/org");
  ok("③ 학생이 들어간 뒤에도 담당자 화면은 담당자로 선다", inStaff(s2), path(s2));
  const t2 = await open(one, "/me");
  ok("④ 학생 화면은 학생으로 선다", inStudent(t2), path(t2));
  await logout(t2);
  const s3 = await open(one, "/org");
  ok("⑤ 학생이 로그아웃해도 담당자는 그대로다", inStaff(s3), path(s3));
  const t3 = await open(one, "/me");
  ok("⑥ 로그아웃한 학생 화면은 로그인으로 간다", !inStudent(t3), path(t3));
  await login(one, "scope-check-a", a.pw);
  const s4 = await open(one, "/org");
  await logout(s4);
  const t4 = await open(one, "/me");
  ok("⑦ 담당자가 로그아웃해도 학생은 그대로다", inStudent(t4), path(t4));
  const s5 = await open(one, "/org");
  ok("⑧ 로그아웃한 담당자 화면은 담당자로 서지 않는다", !inStaff(s5), path(s5));

  console.log("\n── 서로 다른 브라우저의 학생 둘");
  const ca = await br.newContext();
  const cb = await br.newContext();
  await login(ca, "scope-check-a", a.pw);
  await login(cb, "scope-check-b", b.pw);
  const pa = await open(ca, "/me");
  await logout(pa);
  const pb = await open(cb, "/me");
  ok("⑨ 학생 A 가 로그아웃해도 학생 B 는 그대로다", inStudent(pb), path(pb));
  const pa2 = await open(ca, "/me");
  ok("⑩ 학생 A 는 나가 있다", !inStudent(pa2), path(pa2));

  await br.close();
  console.log(`\n로그인 분리 — 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
})();
