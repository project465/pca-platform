/**
 * 작업공간(`/me/*`)의 영어. **열쇠가 한국어 원문 자체다**(`me-v3/phrase.ts`
 * · `lib/entry-say.ts` 와 같은 꼴).
 *
 * 한국어는 사전을 거쳐도 글자가 그대로 나가서, 이 길을 들인 날 한국어 화면이
 * 한 글자도 바뀌지 않는다. 사전은 **쪽마다 한 파일**(`ws-en/*.ts`)이다: 한
 * 파일에 모으면 여러 쪽을 동시에 고칠 때 같은 파일을 붙들고 다투고, 쪽을
 * 지울 때 그 쪽의 줄만 골라 지우기 어렵다.
 *
 * 자리표시는 `{이름}` 이고, 수에 따라 갈리는 영어는 `{n|item|items}` 로
 * 적는다(값이 1 이면 앞). **빠진 열쇠는 원문(한국어)이 나가서 화면에 한글이
 * 선다**: `npm run v3:en:walk` 가 그것을 센다.
 */
import { WS_EN_SHELL } from "./ws-en/shell";
import { WS_EN_HOME } from "./ws-en/home";
import { WS_EN_STATE } from "./ws-en/state";
import { WS_EN_NEXT } from "./ws-en/next";
import { WS_EN_EXPERIENCE } from "./ws-en/experience";
import { WS_EN_RECOMPUTE } from "./ws-en/recompute";
import { WS_EN_RESULTS } from "./ws-en/results";
import { WS_EN_EXPLORE } from "./ws-en/explore";
import { WS_EN_PREP } from "./ws-en/prep";
import { WS_EN_TRACK } from "./ws-en/track";
import type { WsLang } from "./ws-lang";

export type WsSay = (ko: string, vars?: Record<string, string | number>) => string;

const EN: Record<string, string> = {
  /* MAT 사전은 맨 앞에 둔다: 다른 쪽과 같은 열쇠가 있으면 먼저 있던 쪽이 이긴다 */
  ...WS_EN_TRACK,
  ...WS_EN_SHELL, ...WS_EN_HOME, ...WS_EN_STATE, ...WS_EN_NEXT,
  ...WS_EN_EXPERIENCE, ...WS_EN_RECOMPUTE, ...WS_EN_RESULTS,
  ...WS_EN_EXPLORE, ...WS_EN_PREP,
};

function fill(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s
    .replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\|([^|{}]*)\|([^|{}]*)\}/g, (m, k: string, one: string, many: string) =>
      (k in vars ? (Number(vars[k]) === 1 ? one : many) : m))
    .replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (m, k: string) =>
      (k in vars ? String(vars[k]) : m));
}

/** 같은 한국어가 자리마다 다른 영어가 될 때만 `#꼬리` 를 붙인다. 한국어는 꼬리를 뗀다 */
const bare = (ko: string): string => ko.replace(/#[a-z0-9_]+$/i, "");

/** 그 언어의 말. 영어가 아니면 원문 그대로다 */
export function wsSay(lang?: WsLang | string | null): WsSay {
  if (lang === "en") return (ko, vars) => fill(EN[ko] ?? bare(ko), vars);
  return (ko, vars) => fill(bare(ko), vars);
}

/** 검사용: 영어가 빠진 열쇠 */
export function wsMissing(keys: string[]): string[] {
  return keys.filter((k) => !(k in EN));
}
