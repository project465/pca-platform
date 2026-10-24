/**
 * 굳은 결과 모델의 **원고 글자**를 그 응시 언어로 바꿔 읽는다. 판정은 건드리지 않는다.
 *
 * 결과 모델은 제출할 때 한 번 굳고, 그 안에는 응시자가 고른 항목 · 영역 사전의
 * 결과물 이름 · 일하는 차례 · 번역 보기 같은 **한국어 원고 글자**가 들어 있다.
 * 채점과 모델은 언어를 모르므로(`canonicalPicks` 가 원본 글자로 되돌려 넘긴다)
 * 영어로 응시한 사람의 모델도 한국어 원고 글자를 든다. 그래서 같은 응답이면 두
 * 언어의 모델이 글자까지 같다.
 *
 * 영어로 그릴 때는 **두 원고가 같은 구조**라는 계약을 쓴다: 같은 자리의 글자를
 * 짝지어 사전을 만들고(한국어 → 그 언어), 모델의 글자를 그 사전으로 바꾼다.
 * 코드 · 축 · 상태 값은 한글이 없어 사전에 걸리지 않는다.
 *
 * **사전에 없는 글자를 지어내지 않는다.** 그대로 두면 화면에 한글이 서고,
 * `npm run v3:i18n` 이 그 자리를 센다.
 */
import { CONTENT_DIR, core as coreOf, coreFile, packs, type CoreFile, type PackKind } from "../core-registry";
import { CHAIN_EN, CHAIN_KO } from "./chains";
import { translateMenus } from "../student/translate";
import type { ResultModel } from "./model";

const HANGUL = /[가-힣]/;

type Dict = Map<string, string>;
const DICTS = new Map<string, Dict>();

/**
 * 원본이 **문장(`~다`)이었던** 영어 글자. 결과지는 고른 항목 가운데 문장만
 * 큰 글씨로 세우는데(이름표는 칩으로 간다), 영어에서는 끝맺음으로 그것을
 * 가를 수 없어서 원본에서 가져온다. 원고는 정적이라 한 벌을 함께 쓴다.
 */
const CLAUSE = new Set<string>();
const LABEL = new Set<string>();

function walk(ko: unknown, xx: unknown, out: Dict): void {
  if (typeof ko === "string") {
    if (typeof xx !== "string" || !xx.trim() || !HANGUL.test(ko)) return;
    put(ko, xx, out);
    /* 영역 사전의 업무 흐름은 `a · b · c` 로 늘어놓은 줄이고, 결과 모델은 그
       첫 토막만 든다(`build.ts` 의 `step`). 토막째로도 짝을 짓는다 */
    if (ko.includes(" · ")) {
      const a = ko.split(" · ");
      const b = xx.split(" · ");
      if (a.length === b.length) a.forEach((k, i) => put(k.trim(), b[i].trim(), out));
      else put(a[0].trim(), xx.trim(), out);
    }
    return;
  }
  if (Array.isArray(ko)) {
    if (!Array.isArray(xx)) return;
    ko.forEach((k, i) => walk(k, xx[i], out));
    return;
  }
  if (ko && typeof ko === "object" && xx && typeof xx === "object") {
    for (const [k, v] of Object.entries(ko as Record<string, unknown>)) {
      walk(v, (xx as Record<string, unknown>)[k], out);
    }
  }
}

function put(ko: string, xx: string, out: Dict): void {
  if (!ko || out.has(ko)) return;
  out.set(ko, xx);
  const bare = ko.trim().replace(/[.]$/, "");
  (/[가-힣]다$/.test(bare) ? CLAUSE : LABEL).add(xx);
}

/** 번역하는 Core 파일. 없는 파일은 건너뛴다(그 칸은 사전에 없을 뿐이다) */
const FILES: CoreFile[] = ["items", "checklists", "domains", "taxonomy",
  "checklist_additions", "common_additions"];
const PACKS: PackKind[] = ["industry", "role"];

/**
 * 그 Core 의 한국어 → 그 언어 사전. **원고는 정적이라 한 번 만들어 둔다.**
 *
 * 원고가 아직 없는 파일은 건너뛴다. 그 자리의 글자는 바뀌지 않고 한국어로
 * 남아, 화면에서 눈에 띄고 검사가 센다.
 */
export function contentDict(core: string, lang: string, dir = CONTENT_DIR): Dict {
  const key = `${core}|${lang}|${dir}`;
  let d = DICTS.get(key);
  if (d) return d;
  d = new Map();
  if (lang !== "ko") {
    const c = coreOf(core, dir);
    for (const f of FILES) {
      if (!c.files[f]) continue;
      try { walk(coreFile(core, f, dir), coreFile(core, f, dir, lang), d); } catch { /* 없는 원고 */ }
    }
    for (const k of PACKS) {
      if (!c.packs?.[k]) continue;
      try { walk(packs(core, k, dir), packs(core, k, dir, lang), d); } catch { /* 없는 원고 */ }
    }
    /* 코드에 든 원고: 번역 열 단계의 보기와 일하는 차례 */
    walk(translateMenus(core, "ko"), translateMenus(core, lang), d);
    if (lang === "en") walk(CHAIN_KO[core] ?? {}, CHAIN_EN[core] ?? {}, d);
  }
  DICTS.set(key, d);
  return d;
}

/** 원고 글자 하나를 그 언어로. 사전에 없으면 그대로 */
export function localizer(core: string, lang: string): (s: string) => string {
  if (lang === "ko") return (s) => s;
  const d = contentDict(core, lang);
  return (s) => d.get(s) ?? d.get(s.trim()) ?? s;
}

/**
 * 고른 항목이 **문장**인가(원본이 `~다` 로 끝나는가).
 *
 * 한국어는 끝맺음을 그대로 본다. 다른 언어는 원본에서 가져온 표시를 보고,
 * 사전에 없는 글자는 낱말이 넷 이상이면 문장으로 친다.
 */
export function isClause(s: string, lang: string): boolean {
  if (lang === "ko") return s.endsWith("다");
  if (CLAUSE.has(s)) return true;
  if (LABEL.has(s)) return false;
  return s.trim().split(/\s+/).length >= 4;
}

/* 되짚는 칸은 바꾸지 않는다: 안쪽 기록이고 화면에 서지 않는다 */
const KEEP = new Set(["provenance", "trace"]);

function deepMap<T>(v: T, f: (s: string) => string): T {
  if (typeof v === "string") return f(v) as unknown as T;
  if (Array.isArray(v)) return v.map((x) => deepMap(x, f)) as unknown as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      out[k] = KEEP.has(k) ? x : deepMap(x, f);
    }
    return out as T;
  }
  return v;
}

/**
 * 결과 모델 한 벌을 그 언어로 읽는다. **원본 모델은 고치지 않고 새 벌을 돌려준다.**
 *
 * 한국어면 그대로 돌려준다. 판정 칸(묶음 · 축 상태 · 까닭 코드 · 차례)은 글자가
 * 아니라서 사전에 걸리지 않고 그대로 간다.
 */
export function localizeResult(m: ResultModel, core: string, lang: string): ResultModel {
  if (lang === "ko") return m;
  return deepMap(m, localizer(core, lang));
}
