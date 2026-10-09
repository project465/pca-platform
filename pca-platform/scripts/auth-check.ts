/**
 * 소셜 로그인이 **사람을 둘로 가르지 않는가.**
 *
 * 로그인 방법을 하나 더 여는 일에서 가장 비싼 실수는 로그인이 안 되는
 * 것이 아니라 같은 사람이 둘로 갈리는 것이다. 갈리면 주문은 이쪽에,
 * 응시와 결과지는 저쪽에 남고, 그 사람은 돈을 내고 아무것도 못 본다.
 * 그래서 세는 것의 절반이 **갈리지 않는가**다.
 *
 * **실제 구글·애플에 붙지 않는다.** 자격증명이 없고, 있어도 사람이
 * 브라우저에서 동의를 눌러야 한다. 여기서 재는 것은 **그 뒤에 우리가
 * 하는 판단**이다: 공급자가 이러이러한 신원을 줬을 때 우리가 같은
 * 사람으로 보는가, 새로 만드는가, 멈추는가.
 *
 *   npm run auth:check
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

for (const line of (() => {
  try { return readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n"); }
  catch { return [] as string[]; }
})()) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
if (!process.env.AUTH_SECRET) process.env.AUTH_SECRET = randomBytes(32).toString("base64");

import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import {
  accountsOf, hasPasswordLogin, linkAccount, resolveIdentity,
  type ProviderIdentity,
} from "../src/lib/auth-accounts";
import { identityFrom, isPrivateRelay } from "../src/lib/auth-oauth";
import { open as openPending, seal } from "../src/lib/oauth-pending";
import { openIntent, sealIntent } from "../src/lib/oauth-link-intent";
import { safeNext } from "../src/lib/safe-next";

if ((process.env.APP_ENV ?? "").toLowerCase() === "production") {
  console.error("운영에서는 돌리지 않습니다.");
  process.exit(2);
}

let pass = 0;
const fail: string[] = [];
function ok(what: string, cond: boolean, saw = ""): void {
  if (cond) { pass++; console.log(`  통과  ${what}`); }
  else { fail.push(`${what}${saw ? ` — ${saw}` : ""}`); console.log(`  걸림  ${what} ${saw}`); }
}

const TAG = `authchk-${randomBytes(4).toString("hex")}`;
const mail = (x: string) => `${TAG}-${x}@example.com`;
const id = (p: "google" | "apple", sub: string, email: string | null,
  verified = true): ProviderIdentity =>
  ({ provider: p, subject: `${TAG}-${sub}`, email, emailVerified: verified, name: "검사" });

async function makeUser(email: string | null, pw: boolean): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash, status,
                        must_reset_pw, is_demo, pw_login)
     VALUES ($1,'검사 계정',$2,'active',false,TRUE,$3) RETURNING id::text`,
    [email, await hashPassword(randomBytes(18).toString("base64url")), pw]);
  if (!row) throw new Error("계정을 만들지 못했습니다");
  return row.id;
}

async function cleanup(): Promise<void> {
  await query(
    `DELETE FROM users WHERE lower(email) LIKE $1 OR display_name = '검사 계정'
       AND id IN (SELECT user_id FROM auth_accounts WHERE provider_account_id LIKE $2)`,
    [`${TAG}%`, `${TAG}%`]).catch(() => undefined);
  await query(`DELETE FROM auth_accounts WHERE provider_account_id LIKE $1`,
    [`${TAG}%`]).catch(() => undefined);
  await query(`DELETE FROM users WHERE lower(email) LIKE $1`,
    [`${TAG}%`]).catch(() => undefined);
}

async function main(): Promise<void> {
  console.log("\n소셜 로그인 — 사람을 둘로 가르지 않는가\n");

  /* ── 1. 처음 들어온 사람 ───────────────────────────────────── */
  const fresh = id("google", "new", mail("new"));
  ok("처음 들어온 신원은 새로 만든다 (fresh)",
    (await resolveIdentity(fresh)).kind === "fresh");

  /* ── 2. 두 번째 로그인은 같은 사람 ─────────────────────────── */
  const u1 = await makeUser(mail("new"), false);
  await linkAccount(u1, fresh);
  const again = await resolveIdentity(fresh);
  ok("두 번째 로그인은 같은 계정이다 (linked)",
    again.kind === "linked" && again.userId === u1,
    again.kind === "linked" ? "" : again.kind);

  /* ── 3. 같은 사람이 두 번 눌러도 줄이 둘 생기지 않는다 ────── */
  await linkAccount(u1, fresh);
  await linkAccount(u1, fresh);
  const n = await query<{ c: string }>(
    `SELECT count(*)::text AS c FROM auth_accounts
      WHERE provider = 'google' AND provider_account_id = $1`, [fresh.subject]);
  ok("같은 신원을 여러 번 붙여도 줄이 하나다", n[0]?.c === "1", `줄 ${n[0]?.c}`);

  /* ── 4. **이메일이 같다고 자동으로 합치지 않는다** ─────────── */
  const pwUser = await makeUser(mail("pw"), true);
  const sameMail = id("google", "other", mail("pw"));
  const conflict = await resolveIdentity(sameMail);
  ok("확인된 같은 주소면 멈춘다 (conflict). **자동 병합하지 않는다**",
    conflict.kind === "conflict", conflict.kind);
  const stillNone = await accountsOf(pwUser);
  ok("멈춘 자리에서 아무것도 붙지 않았다", stillNone.length === 0,
    `붙은 것 ${stillNone.length}`);

  /* ── 5. 공급자가 확인하지 않은 주소는 주소로 치지 않는다 ──── */
  const unverified = id("google", "unv", mail("pw"), false);
  ok("확인 안 된 주소는 같은 계정으로 보지 않는다",
    (await resolveIdentity(unverified)).kind === "fresh");

  /* ── 6. 남에게 붙은 신원을 빼앗지 않는다 ───────────────────── */
  const steal = await linkAccount(pwUser, fresh);
  ok("이미 남에게 붙은 신원은 거절한다",
    !steal.ok && steal.reason === "taken");

  /* ── 7. 로그인 방법을 둘 들 수 있다 ────────────────────────── */
  const appleId = id("apple", "a1", mail("pw"));
  await linkAccount(pwUser, appleId);
  const two = await accountsOf(pwUser);
  ok("한 사람이 비밀번호와 애플을 같이 들 수 있다",
    two.length === 1 && two[0].provider === "apple"
      && (await hasPasswordLogin(pwUser)),
    `붙은 것 ${two.length}`);

  /* ── 8. 애플의 가려 준 주소 ────────────────────────────────── */
  const relay = id("apple", "a2", "abc123@privaterelay.appleid.com");
  ok("가려 준 주소를 알아본다", isPrivateRelay(relay.email));
  ok("가려 준 주소는 기존 계정과 합쳐지지 않는다 (fresh)",
    (await resolveIdentity(relay)).kind === "fresh");

  /* ── 9. 소셜로만 만든 계정은 비밀번호 로그인을 안 쓴다 ─────── */
  ok("소셜로만 만든 계정은 pw_login = false", !(await hasPasswordLogin(u1)));

  /* ── 10. 공급자가 준 것을 읽는 법 ──────────────────────────── */
  const g = identityFrom("google",
    { sub: "g1", email: "A@B.com", email_verified: true, name: "홍" },
    { providerAccountId: "g1" });
  ok("구글: sub 과 소문자 메일과 확인 여부를 읽는다",
    g?.subject === "g1" && g?.email === "a@b.com" && g?.emailVerified === true);
  const a = identityFrom("apple",
    { sub: "a1", email: "x@y.com", email_verified: "true" },
    { providerAccountId: "a1" });
  ok('애플: 글자 "true" 도 확인으로 읽는다', a?.emailVerified === true);
  const f = identityFrom("apple",
    { sub: "a2", email: "x@y.com", email_verified: "false" },
    { providerAccountId: "a2" });
  ok('글자 "false" 를 확인으로 읽지 않는다', f?.emailVerified === false);
  ok("sub 이 없으면 신원으로 받지 않는다",
    identityFrom("google", { email: "x@y.com" }, null) === null);

  /* ── 11. 봉투 ──────────────────────────────────────────────── */
  const sealed = seal(fresh);
  const opened = openPending(sealed);
  ok("봉투를 열면 같은 신원이다",
    opened?.subject === fresh.subject && opened?.email === fresh.email);
  ok("봉투에 신원이 날것으로 보이지 않는다",
    !sealed.includes("@") && !sealed.includes(fresh.subject));
  ok("한 글자 고친 봉투는 열리지 않는다",
    openPending(`${sealed.slice(0, -2)}AA`) === null);
  ok("빈 봉투는 열리지 않는다", openPending("") === null);

  /* ── 12. 연결 쪽지 ─────────────────────────────────────────── */
  const intent = sealIntent(pwUser, "google");
  ok("연결 쪽지를 열면 그 사람이다", openIntent(intent, "google")?.userId === pwUser);
  ok("**다른 공급자 콜백에서는 열리지 않는다**",
    openIntent(intent, "apple") === null);
  ok("고친 쪽지는 열리지 않는다",
    openIntent(`${intent.slice(0, -2)}AA`, "google") === null);

  /* ── 13. 돌아갈 자리 ───────────────────────────────────────── */
  ok("우리 경로는 지나간다", safeNext("/cores", "/") === "/cores");
  ok("`//evil.com` 은 막는다", safeNext("//evil.com", "/") === "/");
  ok("바깥 주소는 막는다", safeNext("https://evil.com", "/") === "/");
  ok("역슬래시 섞은 것도 막는다", safeNext("/\\evil.com", "/") === "/");
  ok("빈 값은 기본값이다", safeNext("", "/me") === "/me");

  /* ── 14. 정지된 계정 ───────────────────────────────────────── */
  await query(`UPDATE users SET status = 'suspended' WHERE id = $1`, [u1]);
  const sus = await resolveIdentity(fresh);
  ok("정지된 계정은 상태를 그대로 돌려준다 (화면이 막는다)",
    sus.kind === "linked" && sus.status === "suspended",
    sus.kind === "linked" ? sus.status : sus.kind);
}

main()
  .then(async () => {
    await cleanup();
    console.log(`\n확인 ${pass + fail.length}가지 — 통과 ${pass} · 걸림 ${fail.length}`);
    process.exit(fail.length ? 1 : 0);
  })
  .catch(async (e) => {
    await cleanup().catch(() => undefined);
    console.error(e);
    process.exit(1);
  });
