import { cookies } from "next/headers";
import { isLang, LANG_COOKIE, type Lang } from "./locale";

/**
 * 서버에서만 쓴다. locale.ts 와 나눠 둔 이유는 그 파일을 클라이언트 컴포넌트인
 * 언어 전환 버튼이 함께 쓰기 때문이다 — next/headers 가 섞이면 빌드가 깨진다.
 *
 * 쿼리스트링이 쿠키를 이긴다. 링크 하나로 언어를 지정해 보낼 수 있어야
 * 해외 대학 담당자가 학생들에게 영어판 주소를 뿌릴 수 있다.
 */
export async function resolveLang(override?: string): Promise<Lang> {
  if (isLang(override)) return override;
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(c) ? c : "ko";
}
