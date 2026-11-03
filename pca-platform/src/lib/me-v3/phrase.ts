/**
 * 화면 JSX 에 박힌 글을 언어로 고르는 자리. **열쇠가 한국어 원문 자체다.**
 *
 * 결과지 엔진의 사전(`report-i18n.json`)과 같은 꼴이다: 한국어는 사전을 거쳐도
 * 글자가 그대로 나가서, 이 길을 들인 날 한국어 화면이 한 글자도 바뀌지 않는다.
 * 두 벌로 갈라 적지 않으므로 한쪽만 고쳐지는 날이 오지 않는다.
 *
 * 자리표시는 `{이름}` 하나다. 한국어 문장 안의 조사는 받침을 보고 고르는
 * 자리(`josa.ts`)가 이미 따로 있어서 여기서 다루지 않는다.
 *
 * **빠진 열쇠를 조용히 넘기지 않는다.** 영어 사전에 없는 열쇠는 원문을 그대로
 * 내보내고(화면에 한글이 서서 눈에 띈다) `npm run v3:i18n` 이 소스에서 `t("…")`
 * 를 모두 뽑아 사전과 견준다.
 */
import { PHRASES_EN } from "./phrases.en";

export type Say = (ko: string, vars?: Record<string, string | number>) => string;

/**
 * `{이름}` 을 값으로 바꾼다. 영어처럼 수에 따라 낱말이 갈리는 언어는
 * `{n|question|questions}` 로 적는다(값이 1 이면 앞, 아니면 뒤). 한국어 열쇠에는
 * 이 꼴이 없어서 한국어 글자는 그대로다.
 */
function fill(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s
    .replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\|([^|{}]*)\|([^|{}]*)\}/g, (m, k: string, one: string, many: string) =>
      (k in vars ? (Number(vars[k]) === 1 ? one : many) : m))
    .replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (m, k: string) =>
      (k in vars ? String(vars[k]) : m));
}

/**
 * **같은 한국어가 자리마다 다른 영어가 될 때만** 열쇠 끝에 `#꼬리` 를 붙인다
 * (`문항#unit`). 한국어는 꼬리를 떼고 나가서 글자가 그대로다.
 */
const bare = (ko: string): string => ko.replace(/#[a-z0-9_]+$/i, "");

const KO: Say = (ko, vars) => fill(bare(ko), vars);
const EN: Say = (ko, vars) => fill(PHRASES_EN[ko] ?? bare(ko), vars);

/** 그 언어의 `t()`. 모르는 값이면 한국어(원문)다 */
export function phrase(lang?: string | null): Say {
  return lang === "en" ? EN : KO;
}
