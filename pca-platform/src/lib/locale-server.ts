import { cookies } from "next/headers";
import { DEFAULT_LANG, isLang, LANG_COOKIE, OFFERED_LANGS, type Lang } from "./locale";

/**
 * 서버에서만 쓴다. locale.ts 와 나눠 둔 이유는 그 파일을 클라이언트 컴포넌트인
 * 언어 전환 버튼이 함께 쓰기 때문이다. next/headers 가 섞이면 빌드가 깨진다.
 *
 * 쿼리스트링이 쿠키를 이긴다. 링크 하나로 언어를 지정해 보낼 수 있어야
 * 해외 대학 담당자가 학생들에게 영어판 주소를 뿌릴 수 있다.
 */
export async function resolveLang(override?: string): Promise<Lang> {
  const offered = (v: string | undefined): v is Lang =>
    isLang(v) && OFFERED_LANGS.includes(v);
  if (offered(override)) return override;
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  return offered(c) ? c : DEFAULT_LANG;
}

/**
 * 사용자가 **직접 고른** 언어. 고른 적이 없으면 `null` 이다.
 *
 * `resolveLang()` 은 아무것도 고르지 않은 사람에게도 기본 언어를 돌려준다.
 * ME_V3 응시 언어를 정하는 자리(`openAttempt`)는 그 둘을 갈라야 한다: 고른
 * 적이 없으면 시장의 기본 언어(GLOBAL=en)가 먼저이고, 그때 기본 언어 `ko` 를
 * 고른 값으로 넘기면 글로벌 응시가 전부 한국어로 열린다.
 */
export async function explicitLang(override?: string | null): Promise<Lang | null> {
  const offered = (v: string | null | undefined): v is Lang =>
    isLang(v ?? undefined) && OFFERED_LANGS.includes(v as Lang);
  if (offered(override)) return override;
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  return offered(c) ? c : null;
}
