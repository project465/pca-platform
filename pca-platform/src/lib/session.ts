import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, staffAuth } from "@/lib/auth";
import type { Role } from "@/lib/roles";
import type { Membership } from "@/lib/auth";

export type SessionUser = {
  id: string;
  name: string;
  locale: string;
  mustResetPw: boolean;
  role: Role;
  memberships: Membership[];
  /** 어느 로그인 쿠키에서 읽었는가. 로그아웃이 그 쪽만 지운다 */
  scope?: "staff" | "student";
};

/**
 * 이 요청이 어느 쪽 화면인가.
 *
 *   staff    담당자 화면(`/admin` · `/org`)과 거기서 넘어간 자리(`?as=staff`)
 *   student  학생이 쓰는 자리(작업공간 · 검사 · 결과 · 학교 입구)
 *   shared   그 밖(첫 화면 · 로그인 · 비밀번호 · 약관 · 지원)
 */
async function sideOf(): Promise<"staff" | "student" | "shared"> {
  let path = "";
  try { path = (await headers()).get("x-cm-path") ?? ""; } catch { path = ""; }
  if (/^\/(admin|org)(\/|\?|$)/.test(path) || /[?&]as=staff(&|$)/.test(path)) return "staff";
  if (/^\/(me|m|v3|cores|test|campus|workspace|free|evidence|report)(\/|\?|$)/.test(path)) return "student";
  return "shared";
}

/**
 * 지금 로그인한 사람. **담당자와 학생은 쿠키가 따로다**(`auth.ts`).
 *
 * 담당자 화면은 담당자 쿠키만, 학생 화면은 학생 쿠키만 본다. 그래서 한
 * 브라우저에 둘이 같이 들어가 있어도 각자의 화면으로 서고, 한쪽이 로그아웃하면
 * **그쪽 화면만** 로그인으로 간다(다른 쪽 사람으로 슬쩍 바뀌지 않는다).
 * 첫 화면 · 로그인 · 비밀번호처럼 함께 쓰는 자리는 학생 쪽을 먼저 보고 없으면
 * 담당자 쪽을 본다.
 *
 * **학생 쿠키에 담당자 역할이 들어 있으면 어디서도 받지 않는다**(2026-10-30 사업주 지적).
 * 분리 전(10-27)에 들어온 담당자는 학생 쿠키를 들고 있다. 그 사람이 다시 로그인하지
 * 않아도 되게 담당자 화면이 그 쿠키를 받아 주었더니, 담당자 화면에서 로그아웃하면
 * **학생 쿠키가 지워져** 같은 브라우저의 학생 화면까지 나갔다. 그래서 옛 로그인은
 * 한 번 다시 들어오게 하고(그때 `login/actions.ts` 가 옛 쿠키도 치운다), 담당자는
 * 담당자 쿠키에서만 읽는다. 학생 화면에서만 막으면 `/login` 과 `/admin` 이 서로를
 * 가리키며 돈다.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const side = await sideOf();
  const read = async (fn: typeof auth, scope: "staff" | "student"): Promise<SessionUser | null> => {
    const session = await fn();
    return session?.user?.id ? { ...(session.user as SessionUser), scope } : null;
  };
  /* 학생 쿠키는 학생 역할일 때만 받는다(위 설명) */
  const student = async () => {
    const u = await read(auth, "student");
    return u && u.role === "student" ? u : null;
  };
  if (side === "staff") return read(staffAuth, "staff");
  if (side === "student") return student();
  return (await student()) ?? (await read(staffAuth, "staff"));
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
  if (user.mustResetPw && !opts.skipPasswordGate) {
    redirect(user.scope === "staff" ? "/password/change?as=staff" : "/password/change");
  }
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

/**
 * 이 브라우저에 **운영자(superadmin)** 가 담당자 쿠키로 들어와 있는가. 화면 쪽(학생 · 담당자 ·
 * 함께)과 상관없이 담당자 쿠키만 본다: 가려 둔 제휴 화면을 대표님이 학생 화면에서도
 * 확인할 수 있게 한다(`brand.ts` 의 `partnerVisible`). 모르면 아니라고 답한다.
 */
export async function isSuperadmin(): Promise<boolean> {
  try {
    const s = await staffAuth();
    const u = s?.user as SessionUser | undefined;
    return Boolean(u?.id && u.role === "superadmin" && !u.mustResetPw);
  } catch {
    return false;
  }
}
