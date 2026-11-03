import { cache } from "react";
import { cookies, headers } from "next/headers";
import { DEFAULT_LANG, isLang, LANG_COOKIE, OFFERED_LANGS, pickAcceptLanguage, type Lang } from "./locale";

/**
 * 서버에서만 쓴다. locale.ts 와 나눠 둔 이유는 그 파일을 클라이언트 컴포넌트인
 * 언어 전환 버튼이 함께 쓰기 때문이다. next/headers 가 섞이면 빌드가 깨진다.
 *
 * **정하는 차례**(2026-11-03 대표 "언어는 사용자 선택 + 브라우저 언어 기본값"):
 *
 *   1. 쿼리스트링(`?lang=en`). 링크 하나로 언어를 지정해 보낼 수 있어야
 *      해외 대학 담당자가 학생들에게 영어판 주소를 뿌릴 수 있다
 *   2. 이 기기의 쿠키(`metri_lang`). 언어 전환기가 적는다
 *   3. 로그인한 사람의 계정 언어(`users.locale`). 가입한 화면의 언어이고, 전환기로
 *      고르면 같이 바뀐다. 다른 기기에서 들어와도 고른 언어가 따라온다
 *   4. 브라우저 언어(`Accept-Language`). 아무것도 고르지 않은 사람의 기본값
 *   5. 이 배포본의 기본 언어
 *
 * 학교가 만든 학생 계정은 `users.locale = 'ko'` 로 선다. 그래서 브라우저가 영어여도
 * 로그인한 학교 학생은 한국어로 보고, 전환기로 바꿀 수 있다.
 */
const offered = (v: string | null | undefined): v is Lang =>
  isLang(v ?? undefined) && OFFERED_LANGS.includes(v as Lang);

/** 로그인한 사람의 계정 언어. 한 요청에 한 번만 읽는다. 로그인 전 · 못 읽음은 `null` */
const accountLang = cache(async (): Promise<Lang | null> => {
  try {
    const { currentUser } = await import("@/lib/session");
    const u = await currentUser();
    if (!u || u.scope === "staff") return null;
    const { queryOne } = await import("@/lib/db");
    const r = await queryOne<{ locale: string | null }>(`SELECT trim(locale) AS locale FROM users WHERE id = $1`, [u.id]);
    return offered(r?.locale) ? (r!.locale as Lang) : null;
  } catch {
    return null;
  }
});

async function browserLang(): Promise<Lang | null> {
  try {
    return pickAcceptLanguage((await headers()).get("accept-language"));
  } catch {
    return null;
  }
}

export async function resolveLang(override?: string): Promise<Lang> {
  if (offered(override)) return override;
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  if (offered(c)) return c;
  return (await accountLang()) ?? (await browserLang()) ?? DEFAULT_LANG;
}

/**
 * 사용자가 **고른** 언어(쿼리 · 쿠키 · 계정 · 브라우저). 아무 신호도 없으면 `null` 이다.
 *
 * `resolveLang()` 은 아무것도 고르지 않은 사람에게도 배포본 기본 언어를 돌려준다.
 * ME_V3 응시 언어를 정하는 자리(`openAttempt`)는 그 둘을 갈라야 한다: 신호가 없으면
 * 시장의 기본 언어(GLOBAL=en)가 먼저이고, 그때 기본 언어 `ko` 를 고른 값으로 넘기면
 * 글로벌 응시가 전부 한국어로 열린다. 브라우저 언어는 그 사람이 쓰는 언어라 신호로 센다
 */
export async function explicitLang(override?: string | null): Promise<Lang | null> {
  if (offered(override)) return override;
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  if (offered(c)) return c;
  return (await accountLang()) ?? (await browserLang());
}
