import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Role } from "@/lib/roles";
import type { Membership } from "@/lib/auth";

export type SessionUser = {
  id: string;
  name: string;
  locale: string;
  mustResetPw: boolean;
  role: Role;
  memberships: Membership[];
};

export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  return session?.user ? (session.user as SessionUser) : null;
}

/**
 * 로그인하지 않았으면 로그인 화면으로 보낸다.
 * 첫 로그인 강제 변경(must_reset_pw)이 걸린 계정은 비밀번호를 바꾸기 전에는
 * 어떤 화면에도 들어갈 수 없다. 비밀번호 변경 화면 자신만 예외다.
 */
export async function requireUser(
  opts: { skipPasswordGate?: boolean } = {},
): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.mustResetPw && !opts.skipPasswordGate) redirect("/password/change");
  return user;
}

export async function requireRole(allowed: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) redirect("/");
  return user;
}

/** 해당 기관에 대해 이 사용자가 가진 역할. 없으면 null. */
export function roleInOrg(user: SessionUser, orgId: string): Role | null {
  if (user.role === "superadmin") return "superadmin";
  return user.memberships.find((m) => m.orgId === orgId)?.role ?? null;
}
