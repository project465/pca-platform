import type { Axis } from "@/lib/me-v3/scoring/types";
import { content, domainName, domainSub } from "@/lib/me-v3/runtime/session";
import { AXIS_KO, AXIS_WHAT_KO } from "@/lib/me-v3/result/text.ko";

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

export function catalog(core: string): CatalogDomain[] {
  const hit = CACHE.get(core);
  if (hit) return hit;
  const c = content(core);
  const lists = c.checklists.domains as Record<string, Record<string, { text: string }[]>>;
  const out: CatalogDomain[] = c.domains.domains.map((d) => {
    const name = domainName(core, d.code);
    const sub = domainSub(core, d.code, 80);
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
  CACHE.set(core, out);
  return out;
}

/** Claude 에게 보여 줄 목록. 코드와 이름과 세부만 적는다 */
export function catalogPrompt(core: string): string {
  const lines = catalog(core).map((d) => `- ${d.code}: ${d.name} (${d.sub})`);
  const axes = AXES.map((a) => `- ${a}: ${AXIS_KO[a]} — ${AXIS_WHAT_KO[a]}`);
  return `기술영역:\n${lines.join("\n")}\n\n판단축:\n${axes.join("\n")}`;
}

export function isAxis(x: unknown): x is Axis {
  return typeof x === "string" && (AXES as string[]).includes(x);
}
