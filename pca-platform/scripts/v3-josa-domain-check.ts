/**
 * **영역 이름 뒤의 조사 점검**(2026-11-03 4개 기관 화면 D-1). 실제 화면에 `기구·제품 설계은 해 봤고` 와
 * `문헌·자료 조사은` 이 나갔다. 받침을 보는 함수(`josaOf`)는 있었는데 화면 문장 틀이 `{name}은` 처럼 조사를
 * 글자로 박아 두어 그 함수를 지나지 않았다.
 *
 * 두 가지를 센다.
 *   1. 모든 Core 의 모든 영역 이름에 은/는 · 이/가 · 을/를 · 과/와 를 붙여, `josaOf` 가 낸 조사가 **마지막 한글
 *      글자의 받침**으로 따로 정한 조사와 같은가(가운뎃점 · 괄호 · 따옴표로 끝나는 이름도 마지막 한글 글자를 본다)
 *   2. 학생 화면 소스(`src/app/me` · `src/app/v3` · 결과 문장)에 자리표 바로 뒤에 조사를 글자로 박은 문장 틀이 0건인가
 *      (`{name}은` · `${x}가` 꼴). 받침을 모르는 자리에서 조사를 고정하면 다음 이름에서 또 틀린다
 *
 *   npx tsx scripts/v3-josa-domain-check.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { registry, hasCoreFile } from "../src/lib/me-v3/core-registry";
import { domainName } from "../src/lib/me-v3/runtime/session";
import { josaOf } from "../src/lib/me-v3/result/josa";

type Pair = Parameters<typeof josaOf>[1];
const PAIRS: [Pair, string, string][] = [["은는", "은", "는"], ["이가", "이", "가"], ["을를", "을", "를"], ["과와", "과", "와"]];

/** 따로 세는 받침: 마지막 한글 글자 하나만 본다 */
function lastHangul(s: string): string | null {
  for (let i = s.length - 1; i >= 0; i -= 1) {
    const c = s.charCodeAt(i);
    if (c >= 0xac00 && c <= 0xd7a3) return s[i];
    if (/[A-Za-z0-9]/.test(s[i])) return null;
  }
  return null;
}
const hasTail = (ch: string): boolean => (ch.charCodeAt(0) - 0xac00) % 28 !== 0;

let pass = 0; const bad: string[] = [];
let names = 0;
for (const c of registry().cores) {
  if (!hasCoreFile(c.code, "domains")) continue;
  let list: { code: string }[] = [];
  try {
    list = JSON.parse(readFileSync(join("sites/pca-platform/content", `${c.code.toLowerCase().replace(/_core_v\d+$/, "")}-v1-domains.json`), "utf8")).domains ?? [];
  } catch { /* 파일 이름이 다른 Core 는 domainName 이 이름을 준다 */ }
  const codes = list.length ? list.map((d) => d.code) : Array.from({ length: 12 }, (_, i) => `TD${String(i + 1).padStart(2, "0")}`);
  for (const td of codes) {
    const nm = domainName(c.code, td);
    if (nm === td) continue;
    names += 1;
    const last = lastHangul(nm);
    if (!last) continue;
    for (const [pair, withT, noT] of PAIRS) {
      const want = hasTail(last) ? withT : noT;
      const got = josaOf(nm, pair);
      if (got === want) pass += 1; else bad.push(`${c.code} ${td} ${nm} + ${pair}: ${got} (기대 ${want})`);
    }
  }
}

/* ── 2. 소스의 고정 조사 ── */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}
const FIXED = /(\{[a-zA-Z]+\}|\$\{[^}]+\})(은|는|이|가|을|를|과|와)(?=[ ,.·"`?])/;
const files = [...walk("src/app/me"), ...walk("src/app/v3"), "src/lib/me-v3/result/text.ko.ts", "src/lib/me-v3/change-text.ko.ts"];
const fixed: string[] = [];
for (const f of files) {
  readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, "");
    if (/^\s*(\*|\/\*)/.test(code)) return;
    if (FIXED.test(code)) fixed.push(`${f}:${i + 1}: ${code.trim().slice(0, 100)}`);
  });
}

console.log(`영역 이름 ${names}개 × 조사 넷 — 통과 ${pass} · 걸림 ${bad.length}`);
for (const b of bad.slice(0, 20)) console.log(`  걸림 ${b}`);
console.log(`화면 소스의 고정 조사 — ${fixed.length}건`);
for (const b of fixed) console.log(`  걸림 ${b}`);
process.exitCode = bad.length || fixed.length ? 1 : 0;
