/**
 * **아이디 · 첫 비밀번호를 적는 꼴**(2026-11-04 테스트 방: 진흥원 안내문에 그대로 쓸 규칙).
 *
 *   BASE=http://127.0.0.1:3100 npm run login:format
 *
 * 진흥원 참여자(휴대전화 번호) 하나와 대학 학생(학번) 하나를 명단으로 발급하고, 실제 브라우저로
 * 공통 로그인(`/login`)과 기관 · 학교 로그인(`/campus/<기관>/login`)에서 하이픈을 넣은 값 · 숫자만 적은 값으로
 * 들어가 본다. 첫 로그인은 비밀번호 바꾸기로 가야 한다. 바꾼 뒤에는 하이픈을 넣은 옛 비밀번호가 맞지 않아야 한다.
 * 계정은 이 점검이 만들고 끝나면 지운다. 로컬 · 시험 DB 에서만 돌린다.
 */
import { randomBytes } from "node:crypto";
import { chromium, type Browser } from "playwright";
import { loadEnv, BASE } from "./_loop-fixture";

loadEnv();
const results: { ok: boolean; name: string; why: string }[] = [];
const ok = (name: string, pass: boolean, why = "") => {
  results.push({ ok: pass, name, why });
  console.log(`  ${pass ? "통과" : "걸림"}  ${name}${why ? ` — ${why}` : ""}`);
};

(async () => {
  const { query, queryOne } = await import("../src/lib/db");
  const { university, allLeaves } = await import("../src/lib/campus/registry");
  const { checkStudent, provisionStudent } = await import("../src/lib/campus/students");
  const made: string[] = [];
  const issue = async (code: string, sid: string) => {
    const u = university(code)!;
    const leaf = allLeaves(u).find((r) => r.leaf.core_code && !r.leaf.routing_only)!;
    const org = (await queryOne<{ id: string }>(`SELECT id::text FROM organizations WHERE code = $1`, [code]))!;
    const c = checkStudent(code, { student_id: sid, name: "형식 점검", department_code: leaf.leaf.code, college_code: leaf.college.code });
    if (!c.ok) throw new Error(c.why);
    const p = await provisionStudent(org.id, c.value);
    made.push(p.userId);
    return { loginId: c.value.loginId, password: p.password as string };
  };
  const n = String(Date.now()).slice(-8);
  const phoneDigits = `010${n}`;
  const phoneDash = `${phoneDigits.slice(0, 3)}-${phoneDigits.slice(3, 7)}-${phoneDigits.slice(7)}`;
  const sj = await issue("SJEPA", phoneDash);
  ok("진흥원: 하이픈 넣은 번호로 발급해도 아이디는 숫자만", sj.loginId.endsWith(phoneDigits), sj.loginId.replace(/\d{4}$/, "****"));
  ok("진흥원: 첫 비밀번호는 휴대전화 번호 숫자만", sj.password === phoneDigits);
  const sid = `9${n.slice(-7)}`;
  const ku = await issue("KUS", sid);
  ok("대학: 첫 비밀번호는 학번", ku.password === sid);

  const br: Browser = await chromium.launch();
  const tryLogin = async (path: string, id: string, pw: string) => {
    const ctx = await br.newContext({ locale: "ko-KR" });
    const p = await ctx.newPage();
    await p.goto(`${BASE}${path}`);
    await p.fill("#identifier", id); await p.fill("#password", pw);
    await Promise.all([p.waitForURL((x) => !x.pathname.endsWith("/login"), { timeout: 30000 }).catch(() => undefined), p.click('button[type="submit"]')]);
    await p.waitForLoadState("networkidle").catch(() => undefined);
    let at = new URL(p.url()).pathname;
    /* 로그인이 되면 첫 화면이 먼저 서고, 비밀번호를 바꾸지 않은 계정은 다음 쪽에서 바꾸기로 보낸다 */
    if (!at.endsWith("/login") && !at.startsWith("/password/change")) {
      await p.goto(`${BASE}/me`); await p.waitForLoadState("networkidle").catch(() => undefined);
      at = new URL(p.url()).pathname;
    }
    await ctx.close();
    return at;
  };
  try {
    const label = await (async () => {
      const ctx = await br.newContext({ locale: "ko-KR" }); const p = await ctx.newPage();
      await p.goto(`${BASE}/login`); const t = (await p.locator('label[for="identifier"]').textContent())?.trim() ?? ""; await ctx.close(); return t;
    })();
    ok("공통 로그인 칸 이름", label === "학번·휴대전화번호 또는 이메일", label);
    for (const [where, path] of [["진흥원 로그인", "/campus/sjepa/login"], ["공통 로그인", "/login"]] as const) {
      for (const [idName, id] of [["번호 하이픈", phoneDash], ["번호 숫자만", phoneDigits]] as const) {
        for (const [pwName, pw] of [["비밀번호 하이픈", phoneDash], ["비밀번호 숫자만", phoneDigits]] as const) {
          const at = await tryLogin(path, id, pw);
          ok(`${where}: ${idName} · ${pwName} → 비밀번호 바꾸기`, at.startsWith("/password/change"), at);
        }
      }
    }
    for (const [where, path] of [["고려대 로그인", "/campus/kus/login"], ["공통 로그인", "/login"]] as const) {
      const at = await tryLogin(path, sid, sid);
      ok(`${where}: 학번 · 학번 → 비밀번호 바꾸기`, at.startsWith("/password/change"), at);
    }
    /* 비밀번호를 바꾼 뒤에는 옛 비밀번호(하이픈 · 숫자 모두)가 맞지 않는다 */
    const ctx = await br.newContext({ locale: "ko-KR" }); const p = await ctx.newPage();
    await p.goto(`${BASE}/campus/sjepa/login`);
    await p.fill("#identifier", phoneDash); await p.fill("#password", phoneDash);
    await Promise.all([p.waitForURL(/\/password\/change/, { timeout: 30000 }).catch(() => undefined), p.click('button[type="submit"]')]);
    const np = `N${randomBytes(6).toString("base64url")}7!`;
    await p.fill("#current", phoneDash); await p.fill("#next", np); await p.fill("#confirm", np);
    await p.click('button[type="submit"]');
    await p.waitForURL((x) => !x.pathname.startsWith("/password/change"), { timeout: 30000 }).catch(() => undefined);
    ok("첫 비밀번호 바꾸기: 지금 비밀번호 칸에 하이픈 넣은 번호도 받는다", !new URL(p.url()).pathname.startsWith("/password/change"), new URL(p.url()).pathname);
    await ctx.close();
    for (const pw of [phoneDash, phoneDigits]) {
      const at = await tryLogin("/campus/sjepa/login", phoneDigits, pw);
      ok(`바꾼 뒤 옛 비밀번호(${pw === phoneDash ? "하이픈" : "숫자만"})는 맞지 않는다`, at.endsWith("/login"), at);
    }
    const at = await tryLogin("/campus/sjepa/login", phoneDash, np);
    ok("바꾼 뒤 새 비밀번호로 들어간다(아이디는 하이픈)", !at.endsWith("/login") && !at.startsWith("/password/change"), at);
  } finally {
    await br.close();
    for (const id of made) {
      await query(`DELETE FROM campus_students WHERE user_id = $1`, [id]);
      await query(`DELETE FROM memberships WHERE user_id = $1`, [id]);
      await query(`DELETE FROM users WHERE id = $1`, [id]).catch(() => undefined);
    }
  }
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n확인 ${results.length}가지 — 통과 ${results.length - bad} · 걸림 ${bad}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
