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
 */
async function findUserByIdentifier(identifier: string): Promise<UserRow | null> {
  return queryOne<UserRow>(
    `SELECT id, display_name, password_hash, status, must_reset_pw, locale
       FROM users
      WHERE login_id = $1 OR lower(email) = lower($1)
      LIMIT 1`,
    [identifier],
  );
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

        const user = await findUserByIdentifier(identifier);
        // 존재하지 않는 계정도 같은 시간이 걸리도록 비교는 항상 수행한다.
        const hash =
          user?.password_hash ??
          "$2a$12$0000000000000000000000000000000000000000000000000000";
        const ok = await verifyPassword(password, hash);

        if (!user || !ok) return null;
        if (user.status !== "active") return null;

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

      const row = await queryOne<UserRow>(
        `SELECT id, display_name, password_hash, status, must_reset_pw, locale
           FROM users WHERE id = $1`,
        [token.sub],
      );
      if (!row || row.status !== "active") return null;

      const memberships = await loadMemberships(row.id);
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
