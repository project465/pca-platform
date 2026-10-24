/**
 * ME_V3 응시의 언어. **응시가 들고 다니고, 시작할 때 한 번 정한다.**
 *
 * 쿠키를 화면마다 읽어 언어를 고르면 영어로 답한 사람의 결과지가 한국어로
 * 열리는 날이 온다. 그래서 `v3_attempts.locale` 이 진실이고, 화면 · 결과 ·
 * PDF 는 그 값만 본다(`docs/metri/GLOBAL_EN_PLAN.md` 원칙 2).
 *
 * **채점은 언어를 모른다.** 이 파일을 읽는 자리는 화면과 결과를 그리는
 * 쪽뿐이고 `scoring/` 은 여기를 들여오지 않는다.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  CONTENT_DIR, core as coreOf, markets, sharedFileName, type CoreFile,
} from "./core-registry";

export type V3Lang = "ko" | "en";
export const V3_LANGS: readonly V3Lang[] = ["ko", "en"];

export function isV3Lang(v: unknown): v is V3Lang {
  return v === "ko" || v === "en";
}

/**
 * 영어판을 여는 Core. **사업주 결정(2026-10-24): 이공계 셋부터.**
 *
 * 등록부의 `markets` 에 GLOBAL 이 있는 Core 는 이보다 많다(바이오 · 반도체
 * 계획 Core 등). 그 Core 들은 영어 원고가 없으므로 시장이 열려 있어도
 * 영어 응시를 열지 않는다: 열면 화면 첫 장에서 원고가 없다고 멈춘다.
 */
export const EDITION_CORES: Record<Exclude<V3Lang, "ko">, readonly string[]> = {
  en: ["ME_CORE_V3", "EE_CORE_V1", "CS_CORE_V1"],
};

/** 번역하는 Core 파일(계약표). 나머지는 사람에게 보이지 않아 번역하지 않는다 */
export const TRANSLATED_FILES: readonly CoreFile[] = [
  "items", "checklists", "domains", "taxonomy",
];

/**
 * 그 Core 의 그 언어 원고가 **다 있는가.**
 *
 * 응시를 열 때 한 번 본다. 화면 중간에 한국어로 떨어지는 것과 다르다:
 * 원고가 아직 없으면 그 응시는 처음부터 한국어로 열리고, 한 응시 안에서
 * 두 언어가 섞이지 않는다.
 */
export function hasEdition(core: string, lang: V3Lang, dir = CONTENT_DIR): boolean {
  if (lang === "ko") return true;
  if (!EDITION_CORES[lang].includes(core)) return false;
  const c = coreOf(core, dir);
  const names = [
    ...TRANSLATED_FILES.map((k) => c.files[k]).filter((x): x is string => !!x),
    ...Object.values(c.packs ?? {}).filter((x): x is string => !!x),
    sharedFileName(core),
  ];
  return names.every((n) => existsSync(join(dir, lang, n)));
}

/**
 * 응시 언어를 정한다.
 *
 * 차례는 둘이다: 사용자가 고른 언어(쿠키 · `?lang=`, **내놓는 언어 목록에
 * 있을 때만** 부르는 쪽이 넘긴다) → 시장의 기본 언어(KR=ko · GLOBAL=en).
 * 어느 쪽이든 **그 Core 가 그 언어의 시장에 열려 있고 원고가 다 있어야**
 * 그 언어가 된다. 아니면 한국어다: 원본이 늘 있는 언어가 그것뿐이다.
 */
export function localeFor(args: {
  core: string; market: string; override?: string | null; dir?: string;
}): V3Lang {
  const dir = args.dir ?? CONTENT_DIR;
  const ms = markets(dir).markets;
  const want: V3Lang = isV3Lang(args.override) ? args.override
    : (ms.find((m) => m.code === args.market)?.locale_default === "en" ? "en" : "ko");
  if (want === "ko") return "ko";
  const c = coreOf(args.core, dir);
  /* 그 언어를 기본으로 쓰는 시장에 이 Core 가 열려 있는가 */
  const open = ms.some((m) => m.locale_default === want && c.markets.includes(m.code)
    && m.allowed_core_families.includes(c.family));
  return open && hasEdition(args.core, want, dir) ? want : "ko";
}
