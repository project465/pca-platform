"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signOut, inactiveReason } from "@/lib/auth";
import { clientIpFrom, loginGate } from "@/lib/login-throttle";
import { queryOne, query } from "@/lib/db";
import { homeFor, sejongOrgId, type SejongKind } from "@/sejong/lib/session";

export type LoginState = { error?: string };

/**
 * 세종 로그인. **인증은 공통 엔진 그대로다**(Auth.js Credentials · 시도 제한).
 * 갈리는 것은 들어간 뒤 어디로 보내는가 하나다. 세종 기관에 자리가 없는
 * 계정은 들여보내지 않고 세션을 만들지 않는다.
 */
export async function sejongLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password) return { error: "아이디와 비밀번호를 모두 입력하세요." };

  const gate = loginGate(clientIpFrom(await headers()), identifier);
  if (!gate.ok) return { error: "로그인 시도가 너무 많습니다. 잠시 뒤에 다시 시도해주세요." };

  const orgId = await sejongOrgId();
  if (!orgId) return { error: "시연 기관이 아직 준비되지 않았습니다. 관리자에게 알려 주세요." };

  const u = await queryOne<{ id: string }>(
    `SELECT id FROM users WHERE login_id = $1 OR lower(email) = lower($1)
      ORDER BY (login_id = $1) DESC NULLS LAST, id LIMIT 1`, [identifier]);
  const kinds: SejongKind[] = [];
  if (u) {
    const p = await queryOne<{ status: string }>(
      `SELECT status FROM sj_participants WHERE user_id = $1 AND org_id = $2`, [u.id, orgId]);
    if (p?.status === "active") kinds.push("participant");
    const s = await query<{ kind: SejongKind }>(
      `SELECT kind FROM sj_staff WHERE user_id = $1 AND org_id = $2`, [u.id, orgId]);
    kinds.push(...s.map((x) => x.kind));
  }

  try {
    await signIn("credentials", { identifier, password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      const why = await inactiveReason(identifier, password);
      if (why) return { error: "사용이 중지된 계정입니다. 진흥원 담당자에게 문의해 주세요." };
      return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
    }
    throw e;
  }
  /* 비밀번호가 맞아도 세종 자리가 없으면 세션을 남기지 않는다 */
  if (kinds.length === 0) {
    await signOut({ redirect: false });
    return { error: "이 계정은 세종 진단 참여자나 기관 담당자로 등록되어 있지 않습니다." };
  }
  redirect(homeFor(kinds));
}
