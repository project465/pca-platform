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
 * **그리고 잠기지 않는가.** 가르는 것만 막으면 반대쪽으로 틀린다:
 * 공급자 쪽이 막힌 날 들어올 길이 하나도 없으면 그 사람은 산 것을 못
 * 본다. 15절이 여덟 가지를 센다.
 *
 *   npm run auth:check
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";

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

/** 주석을 **길이를 지키며** 공백으로 덮는다 */
function code(src: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, " ");
  return src
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + blank(m.slice(p1.length)));
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

  /**
   * ── 15. **계정에서 잠기지 않는가 — 여덟 가지** ───────────────
   *
   * 앞의 열넷은 **같은 사람이 둘로 갈리지 않는가**를 봤다. 그 쪽으로만
   * 조이면 반대쪽으로 틀린다: 들어올 길을 좁히다 **공급자 쪽이 막힌 날
   * 아무 길도 남지 않는다.** 그러면 돈을 낸 사람이 산 것을 못 보고,
   * 그 상태를 되돌릴 길이 화면에 없다.
   *
   * 여기서 세는 것은 "들어올 수 있는가" 가 아니라 **"남은 길이 있는가"**
   * 다. 여덟 자리다.
   */
  const L_FILES = {
    reset: readFileSync("src/app/password/reset/[token]/actions.ts", "utf8"),
    change: readFileSync("src/app/password/change/actions.ts", "utf8"),
    link: readFileSync("src/app/login/link/page.tsx", "utf8"),
    auth: readFileSync("src/lib/auth.ts", "utf8"),
    social: readFileSync("src/app/signup/social/actions.ts", "utf8"),
    accounts: readFileSync("src/lib/auth-accounts.ts", "utf8"),
  };

  /* ① 소셜만 든 계정은 비밀번호로 들어올 수 없다 (아무 값과도 안 맞는 해시) */
  const sOnly = await makeUser(mail("lock1"), false);
  await linkAccount(sOnly, id("google", "lock1", mail("lock1")));
  ok("① 소셜만 든 계정은 비밀번호 로그인이 꺼져 있다",
    (await hasPasswordLogin(sOnly)) === false
    && /randomBytes\(32\)/.test(L_FILES.social));

  /**
   * ② 그 사람이 비밀번호를 정하면 **그 사실이 칸에 올라간다.**
   *
   * 올리지 않으면 `/my` 가 들고 있는 열쇠를 없다고 적고, 공급자 쪽이
   * 막힌 날 그 사람은 자기가 잠긴 줄 안다. 한동안 두 재설정 경로가
   * 해시만 바꾸고 이 칸을 안 올렸다.
   */
  ok("② 비밀번호를 정하면 `pw_login` 이 같이 올라간다 (재설정 · 변경 두 자리)",
    /pw_login = true/.test(L_FILES.reset) && /pw_login = true/.test(L_FILES.change));
  await query(`UPDATE users SET pw_login = true WHERE id = $1`, [sOnly]);
  ok("② 올린 뒤 화면이 그것을 읽는다", (await hasPasswordLogin(sOnly)) === true);

  /**
   * ③ **마지막 로그인 방법을 끊는 길이 없다.**
   *
   * 끊기를 만들면 마지막 하나를 끊은 사람이 다시는 못 들어오고, 그
   * 상태를 되돌릴 길이 화면에 없다. 지금은 **붙이기만** 있다.
   */
  const unlink = execFileSync("git", ["ls-files", "src"], { encoding: "utf8" })
    .split("\n").filter((f) => /\.(ts|tsx)$/.test(f))
    .filter((f) => /DELETE\s+FROM\s+auth_accounts/i.test(readFileSync(f, "utf8")));
  ok("③ 로그인 방법을 끊는 코드가 손님 쪽에 없다", unlink.length === 0, unlink.join(" / "));

  /**
   * ④ 공급자 쪽 이메일이 바뀌어도 같은 계정이다.
   *
   * 사람을 찾는 열쇠가 `sub` 이기 때문이다. 이메일로 찾으면 구글에서
   * 주소를 바꾼 사람이 **다음 로그인에 새 계정으로 떨어진다.**
   */
  const moved = await resolveIdentity(id("google", "lock1", mail("lock1-new")));
  ok("④ 공급자 쪽 메일이 바뀌어도 같은 계정이다",
    moved.kind === "linked" && moved.userId === sOnly, moved.kind);

  /* ⑤ 애플의 가려 준 주소를 끈 뒤 돌아와도 같은 계정이다 */
  const relayUser = await makeUser(`${TAG}-lock5@privaterelay.appleid.com`, false);
  await linkAccount(relayUser, id("apple", "lock5",
    `${TAG}-lock5@privaterelay.appleid.com`));
  const unmasked = await resolveIdentity(id("apple", "lock5", mail("lock5-real")));
  ok("⑤ 가려 준 주소를 끈 뒤에도 같은 계정이다",
    unmasked.kind === "linked" && unmasked.userId === relayUser, unmasked.kind);

  /**
   * ⑥ `conflict` 에서 멈춘 사람에게 **남은 길이 적혀 있다.**
   *
   * 자동으로 합치지 않는 것이 맞지만, 멈춘 자리에서 할 수 있는 것을
   * 적지 않으면 그것이 곧 잠김이다. 그 쪽이 가리키는 것은 셋이다:
   * 그 계정으로 로그인 · 비밀번호 복구 · 사람에게 닿는 자리.
   */
  ok("⑥ 멈춘 자리가 복구 경로를 가리킨다 (로그인 · 비밀번호 찾기 · 지원)",
    /\/login\?next/.test(L_FILES.link) && /\/password\/forgot/.test(L_FILES.link)
    && /\/support/.test(L_FILES.link));

  /**
   * ⑦ 공급자를 꺼도 비밀번호 길이 남는다.
   *
   * `oauthProviders()` 는 꽂힌 것만 등록하는데, 그래서 값을 빼면 목록이
   * 빈다. 그때 **`Credentials` 가 조건 없이 남아 있어야** 비밀번호를 든
   * 사람이 들어온다. 조건을 붙이면 공급자 값을 잘못 빼는 날 아무도
   * 못 들어온다.
   */
  const keep = { ...process.env };
  delete process.env.AUTH_GOOGLE_ID; delete process.env.AUTH_GOOGLE_SECRET;
  delete process.env.AUTH_APPLE_ID; delete process.env.AUTH_APPLE_SECRET;
  const offCount = (await import("../src/lib/auth-oauth")).enabledProviders().length;
  Object.assign(process.env, keep);
  /* **조건 없이 서 있는지를 본다.** 목록에 있는 것만으로는 모자라고,
     앞에 `if` 나 삼항이 붙어 있으면 공급자 값을 잘못 빼는 날 같이
     빠진다. `providers: [` 부터 `Credentials(` 까지를 읽는다 */
  const head = L_FILES.auth.slice(
    L_FILES.auth.indexOf("providers: ["),
    L_FILES.auth.indexOf("Credentials({"));
  const always = head.includes("providers: [")
    && !/[?&|]{1,2}\s*$|\bif\s*\(/.test(code(head));
  ok("⑦ 공급자를 꺼도 비밀번호 로그인은 남는다",
    offCount === 0 && always, `켜진 공급자 ${offCount} · 조건 없음 ${always}`);

  /**
   * ⑧ 정지·파기된 계정은 **소셜로도** 못 들어온다.
   *
   * 막는 자리가 비밀번호 쪽에만 있으면 소셜이 뒷문이 된다. 판단은
   * `resolveIdentity` 가 상태를 돌려주고 `signIn` 이 한 곳에서 막는다.
   */
  await query(`UPDATE users SET status = 'erased' WHERE id = $1`, [relayUser]);
  const gone = await resolveIdentity(id("apple", "lock5", null));
  ok("⑧ 파기된 계정은 소셜로도 못 들어온다",
    gone.kind === "linked" && gone.status === "erased"
    && /status !== "active"/.test(L_FILES.auth) && /account_inactive/.test(L_FILES.auth),
    gone.kind === "linked" ? gone.status : gone.kind);

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
