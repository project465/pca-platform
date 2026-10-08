/**
 * 조사를 받침에 따라 고른다.
 *
 * **문자열을 그냥 이어 붙이지 않는다.** 뒤에 오는 말이 응시자가 고른
 * 항목이거나 영역 이름이라 앞말이 늘 달라지고, 그때마다 `기구·제품 설계은`
 * 과 `조립도이나 부품도` 가 나간다. 한 번 눈으로 고쳐도 다음 영역에서
 * 그대로 돌아온다.
 *
 * 받침은 한글 음절에서 바로 센다: 음절 코드에서 `0xAC00` 을 빼고 28로
 * 나눈 나머지가 종성 번호이고, 0 이면 받침이 없다. 한글이 아닌 끝 글자는
 * **소리 나는 대로** 센다(`CAE` 는 `캐이`, `3` 은 `삼`).
 */

type Pair = "은는" | "이가" | "을를" | "과와" | "이나" | "으로" | "이라" | "으면";

/** 받침 없이 읽는 알파벳과 숫자. 나머지는 받침이 있다고 본다 */
const OPEN_TAIL = new Set([
  "a", "e", "i", "o", "u", "y",      /* 에이 · 이 · 아이 · 오 · 유 · 와이 */
  "f", "h", "j", "p", "q", "r", "t", "v", "w", "x", "z",
  "2", "4", "5", "9",                 /* 이 · 사 · 오 · 구 */
]);
/** 받침이 ㄹ 이라 `로` 와 `면` 을 그대로 받는 끝 글자 */
const RIEUL_TAIL = new Set(["l", "1", "7", "8"]);   /* 엘 · 일 · 칠 · 팔 */

type Tail = "none" | "rieul" | "other";

function tailOf(word: string): Tail {
  const ch = [...word.trim()].pop() ?? "";
  if (!ch) return "none";
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28;
    if (jong === 0) return "none";
    return jong === 8 ? "rieul" : "other";
  }
  const low = ch.toLowerCase();
  if (RIEUL_TAIL.has(low)) return "rieul";
  if (OPEN_TAIL.has(low)) return "none";
  /* 괄호나 따옴표로 끝나면 그 앞 글자로 다시 본다 */
  if (/[)\]"'’」』]/.test(ch)) return tailOf(word.slice(0, -1));
  return "other";
}

const FORMS: Record<Pair, [string, string]> = {
  /* [받침 있음, 받침 없음] */
  은는: ["은", "는"],
  이가: ["이", "가"],
  을를: ["을", "를"],
  과와: ["과", "와"],
  이나: ["이나", "나"],
  으로: ["으로", "로"],
  이라: ["이라", "라"],
  으면: ["으면", "면"],
};

/** 앞말에 맞는 조사 하나 */
export function josaOf(word: string, pair: Pair): string {
  const tail = tailOf(word);
  const [withTail, noTail] = FORMS[pair];
  /* `으로` 와 `으면` 은 받침이 ㄹ 일 때 받침 없는 쪽을 쓴다 */
  if ((pair === "으로" || pair === "으면") && tail === "rieul") return noTail;
  return tail === "none" ? noTail : withTail;
}

/** 앞말에 조사를 붙인다 */
export function withJosa(word: string, pair: Pair): string {
  return `${word}${josaOf(word, pair)}`;
}

/**
 * 둘을 `~이나 ~` 로 잇는다. 셋 이상은 앞의 둘만 쓴다.
 *
 * 목록 기호를 문장 안에 넣지 않는다: 가운뎃점으로 이으면 문장이 아니라
 * 표가 된다.
 */
export function orList(list: string[]): string {
  const x = list.filter(Boolean).slice(0, 2);
  if (x.length === 0) return "";
  if (x.length === 1) return x[0];
  return `${withJosa(x[0], "이나")} ${x[1]}`;
}

/** 둘을 `~과 ~` 로 잇는다 */
export function andList(list: string[]): string {
  const x = list.filter(Boolean).slice(0, 2);
  if (x.length === 0) return "";
  if (x.length === 1) return x[0];
  return `${withJosa(x[0], "과와")} ${x[1]}`;
}
