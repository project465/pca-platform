/**
 * 결과지 엔진에서 사람이 읽는 한국어를 뽑아낸다.
 *
 * **주석과 문자열을 가른다.** 설계 주석에도 한국어가 가득한데 그것은 화면에
 * 나가지 않는다. 주석까지 번역 대상으로 세면 할 일이 두 배로 보이고, 정작
 * 빠진 화면 문구는 그 속에 묻힌다.
 *
 * 쓰임 둘:
 *   node scripts/i18n-extract.mjs            뽑아서 센다
 *   node scripts/i18n-extract.mjs --wrap     문자열을 T(...) 로 감싼다
 *
 * 감싸는 쪽은 한 번만 돌린다. **한국어 출력이 한 글자도 달라지면 안 되고**,
 * `i18n:parity` 가 그것을 감싸기 전후로 대조한다.
 */
import { readFileSync, writeFileSync } from "node:fs";

export const FILES = [
  "sites/pca-platform/assets/v2-report.js",
  "sites/pca-platform/assets/v2-value-report.js",
  "sites/pca-platform/assets/v2-coverage-report.js",
  "sites/pca-platform/assets/v2-decision.js",
  "sites/pca-platform/assets/value-engine.js",
  "sites/pca-platform/assets/coverage-engine.js",
  "sites/pca-platform/assets/readiness.js",
  "sites/pca-platform/assets/stage.js",
  "sites/pca-platform/assets/country.js",
  "sites/pca-platform/assets/research.js",
];

const HAN = /[가-힣]/;

/**
 * 아주 작은 자바스크립트 훑개.
 *
 * 파서를 들이지 않는 것은 이 파일들이 한 벌의 평범한 ES5 라서다. 가르는
 * 것은 넷뿐이다: 줄 주석 · 덩이 주석 · 문자열 · 정규식. **정규식을 문자열로
 * 잘못 보면** 그 안의 슬래시가 짝을 흐트러뜨려 뒤가 통째로 밀린다.
 */
export function scan(src) {
  const out = [];
  let i = 0, prev = "";
  const n = src.length;
  const isRegexStart = () => {
    /* 바로 앞의 뜻 있는 글자가 값이면 나누기고, 연산자면 정규식이다 */
    let k = out.length - 1;
    const p = prev.trim();
    void k;
    if (!p) return true;
    const c = p[p.length - 1];
    return !/[\w$)\]'"`]/.test(c);
  };
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === "/" && d === "/") {
      const j = src.indexOf("\n", i);
      const end = j < 0 ? n : j;
      out.push({ kind: "comment", start: i, end });
      prev += src.slice(i, end);
      i = end;
      continue;
    }
    if (c === "/" && d === "*") {
      const j = src.indexOf("*/", i + 2);
      const end = j < 0 ? n : j + 2;
      out.push({ kind: "comment", start: i, end });
      i = end;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < n) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === c) break;
        j += 1;
      }
      out.push({ kind: "string", quote: c, start: i, end: j + 1 });
      prev = "";
      i = j + 1;
      continue;
    }
    if (c === "/" && isRegexStart()) {
      let j = i + 1, cls = false;
      while (j < n) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === "[") cls = true;
        else if (src[j] === "]") cls = false;
        else if (src[j] === "/" && !cls) break;
        else if (src[j] === "\n") { j = -1; break; }
        j += 1;
      }
      if (j > 0) {
        while (j + 1 < n && /[gimsuy]/.test(src[j + 1])) j += 1;
        out.push({ kind: "regex", start: i, end: j + 1 });
        prev = "";
        i = j + 1;
        continue;
      }
    }
    prev += c;
    if (prev.length > 64) prev = prev.slice(-64);
    i += 1;
  }
  return out;
}

/** 이 자리가 이미 `T(` 안인가. 두 번 감싸지 않는다 */
function alreadyWrapped(src, start) {
  return /(^|[^\w$])T\(\s*$/.test(src.slice(Math.max(0, start - 8), start));
}

/**
 * 문자열 하나의 **실제 값**.
 *
 * **원본 글자를 열쇠로 쓰면 한 건도 안 맞는다.** 소스에 `"a=\\"b\\""` 라고
 * 적혀 있어도 `T()` 가 받는 것은 역슬래시가 풀린 `a="b"` 다. 열쇠는 받는
 * 쪽 모양이어야 한다.
 */
export function valueOf(raw) {
  try { return Function("return (" + raw + ")")(); } catch { return null; }
}

export function literalsOf(src) {
  const found = [];
  for (const t of scan(src)) {
    if (t.kind !== "string") continue;
    const raw = src.slice(t.start, t.end);
    const body = valueOf(raw);
    if (typeof body !== "string" || !HAN.test(body)) continue;
    found.push({ ...t, raw, body, wrapped: alreadyWrapped(src, t.start) });
  }
  return found;
}

const wrap = process.argv.includes("--wrap");
const all = new Map();
let wrappedCount = 0, already = 0;

for (const f of FILES) {
  const src = readFileSync(f, "utf8");
  const lits = literalsOf(src);
  let outSrc = src;
  /* 뒤에서부터 바꾼다. 앞에서 바꾸면 뒤쪽 자리 번호가 전부 밀린다 */
  for (let k = lits.length - 1; k >= 0; k--) {
    const L = lits[k];
    if (L.wrapped) { already += 1; continue; }
    all.set(L.body, (all.get(L.body) ?? 0) + 1);
    if (wrap) {
      outSrc = outSrc.slice(0, L.start) + "T(" + L.raw + ")" + outSrc.slice(L.end);
      wrappedCount += 1;
    }
  }
  if (wrap && outSrc !== src) writeFileSync(f, outSrc);
}

if (wrap) {
  console.log(`감싼 문자열 ${wrappedCount} · 이미 감싸진 것 ${already}`);
} else {
  const keys = [...all.keys()].sort();
  console.log(`화면에 나가는 한국어 ${keys.length}가지 (쓰인 자리 ` +
    `${[...all.values()].reduce((a, b) => a + b, 0)}곳)`);
  if (process.argv.includes("--list")) {
    for (const k of keys) console.log(JSON.stringify(k));
  }
}
