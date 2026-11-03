/**
 * 홈페이지의 언어 (2026-10-21).
 *
 * **한국어는 주소에 앞머리가 없다.** 명함과 메일에 적혀 나간 주소
 * (`careermatri.com/universities`)가 그대로 열려야 해서다. 다른 언어만
 * `/en` · `/ja` · `/zh` 를 붙인다. 안에서는 미들웨어가 `/ko/…` 로 돌려
 * `app/[lang]` 한 벌이 네 언어를 다 그린다: 쪽을 언어마다 베끼면 한 벌이
 * 반드시 뒤처진다.
 *
 * **이 파일은 원고를 들여오지 않는다.** 미들웨어가 Edge 에서 읽는데, 원고
 * 넷을 끌고 들어오면 그 무게가 요청마다 실린다.
 *
 * 글로벌판(`SITE=global`)은 영어 한 벌이라 언어 고르기가 서지 않는다.
 */
import type { Lang } from "@/content/model";

const BY_SITE: Record<string, Lang[]> = {
  kr: ["ko", "en", "ja", "zh"],
  global: ["en"],
};

/** 이 배포본이 내놓는 언어. 첫 칸이 앞머리 없는 기본 언어다 */
export const LANGS: Lang[] = BY_SITE[process.env.SITE ?? "kr"] ?? BY_SITE.kr;
export const DEFAULT_LANG: Lang = LANGS[0];

export function isLang(v: string | undefined): v is Lang {
  return !!v && (LANGS as string[]).includes(v);
}

/** 언어 고르기에 서는 이름. 그 언어로 적는다: 고르는 사람이 읽을 줄을 찾는 자리다 */
export const LANG_NAME: Record<Lang, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
};

/** `<html lang>` 과 hreflang 값. 중국어는 간체라는 것을 밝힌다(글꼴이 그 값을 본다) */
export const HTML_LANG: Record<Lang, string> = { ko: "ko", en: "en", ja: "ja", zh: "zh-Hans" };

/** Open Graph 의 locale */
export const OG_LOCALE: Record<Lang, string> = { ko: "ko_KR", en: "en_US", ja: "ja_JP", zh: "zh_CN" };

/**
 * 그 언어의 주소. 기본 언어는 앞머리를 붙이지 않는다.
 *
 *   localePath("en", "/")              → "/en"
 *   localePath("en", "/universities")  → "/en/universities"
 *   localePath("en", "/#how")          → "/en#how"
 *   localePath("ko", "/contact")       → "/contact"
 */
export function localePath(lang: Lang, path: string): string {
  if (lang === DEFAULT_LANG) return path;
  if (path === "/") return `/${lang}`;
  if (path.startsWith("/#") || path.startsWith("/?")) return `/${lang}${path.slice(1)}`;
  return `/${lang}${path}`;
}

/**
 * 앱 화면의 언어. **앱은 한국어·영어 둘만 내놓는다**(`NEXT_PUBLIC_LANGS`).
 * 내놓지 않는 언어를 넘기면 앱이 기본 언어(한국어)로 열어서, 일본어 쪽에서
 * 누른 사람이 한국어 가입 화면을 만난다. 영어가 그보다 덜 다친다.
 */
export function appLang(lang: string): "ko" | "en" {
  return lang === "ko" ? "ko" : "en";
}
