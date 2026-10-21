import type { Metadata } from "next";
import type { Lang } from "@/content/model";
import { DEFAULT_LANG, HTML_LANG, LANGS, localePath } from "./i18n";

/** 쪽마다 받는 것: 그 언어의 정규 주소와, 같은 쪽의 다른 언어 주소(hreflang) */
export type PageParams = { params: Promise<{ lang: string }> };

/**
 * 한 쪽의 메타데이터.
 *
 * **언어마다 정규 주소를 따로 적는다.** 적지 않으면 검색엔진이 네 언어의
 * 같은 쪽을 베낀 것으로 보고 한 벌만 싣는다. `x-default` 는 한국어판이다:
 * 언어를 정하지 못한 사람은 이 사이트가 처음 팔리는 시장의 말로 연다.
 */
export function pageMeta(lang: Lang, path: string, m: { title: string; description: string }): Metadata {
  const languages: Record<string, string> = {};
  for (const l of LANGS) languages[HTML_LANG[l]] = localePath(l, path);
  if (LANGS.length > 1) languages["x-default"] = localePath(DEFAULT_LANG, path);
  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: localePath(lang, path), languages },
  };
}
