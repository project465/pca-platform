#!/usr/bin/env node
/**
 * CI 검증 결과를 사람이 읽는 한 장(`RESULT.md`)으로 묶는다.
 *
 *   node scripts/sejong/ci-summary.mjs <결과 폴더>
 *
 * 폴더에는 단계마다 `steps.tsv`(단계 \t 종료코드), 회귀 두 벌(`head.tsv` ·
 * `base.tsv`), 브라우저 로그(`e2e.log`)가 있다. 회귀는 줄마다 HEAD 와 기준을
 * 나란히 적고 셋으로 가른다: 둘 다 통과 · **세종 때문에 걸림(기준 통과 →
 * HEAD 걸림)** · 원래부터 걸림. 둘째만 세종 작업의 결함이다.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = process.argv[2] ?? "docs/sejong/ci";
const rd = (f) => (existsSync(path.join(dir, f)) ? readFileSync(path.join(dir, f), "utf8") : "");
const tsv = (f) => rd(f).trim().split("\n").filter(Boolean).map((l) => l.split("\t"));

const steps = tsv("steps.tsv");
const head = Object.fromEntries(tsv("head.tsv").map(([k, rc, s]) => [k, { rc, s }]));
const base = Object.fromEntries(tsv("base.tsv").map(([k, rc, s]) => [k, { rc, s }]));
const meta = Object.fromEntries(tsv("meta.tsv"));

const mark = (rc) => (rc === "0" ? "통과" : rc === "NA" ? "없음" : `걸림(${rc})`);
let regress = 0;
const rows = Object.keys({ ...base, ...head }).map((k) => {
  const h = head[k]?.rc ?? "—", b = base[k]?.rc ?? "—";
  let v = "같음";
  if (h === "0" && b === "0") v = "둘 다 통과";
  else if (h !== "0" && b === "0") { v = "**세종 때문에 걸림**"; regress++; }
  else if (h !== "0" && b !== "0") v = "기준에서도 걸림 (세종과 무관)";
  else if (h === "0" && b !== "0") v = "HEAD 에서만 통과";
  return `| \`${k}\` | ${mark(b)} | ${mark(h)} | ${v} |`;
});

const e2e = rd("e2e.log");
const e2eLine = e2e.match(/(\d+) 통과 · (\d+) 걸림/);
const e2eBad = [...e2e.matchAll(/^\s+걸림\s+(.+)$/gm)].map((m) => `- ${m[1]}`);

const md = `# 세종 CI 검증 결과

자동 생성: \`scripts/sejong/ci-summary.mjs\` · GitHub Actions \`sejong-verify\`

| 항목 | 값 |
|---|---|
| 커밋 | \`${meta.sha ?? "?"}\` |
| 기준 커밋 | \`${meta.base ?? "0bff307c"}\` |
| 실행 | ${meta.run_url ? `[${meta.run_id}](${meta.run_url})` : "로컬"} |
| 시각 (UTC) | ${meta.at ?? "?"} |
| Node | ${meta.node ?? "?"} |

## 1. 단계

| 단계 | 결과 |
|---|---|
${steps.map(([k, rc]) => `| ${k} | ${mark(rc)} |`).join("\n")}

## 2. 기존 측정·채점 회귀 (기준 vs 세종 HEAD)

같은 러너 · 같은 Node · 같은 PostgreSQL 16 에서 두 벌을 돌렸다.

| 검사 | 기준 \`0bff307c\` | 세종 HEAD | 판정 |
|---|---|---|---|
${rows.join("\n")}

**세종 때문에 걸린 회귀: ${regress}건.**

## 3. 브라우저 E2E (\`scripts/sejong/e2e-shots.mjs\`)

${e2eLine ? `**${e2eLine[1]} 통과 · ${e2eLine[2]} 걸림**` : "실행 기록 없음"}

${e2eBad.length ? "걸린 줄:\n\n" + e2eBad.join("\n") : ""}

화면 캡처와 PDF 는 \`docs/sejong/shots/\` 에 있다.
`;
writeFileSync(path.join(dir, "RESULT.md"), md);
console.log(md);
