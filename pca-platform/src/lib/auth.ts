import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { query, queryOne } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { highestRole, isRole, type Role } from "@/lib/roles";

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
     * 토큰에는 id만 신뢰하고, 나머지는 매 요청마다 DB에서 다시 읽는다.
     * 정지된 계정이 남은 쿠키로 계속 들어오거나, 비밀번호를 바꿨는데도
     * must_reset_pw 가 옛값으로 남는 일을 막는다.
     */
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
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
