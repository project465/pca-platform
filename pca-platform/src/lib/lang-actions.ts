"use server";

import { cookies } from "next/headers";
import { isLang, LANG_COOKIE, OFFERED_LANGS, type Lang } from "@/lib/locale";

/**
 * 언어 전환기가 부른다. **이 기기의 쿠키와 계정 언어를 함께 적는다**(2026-11-03 대표 "언어는 사용자 선택").
 * 로그인 전이면 쿠키만 적는다. 계정 언어는 메일(`MAIL.en`) · 다른 기기에서 들어올 때의 기본값이 읽는다.
 * 운영자(담당자) 로그인은 계정 언어를 바꾸지 않는다
 */
export async function rememberLang(l: string): Promise<{ ok: boolean }> {
  if (!isLang(l) || !OFFERED_LANGS.includes(l as Lang)) return { ok: false };
  (await cookies()).set(LANG_COOKIE, l, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  try {
    const { currentUser } = await import("@/lib/session");
    const u = await currentUser();
    if (u && u.scope !== "staff") {
      const { query } = await import("@/lib/db");
      await query(`UPDATE users SET locale = $2 WHERE id = $1`, [u.id, l]);
    }
  } catch { /* 쿠키는 이미 적었다. 계정 언어는 다음에 고를 때 다시 적는다 */ }
  return { ok: true };
}
