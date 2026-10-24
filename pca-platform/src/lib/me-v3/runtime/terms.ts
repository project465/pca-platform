/**
 * **그 전공의 말을 쉬운 말로 한 번 받친다.**
 *
 * 용어를 빼지 않는다. 전공자가 읽는 글이라 `공차` 와 `중재` 와 `양생` 은
 * 제자리에 쓰는 것이 맞고, 일반어로 풀어 적으면 오히려 얕게 읽힌다(저장소가
 * 전부터 적어 둔 원칙이다). 막으려는 것은 다른 자리다: **낱말 하나를 몰라서
 * `해 본 적 없음` 을 고르는 일**이다. 그 응답은 경험이 없다는 뜻이 아니고,
 * 그대로 채점에 들어가면 그 영역이 통째로 사라진다.
 *
 * **문항 은행을 고치지 않는다.** 은행의 문면과 보기와 `option_values` 가 한
 * 글자도 바뀌지 않고, 여기서 하는 일은 화면이 그 말을 어떻게 받쳐 주는가
 * 뿐이다. 그래서 동결된 은행(기계공학)도 받침을 받는다. **판정에 들어가지
 * 않는다**: 채점은 이 파일을 읽지 않는다.
 *
 * 산업팩 문항이 전부터 들고 있던 `gloss` 와 같은 자리이고, 쓰는 길도 같다
 * (화면의 한 줄). 저쪽은 문항마다 적고 이쪽은 **말마다** 적는다: 같은 말이
 * 문항 여덟 자리에 서는데 여덟 번 따로 적으면 그 가운데 하나가 어긋난다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONTENT_DIR, sharedFile } from "../core-registry";

type Doc = { by_core: Record<string, Record<string, string>> };

let cache: Doc | null = null;

function doc(): Doc {
  if (!cache) {
    try {
      cache = JSON.parse(
        readFileSync(join(process.cwd(), CONTENT_DIR, "me-v3-terms.json"), "utf8")) as Doc;
    } catch {
      /* 표가 없으면 받침이 서지 않을 뿐이고 응시는 그대로 돈다 */
      cache = { by_core: {} };
    }
  }
  return cache;
}

/** 한 화면에 붙는 줄 수. 셋이 걸리는 문항은 문면을 고칠 자리다 */
const MAX = 2;

/**
 * 그 글에 나오는 말의 받침 한 줄. 없으면 `null`.
 *
 * 긴 말을 먼저 본다: `표준작업절차` 가 걸릴 자리에서 `절차` 를 집으면
 * 받침이 엉뚱한 말을 가리킨다.
 */
export function termGlossOf(core: string, text: string, lang = "ko"): string | null {
  const table = lang === "ko" ? doc().by_core[core] : termsIn(core, lang);
  if (!table) return null;
  /* 영어는 낱말 경계로 찾는다. 글자로만 찾으면 `gain` 이 `again` 에서,
     `lock` 이 `block` 에서 걸려 엉뚱한 문항 아래 풀이가 섰다. 한국어는
     조사가 붙어 경계가 없으므로 그대로 글자로 찾는다 */
  const found = (t: string) => lang === "ko" ? text.includes(t)
    : new RegExp(`(^|[^A-Za-z])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z]|$)`, "i").test(text);
  const hit = Object.keys(table)
    .filter(found)
    .sort((a, b) => b.length - a.length)
    .slice(0, MAX);
  if (!hit.length) return null;
  /* 낱말과 풀이 사이는 쌍점이다. 대시(—)는 화면 문장에 쓰지 않는다 */
  return hit.map((t) => `${t}: ${table[t]}`).join(" · ");
}

/**
 * 다른 언어의 받침. **공용 원고(`shared-<CORE>.json`)의 `terms` 를 읽는다.**
 *
 * 열쇠는 한국어 용어이고 값이 그 언어의 낱말과 풀이다. 화면 글은 그 언어라서
 * 그 언어의 낱말로 찾는다. 원고가 없으면 받침이 서지 않을 뿐이고(한국어 받침을
 * 세우지 않는다) 응시는 그대로 돈다.
 */
const TERMS = new Map<string, Record<string, string>>();
function termsIn(core: string, lang: string): Record<string, string> {
  const key = `${core}|${lang}`;
  let t = TERMS.get(key);
  if (!t) {
    t = {};
    try {
      for (const v of Object.values(sharedFile(core, lang).terms ?? {})) {
        if (v?.term && v.gloss) t[v.term] = v.gloss;
      }
    } catch { /* 원고가 없으면 받침 없이 선다 */ }
    TERMS.set(key, t);
  }
  return t;
}

/** 그 Core 가 받치는 말 전부. 검사가 읽는다 */
export function termsOf(core: string): Record<string, string> {
  return doc().by_core[core] ?? {};
}
