"use server";

import { signOut } from "@/lib/auth";

/** 로그아웃하고 KUS 학교 로그인으로 돌아간다. 개인 회원 로그인으로 보내지 않는다 */
export async function kusLogout(): Promise<void> {
  await signOut({ redirectTo: "/campus/kus/login?next=%2Fkus" });
}
