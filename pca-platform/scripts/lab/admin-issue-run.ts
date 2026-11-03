/**
 * **담당자가 화면에서 학생 아이디를 내고, 그 학생이 그 아이디로 들어가는지** 사람처럼 눌러 본다.
 *
 *   UI_BASE=http://127.0.0.1:3100 UNI=JJU LEAF=JJU26_AI ADMIN_ID=jju_admin ADMIN_PW=... \
 *     OUT=<저장소 밖> npx tsx scripts/lab/admin-issue-run.ts
 *
 * 담당자 열쇠는 환경변수로만 받는다. 새로 낸 학생 열쇠는 화면에 한 번만 보이고, OUT 에만 적는다.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BASE, gateCreds, loadEnv } from "../_loop-fixture";
import { university, allLeaves } from "../../src/lib/campus/registry";

loadEnv();
const UNI = process.env.UNI ?? "JJU";
const LEAF = process.env.LEAF ?? "JJU26_AI";
const ADMIN_ID = process.env.ADMIN_ID ?? "";
const ADMIN_PW = process.env.ADMIN_PW ?? "";
const OUT = process.env.OUT ?? "";
if (!ADMIN_ID || !ADMIN_PW || !OUT || path.resolve(OUT).startsWith(path.resolve("."))) {
  throw new Error("ADMIN_ID · ADMIN_PW · OUT(저장소 밖)이 필요합니다");
}
const say = (pass: boolean, label: string, note = "") => console.log(`${pass ? "  통과" : "  실패"}  ${label}${note ? ` · ${note}` : ""}`);

(async () => {
  mkdirSync(OUT, { recursive: true });
  const u = university(UNI)!; const code = u.university_code.toLowerCase();
  const leaf = allLeaves(u).find((r) => r.leaf.code === LEAF)!;
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  if (gateCreds()) await ctx.setHTTPCredentials(gateCreds()!);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await p.fill('input[name="identifier"], input[name="loginId"], input[type="text"]', ADMIN_ID);
  await p.fill('input[type="password"]', ADMIN_PW);
  await p.click('button[type="submit"]');
  await p.waitForURL((x) => !x.pathname.startsWith("/login"), { timeout: 30000 }).catch(() => undefined);
  say(!new URL(p.url()).pathname.startsWith("/login"), "담당자 로그인", new URL(p.url()).pathname);

  await p.goto(`${BASE}/org/v3/students`, { waitUntil: "domcontentloaded" });
  await p.waitForLoadState("networkidle").catch(() => undefined);
  await p.screenshot({ path: path.join(OUT, "admin-students.png") });
  await p.locator("details.sf-fold > summary").first().click();
  const sid = `2026${String(Date.now() % 1e5).padStart(5, "0")}`;
  await p.fill('input[name="student_id"]', sid);
  await p.fill('input[name="name"]', "이도윤");
  await p.selectOption('select[name="department_code"]', LEAF);
  await p.locator('form.sf-form button[type="submit"]').first().click();
  await p.locator(".sf-issued code").first().waitFor({ timeout: 20000 }).catch(() => undefined);
  const loginId = (await p.locator(".sf-issued li span").first().textContent().catch(() => ""))?.trim() ?? "";
  const pw = (await p.locator(".sf-issued code").first().textContent().catch(() => ""))?.trim() ?? "";
  await p.screenshot({ path: path.join(OUT, "admin-issued.png") });
  say(Boolean(loginId && pw), "담당자 화면에서 학생 아이디 발급", `아이디 ${loginId}`);
  writeFileSync(path.join(OUT, "issued.csv"), `아이디,비밀번호\n${loginId},${pw}\n`);

  const s = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await s.goto(`${BASE}/campus/${code}/login`, { waitUntil: "domcontentloaded" });
  await s.fill('input[name="identifier"]', loginId);
  await s.fill('input[name="password"]', pw);
  await s.click('button[type="submit"]');
  await s.waitForURL((x) => !x.pathname.endsWith("/login"), { timeout: 30000 }).catch(() => undefined);
  await s.waitForLoadState("networkidle").catch(() => undefined);
  const body = (await s.locator("body").innerText()).replace(/\s+/g, " ");
  await s.screenshot({ path: path.join(OUT, "student-start.png") });
  say(new URL(s.url()).pathname === `/campus/${code}/start`, "발급된 아이디로 학생 로그인", new URL(s.url()).pathname);
  say(body.includes(leaf.leaf.name), "학생 화면에 학과가 적혀 있다", leaf.leaf.name);
  await b.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
