/**
 * 브라우저 탭 제목을 그 사람의 언어로.
 *
 * `export const metadata = { title: "가격 · CareerMatri" }` 로 두면 영어로
 * 들어온 손님의 탭에도 한국어가 선다. 열쇠는 한국어 원문이고 영어는
 * `phrases.en.ts` 에 있다(`phrase()` 와 같은 사전이다).
 *
 * `?lang=` 을 먼저 본다. 미들웨어가 그 값을 쿠키로 굳히는 것은 **응답에서**
 * 라, 처음 들어온 요청에서는 쿠키가 아직 없다.
 */
import { phrase } from "@/lib/me-v3/phrase";
import { resolveLang } from "@/lib/locale-server";

export async function pageTitle(
  ko: string, q?: Promise<Record<string, string | string[] | undefined>>,
): Promise<{ title: string }> {
  const sp = q ? await q.catch(() => ({} as Record<string, string | string[] | undefined>)) : {};
  const raw = sp.lang;
  const lang = await resolveLang(typeof raw === "string" ? raw : undefined);
  return { title: phrase(lang)(ko) };
}
