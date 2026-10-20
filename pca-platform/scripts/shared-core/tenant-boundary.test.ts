/**
 * SC-1 경계 검사 (R36). **연결되지 않았다는 것을 말로 두지 않고 센다.**
 *
 *  B1 shared-core 는 node: 내장과 shared-core 안의 파일만 들여온다
 *  B2 shared-core 밖의 src 파일 가운데 shared-core 를 들여오는 것이 0 이다
 *     (화면 · 인증 · 채점 · 결과 · PDF 어디에도 붙지 않았다)
 *  B3 shared-core 안에 쓰는 fs API 가 0 이다 (읽기 전용)
 *  B4 shared-core 가 읽는 환경변수는 CONTENT_DIR 하나다
 *  B5 shared-core 가 DB · 네트워크 · 자식 프로세스에 닿지 않는다
 *
 * 주석은 걷어 내고 본다: 이 저장소는 `왜 쓰지 않는가` 를 주석으로 남긴다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = "src";
const SC = join("src", "lib", "shared-core");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.(ts|tsx|mjs|js)$/.test(f) ? [p] : [];
  });
}
const code = (f: string) => readFileSync(f, "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");
const importsOf = (src: string) =>
  [...src.matchAll(/(?:import|export)\s[^"'`;]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)|^\s*import\s*["']([^"']+)["']/gm)]
    .map((m) => m[1] ?? m[2] ?? m[3] ?? m[4]);

const scFiles = walk(SC);
const others = walk(ROOT).filter((f) => !f.startsWith(SC + sep));

test("B0 shared-core 파일이 있다", () => {
  assert.ok(scFiles.length >= 6, scFiles.join(", "));
  console.log(`# shared-core ${scFiles.length} 벌 · 그 밖의 src ${others.length} 벌`);
});

test("B1 shared-core 는 node: 내장과 shared-core 안만 들여온다", () => {
  const bad: string[] = [];
  for (const f of scFiles) {
    for (const s of importsOf(code(f))) {
      const ok = s.startsWith("node:") || (s.startsWith("./") || s.startsWith("../"))
        && !relative(SC, join(f, "..", s)).startsWith("..");
      if (!ok) bad.push(`${f} → ${s}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("B2 shared-core 밖에서 shared-core 를 들여오는 src 파일이 0 이다", () => {
  const bad = others.filter((f) => importsOf(code(f)).some((s) => /shared-core/.test(s)));
  assert.deepEqual(bad, []);
});

test("B3 쓰는 fs API 가 0 이다", () => {
  const W = /\b(writeFile|writeFileSync|appendFile|appendFileSync|mkdir|mkdirSync|rm|rmSync|unlink|unlinkSync|rename|renameSync|copyFile|copyFileSync|createWriteStream|truncate|truncateSync|chmod|chown)\b/;
  const bad = scFiles.filter((f) => W.test(code(f)));
  assert.deepEqual(bad, []);
});

test("B4 읽는 환경변수는 CONTENT_DIR 하나다", () => {
  const seen = new Set<string>();
  for (const f of scFiles) for (const m of code(f).matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)) seen.add(m[1]);
  assert.deepEqual([...seen].sort(), ["CONTENT_DIR"]);
  const dyn = scFiles.filter((f) => /process\.env\[/.test(code(f)));
  assert.deepEqual(dyn, []);
});

test("B5 DB · 네트워크 · 자식 프로세스에 닿지 않는다", () => {
  const N = /\b(node:(http|https|net|tls|dgram|child_process|worker_threads)|fetch\s*\(|from\s*["'](pg|@\/lib\/db)["'])/;
  const bad = scFiles.filter((f) => N.test(code(f)));
  assert.deepEqual(bad, []);
});
