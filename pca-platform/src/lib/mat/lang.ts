import { resolveLang } from "@/lib/locale-server";
import type { MatUiLang } from "./copy";
export type { MatUiLang } from "./copy";

/**
 * MAT 화면 · AI 답의 언어(2026-11-03 대표 "언어는 사용자 선택 + 브라우저 언어 기본값. AI 답은 사용자 언어로").
 *
 * **화면 언어를 그대로 따른다**(쿠키 → 계정 언어 → 브라우저 언어, `locale-server.ts`). 일본어는 칸만 있고
 * 내놓지 않으므로 지금은 `ko` · `en` 둘이다. 못 읽으면 한국어다
 */
export async function matLang(): Promise<MatUiLang> {
  try {
    return (await resolveLang()) === "en" ? "en" : "ko";
  } catch {
    return "ko";
  }
}
