import type { Axis } from "@/lib/me-v3/scoring/types";
import { content, domainName, domainSub } from "@/lib/me-v3/runtime/session";
import { AXIS_KO, AXIS_WHAT_KO } from "@/lib/me-v3/result/text.ko";
import { AXIS_KO as AXIS_EN, AXIS_WHAT_KO as AXIS_WHAT_EN } from "@/lib/me-v3/result/text.en";

/** MAT 이 읽고 쓰는 말. 영어 작업공간이면 영어다 */
export type MatLang = "ko" | "en";

/**
 * 한 Core 의 영역과 판단축을 Claude 와 규칙이 같이 읽는 꼴로 펴 둔다.
 *
 * **목록이 곧 허용 범위다.** Claude 가 돌려준 코드와 문장은 여기 있는
 * 것만 남긴다. 목록 밖의 영역을 받아 두면 그 전공에 없는 자리가 그
 * 사람의 공고 분석에 선다.
 */

export const AXES: Axis[] = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];

export type CatalogDomain = {
  code: string;
  name: string;
  /** 세부 영역을 이은 한 줄 */
  sub: string;
  /** 규칙으로 읽을 때 쓰는 낱말 */
  words: string[];
  /** 그 영역의 판단축마다 고를 수 있는 문장 */
  checklist: Record<string, string[]>;
  artifacts: string[];
  verify: string[];
};

const CACHE = new Map<string, CatalogDomain[]>();

/** 낱말로 쪼갠다. 두 글자보다 짧은 토막과 흔한 말은 버린다 */
const STOP = new Set(["관리", "업무", "경험", "기반", "이해", "능력", "수행", "담당",
  "지원", "관련", "등의", "또는", "위한", "통한", "있는", "하는", "합니다"]);
export function wordsOf(s: string): string[] {
  return s
    .split(/[\s·,/()\[\]「」'"“”‘’.:;!?·~\-–—+&]+/)
    .map((w) => w.replace(/(을|를|이|가|은|는|의|에|와|과|로|으로|및)$/u, ""))
    .filter((w) => w.length >= 2 && !STOP.has(w));
}

/**
 * **언어가 열쇠의 반이다**(`core|lang`). 영어는 영어 원고가 있는 Core 만
 * 있다(기계 · 전기전자 · 컴퓨터). 없으면 한국어 목록으로 떨어진다: 영역 코드는
 * 두 원고가 같아서 판정은 그대로이고, 화면에 한국어 이름이 서는 것만 다르다.
 */
export function catalog(core: string, lang: MatLang = "ko"): CatalogDomain[] {
  const key = lang === "ko" ? core : `${core}|${lang}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  if (lang !== "ko" && !hasLang(core, lang)) return catalog(core);
  const c = content(core, lang);
  const lists = c.checklists.domains as Record<string, Record<string, { text: string }[]>>;
  const out: CatalogDomain[] = c.domains.domains.map((d) => {
    const name = domainName(core, d.code, lang);
    const sub = domainSub(core, d.code, 80, lang);
    const checklist: Record<string, string[]> = {};
    for (const ax of AXES) checklist[ax] = (lists[d.code]?.[ax] ?? []).map((x) => x.text);
    return {
      code: d.code, name, sub,
      words: [...new Set([...wordsOf(name), ...wordsOf(sub),
        ...(d.artifacts ?? []).flatMap(wordsOf)])],
      checklist,
      artifacts: d.artifacts ?? [],
      verify: d.verify_targets ?? [],
    };
  });
  CACHE.set(key, out);
  return out;
}

/** 그 Core 에 그 언어 원고가 있는가. 없으면 `content()` 가 던진다 */
export function hasLang(core: string, lang: MatLang): boolean {
  if (lang === "ko") return true;
  try { content(core, lang); return true; } catch { return false; }
}

/** 영역 이름. 그 언어 원고가 없으면 한국어 이름이다 */
export function areaName(core: string, td: string, lang: MatLang = "ko"): string {
  return domainName(core, td, hasLang(core, lang) ? lang : "ko");
}

/** 판단축 이름 */
export function axisName(a: Axis, lang: MatLang = "ko"): string {
  return (lang === "en" ? AXIS_EN : AXIS_KO)[a];
}

/** Claude 에게 보여 줄 목록. 코드와 이름과 세부만 적는다 */
export function catalogPrompt(core: string, lang: MatLang = "ko"): string {
  const lines = catalog(core, lang).map((d) => `- ${d.code}: ${d.name} (${d.sub})`);
  if (lang === "en") {
    const axes = AXES.map((a) => `- ${a}: ${AXIS_EN[a]}: ${AXIS_WHAT_EN[a]}`);
    return `Technical areas:\n${lines.join("\n")}\n\nJudgment axes:\n${axes.join("\n")}`;
  }
  const axes = AXES.map((a) => `- ${a}: ${AXIS_KO[a]} — ${AXIS_WHAT_KO[a]}`);
  return `기술영역:\n${lines.join("\n")}\n\n판단축:\n${axes.join("\n")}`;
}

export function isAxis(x: unknown): x is Axis {
  return typeof x === "string" && (AXES as string[]).includes(x);
}
