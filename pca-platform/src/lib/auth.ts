import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { query, queryOne } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { highestRole, isRole, type Role } from "@/lib/roles";
import { isProvider, markLogin, resolveIdentity } from "@/lib/auth-accounts";
import { identityFrom, oauthProviders } from "@/lib/auth-oauth";
import { seal } from "@/lib/oauth-pending";
import { LINK_COOKIE, openIntent } from "@/lib/oauth-link-intent";
import { linkAccount } from "@/lib/auth-accounts";
import {
  clientIpFrom,
  loginFailed,
  loginGate,
  loginSucceeded,
} from "@/lib/login-throttle";

type UserRow = {
  id: string;
  display_name: string;
  password_hash: string;
  status: string;
  must_reset_pw: boolean;
  locale: string;
};

export type Membership = { orgId: string; role: Role };

/**
 * 로그인 식별자는 학번(login_id)이거나 이메일이다.
 * 학생 계정은 email 이 NULL 일 수 있으므로 둘 다 받는다.
 * 이메일은 대소문자를 구분하지 않는다.
 *
 * **둘이 걸리면 학번이 이긴다.** 전에는 차례 없이 `LIMIT 1` 이라, 한 사람의
 * `login_id` 와 다른 사람의 `email` 이 같은 글자일 때 **어느 줄이 오는지가
 * 정해지지 않았다.** 학교가 발급한 학번으로 들어온 사람이 남의 계정으로
 * 들어앉는 길이고, 그 응시는 되돌릴 수 없다. `NULLS LAST` 를 붙인 까닭은
 * 내림차순의 기본값이 `NULLS FIRST` 라서 **아이디가 없는 줄이 앞에 서는**
 * 것을 막으려는 것이다.
 */
async function findUserByIdentifier(identifier: string): Promise<UserRow | null> {
  return queryOne<UserRow>(
    `SELECT id, display_name, password_hash, status, must_reset_pw, locale
       FROM users
      WHERE login_id = $1 OR lower(email) = lower($1)
      ORDER BY (login_id = $1) DESC NULLS LAST, id
      LIMIT 1`,
    [identifier],
  );
}

/**
 * 비밀번호는 맞는데 계정이 열려 있지 않은가(규격 §4).
 *
 * **왜 따로 묻는가.** `authorize()` 는 어느 까닭으로 막히든 `null` 을
 * 돌려주고, Auth.js 는 그 까닭을 밖으로 내보내지 않는다. 그래서 담당자가
 * 꺼 둔 계정으로 들어온 학생이 `아이디 또는 비밀번호가 올바르지 않습니다`
 * 를 읽고 **제 비밀번호를 의심해 몇 번 더 찍다가 잠긴다.**
 *
 * **계정이 있는지를 알려 주지 않는다.** 이 함수는 **비밀번호가 맞았을
 * 때만** 까닭을 돌려준다. 비밀번호를 모르는 쪽에서는 `null` 이라 응답이
 * 전과 같고, 비밀번호를 아는 사람은 이미 그 계정의 주인이다.
 */
export async function inactiveReason(
  identifier: string, password: string,
): Promise<"disabled" | "erased" | null> {
  const user = await findUserByIdentifier(identifier);
  if (!user || !user.password_hash) return null;
  if (user.status === "active") return null;
  if (!(await verifyPassword(password, user.password_hash))) return null;
  return user.status === "erased" ? "erased" : "disabled";
}

async function loadMemberships(userId: string): Promise<Membership[]> {
  const rows = await query<{ org_id: string; role: string }>(
    `SELECT org_id, role FROM memberships WHERE user_id = $1 ORDER BY id`,
    [userId],
  );
  return rows
    .filter((r) => isRole(r.role))
    .map((r) => ({ orgId: r.org_id, role: r.role as Role }));
}

/**
 * 이 요청이 온 자리.
 *
 * `next/headers` 를 위에서 들여오지 않고 그 자리에서 부른다: 이 파일은
 * 요청 밖(스크립트·빌드)에서도 읽히고, 그때 `headers()` 는 던진다.
 * 못 읽으면 `unknown` 한 칸으로 모이는데 **그래도 아이디별 셈은 그대로
 * 돈다**(열쇠가 IP 와 아이디를 함께 쓰므로).
 */
async function requestIp(): Promise<string> {
  try {
    const h = await (await import("next/headers")).headers();
    return clientIpFrom(h);
  } catch {
    /* 요청 밖에서 불린 것이다. 삼키는 것이 맞고, 그래도 막는 일은 돈다 */
    return "unknown";
  }
}

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    /* **비밀번호 로그인을 지우지 않는다.** 학과가 발급한 학번 계정은
       소셜 로그인이 없고, 그 계정이 지금 돌고 있는 계약의 전부다 */
    ...oauthProviders(),
    Credentials({
      credentials: {
        identifier: { label: "아이디" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(raw) {
        const identifier = String(raw?.identifier ?? "").trim();
        const password = String(raw?.password ?? "");
        if (!identifier || !password) return null;

        /**
         * **시도 제한은 여기서 막는다.**
         *
         * 여기에 두는 까닭은 `/api/auth/callback/credentials` 를 직접
         * 두드리는 쪽이 화면을 거치지 않기 때문이다. 그리고
         * **비밀번호를 비교하기 전에** 묻는다: 잠긴 동안에도 해시를
         * 계산하면 찍는 쪽이 우리 CPU 를 그만큼 쓴다.
         *
         * 막혔으면 `null` 이다. 틀린 비밀번호와 **응답이 같아서**
         * 안쪽 셈도 남은 시간도 여기서 새지 않고, 사람에게 하는 말은
         * 로그인 화면이 같은 모듈에 물어서 정한다.
         */
        const ip = await requestIp();
        if (!loginGate(ip, identifier).ok) return null;

        const user = await findUserByIdentifier(identifier);
        // 존재하지 않는 계정도 같은 시간이 걸리도록 비교는 항상 수행한다.
        const hash =
          user?.password_hash ??
          "$2a$12$0000000000000000000000000000000000000000000000000000";
        const ok = await verifyPassword(password, hash);

        /* **없는 아이디도 똑같이 센다.** 있는 계정에서만 잠기면 "잠겼다"
           는 응답이 그 아이디가 있다는 답이 된다 */
        if (!user || !ok) {
          loginFailed(ip, identifier);
          return null;
        }
        /* 정지·파기된 계정은 찍어서 맞힌 것이 아니므로 셈에 넣지 않는다 */
        if (user.status !== "active") return null;

        loginSucceeded(ip, identifier);
        await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id]);
        return { id: user.id, name: user.display_name };
      },
    }),
  ],
  callbacks: {
    /**
     * 소셜로 들어온 사람이 **누구인가.**
     *
     * 판단은 `resolveIdentity()` 하나가 하고 여기는 그 답을 화면으로
     * 옮기기만 한다(설계 원칙 10).
     *
     *   linked     그 사람이다 → 들여보낸다
     *   conflict   **합치지 않는다.** 같은 주소의 계정이 이미 있다는
     *              것만 알리고, 그 계정으로 들어와 연결하게 한다.
     *              이메일이 같다고 자동으로 합치면 남의 주소를 공급자에
     *              등록한 사람이 남의 계정을 가져간다
     *   fresh      동의를 받고 만든다. **여기서 바로 만들지 않는다**:
     *              가입 화면이 받는 필수 동의를 소셜이라고 건너뛰면
     *              동의 없는 계정이 생긴다
     *
     * 문자열을 돌려주면 그 주소로 보낸다(Auth.js v5). 신원은 봉한
     * 봉투에 담아 주소로 넘긴다 — **이름과 메일을 날것으로 싣지 않는다.**
     */
    async signIn({ account, profile }) {
      const pv = account?.provider ?? "";
      if (!isProvider(pv)) return true;   // 비밀번호 로그인은 그대로

      const id = identityFrom(pv, profile as Record<string, unknown>, account);
      if (!id) return "/login?error=oauth_profile";

      /**
       * **계정 화면에서 누른 `연결` 인가.**
       *
       * 그렇다면 묻는 것이 "누구인가" 가 아니라 "**이 사람에게** 붙여라"
       * 다. 나갈 때 봉해 둔 쪽지를 읽어 그 사람에게 붙이고, **지금
       * 세션을 바꾸지 않는다**: 문자열을 돌려주면 로그인이 일어나지
       * 않고 들고 있던 세션이 그대로 간다.
       */
      const intent = openIntent(
        (await (await import("next/headers")).cookies()).get(LINK_COOKIE)?.value, pv);
      if (intent) {
        const done = await linkAccount(intent.userId, id);
        return done.ok ? "/my?linked=" + pv : "/my?link=taken";
      }

      const r = await resolveIdentity(id);
      if (r.kind === "linked") {
        /* **정지된 계정은 소셜로도 못 들어온다.** 막는 자리가 둘이면
           한쪽이 늦게 고쳐진다 */
        if (r.status !== "active") return "/login?error=account_inactive";
        await markLogin(pv, id.subject);
        return true;
      }
      if (r.kind === "conflict") {
        return `/login/link?p=${pv}`;
      }
      return `/signup/social?t=${encodeURIComponent(seal(id))}`;
    },

    /**
     * 토큰에는 id만 신뢰하고, 나머지는 매 요청마다 DB에서 다시 읽는다.
     * 정지된 계정이 남은 쿠키로 계속 들어오거나, 비밀번호를 바꿨는데도
     * must_reset_pw 가 옛값으로 남는 일을 막는다.
     */
    async jwt({ token, user, account, profile }) {
      /**
       * **토큰의 `sub` 은 우리 `users.id` 다.**
       *
       * 소셜로 들어오면 NextAuth 가 거기에 공급자의 `sub` 을 넣어 둔다.
       * 그대로 두면 아래 조회가 그 값으로 `users` 를 찾아 아무것도 못
       * 찾고, 로그인한 사람이 로그인하지 않은 것으로 보인다. 그래서
       * 들어온 자리에서 한 번 바꿔 끼운다.
       */
      const pv = account?.provider ?? "";
      if (isProvider(pv)) {
        const id = identityFrom(pv, profile as Record<string, unknown>, account);
        const r = id ? await resolveIdentity(id) : null;
        if (!r || r.kind !== "linked") return null;
        token.sub = r.userId;
      } else if (user?.id) {
        token.sub = user.id;
      }
      if (!token.sub) return null;

      /**
       * **DB 가 잠깐 끊긴 것과 계정이 없는 것은 다른 일이다.**
       *
       * 매 요청마다 다시 읽는 설계라, PostgreSQL 이 몇 초 멈춘 동안 들어온
       * 요청에서 이 조회가 던진다. 그것을 `계정이 없다` 와 같은 길(`null`)로
       * 보내면 세션이 통째로 비고, `requireUser()` 가 로그인으로 보내고,
       * **검사 한가운데 있던 학생이 `/me` 로 떨어져 보내지 못한 답을 잃는다**
       * (R33 E2E 가 DB 를 실제로 멈춰서 그렇게 떨어졌다). 전에 한 번 확인된
       * 토큰이면 그 값을 그대로 두고, 저장 실패는 **그 호출**이 제 자리에서
       * `저장 실패 · 다시 시도` 로 적는다. 처음 들어오는 토큰(아직 확인된
       * 값이 없는)은 전처럼 거절한다: 확인하지 못한 사람을 들이지 않는다.
       */
      let row: UserRow | null;
      let memberships: Awaited<ReturnType<typeof loadMemberships>>;
      try {
        row = await queryOne<UserRow>(
          `SELECT id, display_name, password_hash, status, must_reset_pw, locale
             FROM users WHERE id = $1`,
          [token.sub],
        );
        if (!row || row.status !== "active") return null;
        memberships = await loadMemberships(row.id);
      } catch (e) {
        const verifiedBefore = typeof token.displayName === "string" && !!token.role;
        console.error(`[auth] 세션을 다시 읽지 못했습니다 (DB): ${String((e as Error)?.message ?? e).slice(0, 120)}`
          + (verifiedBefore ? " · 앞서 확인한 토큰을 그대로 둡니다" : " · 확인된 적 없는 토큰이라 거절합니다"));
        return verifiedBefore ? token : null;
      }
      token.displayName = row.display_name;
      token.locale = row.locale;
      token.mustResetPw = row.must_reset_pw;
      token.memberships = memberships;
      token.role = highestRole(memberships.map((m) => m.role));
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.name = token.displayName ?? "";
      session.user.locale = token.locale ?? "ko";
      session.user.mustResetPw = token.mustResetPw ?? false;
      session.user.memberships = token.memberships ?? [];
      session.user.role = token.role ?? "student";
      return session;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);

/**
 * **담당자 · 운영자 세션은 쿠키를 따로 쓴다**(2026-10-27 사업주 지적).
 *
 * 한 브라우저에 로그인 쿠키가 하나뿐이라, 같은 브라우저에서 학생으로 들어가
 * 보고 관리자 화면으로 돌아가면 **나중에 들어간 쪽이 앞의 로그인을 덮었고**,
 * 어느 한쪽에서 로그아웃을 누르면 둘 다 나갔다. 담당자 화면(`/admin` ·
 * `/org`)은 이 인스턴스의 쿠키만 먼저 보고, 학생 화면은 원래 쿠키를 먼저
 * 본다(`session.ts`). 그래서 한쪽에서 나가도 다른 쪽은 그대로다.
 *
 * 학생끼리는 원래부터 서로를 내보내지 않는다: 세션은 각 브라우저가 들고 있는
 * 쿠키(JWT)이고, 한 사람의 로그아웃은 **그 브라우저의 쿠키만** 지운다. 다만 같은 브라우저에서 두 학생 계정을 번갈아 쓰면 쿠키가 하나라
 * 뒤에 들어간 사람이 앞사람을 덮는다(학생은 각자 기기에서 들어온다).
 *
 * 소셜 로그인은 싣지 않는다: 담당자 계정은 학교가 발급한 아이디·비밀번호다.
 */
const SECURE = /^https:/i.test(process.env.AUTH_URL ?? process.env.PLATFORM_URL ?? "");
const STAFF_PREFIX = SECURE ? "__Secure-" : "";
const staffCookie = (name: string, httpOnly = true) => ({
  name: `${STAFF_PREFIX}cm-staff.${name}`,
  options: { httpOnly, sameSite: "lax" as const, path: "/", secure: SECURE },
});
const staff = NextAuth({
  ...authConfig,
  basePath: "/api/auth-staff",
  providers: authConfig.providers.filter((x) => typeof x !== "function" && x.type === "credentials"),
  cookies: {
    sessionToken: staffCookie("session-token"),
    callbackUrl: staffCookie("callback-url"),
    csrfToken: staffCookie("csrf-token"),
  },
});
export const staffAuth = staff.auth;
export const staffSignIn = staff.signIn;
export const staffSignOut = staff.signOut;

/**
 * 이 아이디가 담당자 · 운영자 계정인가. 로그인할 때 **어느 쿠키에 담을지만**
 * 정한다: 비밀번호 확인과 막는 일은 그대로 `authorize()` 가 한다.
 */
export async function staffRoleOf(identifier: string): Promise<Role | null> {
  const u = await findUserByIdentifier(identifier).catch(() => null);
  if (!u) return null;
  const ms = await loadMemberships(u.id).catch(() => [] as Membership[]);
  const r = highestRole(ms.map((m) => m.role));
  return r === "student" ? null : r;
}
