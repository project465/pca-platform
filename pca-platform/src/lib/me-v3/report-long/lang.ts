/**
 * 책 한 권이 어느 언어로 서는가.
 *
 * 책은 한 번에 한 권을 **동기로** 짓는다(`assemble` · `renderHtml`). 그래서 짓기 전에
 * 한 번 정해 두고 쪽마다 읽는다. 인자로 열한 개 파일을 지나 넘기면 한 자리를
 * 빠뜨렸을 때 그 쪽만 한국어로 서는데, 화면으로는 잘 안 보인다.
 *
 * **한국어 글자는 그대로다.** `T(ko, en)` 은 한국어 책에서 첫 인자를 그대로
 * 돌려주므로, 영어판을 더해도 한국어 책은 글자까지 같다(`report:long` 이
 * 같은 응시의 HTML 을 대조한다).
 */
export type BookLang = "ko" | "en";

let cur: BookLang = "ko";

export function setBookLang(l: BookLang): void { cur = l; }
export function bookLang(): BookLang { return cur; }
export const isEn = (): boolean => cur === "en";
/** 한국어 · 영어 한 쌍에서 지금 언어를 고른다 */
export const T = (ko: string, en: string): string => (cur === "en" ? en : ko);
/** 값에 따라 바뀌는 쌍. 영어에서만 부르는 함수가 한국어 글자를 만들지 않게 */
export const TF = <A extends unknown[]>(ko: (...a: A) => string, en: (...a: A) => string) =>
  (...a: A): string => (cur === "en" ? en(...a) : ko(...a));

/** 한국어 쌍과 영어 쌍을 같은 열쇠로 두고, 읽는 순간의 언어로 고른다 */
export function byLang<V extends object>(ko: V, en: V): V {
  return new Proxy(ko, {
    get: (_t, k) => (cur === "en" ? en : ko)[k as keyof V],
    ownKeys: () => Reflect.ownKeys(cur === "en" ? en : ko),
    getOwnPropertyDescriptor: (_t, k) =>
      Reflect.getOwnPropertyDescriptor(cur === "en" ? en : ko, k),
    has: (_t, k) => k in (cur === "en" ? en : ko),
  });
}
