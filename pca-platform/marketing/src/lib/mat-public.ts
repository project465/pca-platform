/**
 * **MAT(AI 취업비서)을 고객에게 보일지 정하는 스위치 하나**(2026-10-31 대표 지시: "가려",
 * "MAT은 기능 완성되면 그때 다시 하자").
 *
 * false 인 동안:
 * - 머리 메뉴 · 손전화 메뉴 · 바닥글의 AI 취업비서 / MAT 링크가 빠진다
 * - 첫 화면 요금 칸의 MAT 카드, 대학원생 칸의 'MAT이 더하는 것', 대학·기관 쪽의
 *   'MAT 학교 이용권', 문의 갈래의 MAT 이 빠진다
 * - `/assistant` 쪽을 만들지 않고, 그 주소로 오면 첫 화면으로 돌려보낸다(`next.config.ts`)
 *
 * 다시 열 때는 이 값만 true 로 바꾼다. 원고(`content/*.ts`)는 그대로 둔다.
 * 앱 쪽 스위치는 `src/lib/mat-public.ts`(같은 이름)에 따로 있다.
 */
export const MAT_PUBLIC = false;

/** MAT 을 가리키는 말. 원고의 배열 항목에서 이 말이나 MAT 주소가 보이면 그 항목을 뺀다 */
const MAT_WORDS = /\bMAT\b|AI\s?취업\s?비서|AI career assistant|AI就活アシスタント|AI求职助手/;
const MAT_HREF = /^(\/[a-z]{2})?\/(assistant|me\/track)(\/|#|\?|$)|\/me\/track/;

function mentionsMat(x: unknown): boolean {
  if (typeof x === "string") return MAT_WORDS.test(x) || MAT_HREF.test(x);
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  /* 항목을 대표하는 칸만 본다. 긴 본문 한 줄에 MAT 이 섞였다고 질문 하나를 통째로 빼지 않는다 */
  for (const k of ["href", "label", "title", "name"]) {
    if (typeof o[k] === "string" && mentionsMat(o[k])) return true;
  }
  const cta = o.cta as { href?: unknown } | undefined;
  return typeof cta?.href === "string" && MAT_HREF.test(cta.href);
}

/** 본문 한 줄 안에 MAT 이 섞인 곳. 항목을 빼지 않고 그 말만 덜어 낸다 */
const MAT_IN_TEXT: [string, string][] = [
  ["결과지와 MAT도", "결과지도"],
  ["結果レポートとMATも", "結果レポートも"],
  ["结果报告和 MAT 也", "结果报告也"],
];

/** 원고에서 MAT 을 걷어 낸 사본. 원고 자체는 건드리지 않는다 */
export function withoutMat<T>(site: T): T {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.filter((e) => !mentionsMat(e)).map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
        if (k === "assistant") continue;
        if (k === "matTitle" || k === "mat") continue;
        out[k] = walk(x);
      }
      return out;
    }
    if (typeof v === "string") return MAT_IN_TEXT.reduce((t, [from, to]) => t.split(from).join(to), v);
    return v;
  };
  return walk(site) as T;
}
