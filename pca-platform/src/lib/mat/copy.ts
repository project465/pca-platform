import type { Txt } from "@/app/me/me-text";

/**
 * MAT 문구 묶음을 언어로 고르는 도구. **아무것도 서버 전용을 들이지 않는다**: 클라이언트 화면
 * (결제 동의 · 질문 입력창)도 이 파일을 쓴다. 언어를 정하는 쪽은 `lang.ts`(서버)다
 */
export type MatUiLang = "ko" | "en";

/** 문구 한 줄을 그 언어로. `{이름}` 자리를 채운다. 그 언어가 없으면 한국어 */
export function sayOf(lang: MatUiLang) {
  return (x: Txt, vars?: Record<string, string | number>): string => {
    const s = (lang === "en" ? x.en : undefined) ?? x.ko;
    return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
  };
}

/**
 * 언어마다 한 벌인 문구 묶음(값에 함수가 섞인 묶음). 영어 · 일본어 벌은 한국어 벌과 같은 열쇠를 가져야 한다.
 * 일본어 벌이 없으면 한국어다
 */
export type Widen<T> = T extends string ? string
  : T extends (...a: infer A) => string ? (...a: A) => string
  : T extends readonly string[] ? readonly string[]
  : T extends object ? { [K in keyof T]: Widen<T[K]> } : T;
export type CopySet<T> = { ko: T; en: Widen<T>; ja?: Widen<T> };
export function copyOf<T>(set: CopySet<T>, lang: MatUiLang | "ja"): Widen<T> {
  return (lang === "en" ? set.en : lang === "ja" ? set.ja ?? set.ko : set.ko) as Widen<T>;
}
