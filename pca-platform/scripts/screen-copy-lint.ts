/**
 * **화면 문구 점검**(2026-11-03 대표 "MAT과 커리어매트리는 개인 고객 · 외국인도 쓴다. 가독성과 AI 느낌 안 나는 게 중요").
 *
 * 화면에 실제로 나가는 한국어 조각(JSX 글자 · 문자열)만 뽑아 금지 꼴을 센다. 주석은 세지 않는다.
 * 기준은 CLAUDE.md `화면 문구 규칙(개인 고객 · 외국인 기준)`.
 *
 *   npm run copy:screens                 지금 수가 기록(scripts/screen-copy-baseline.json)보다 늘면 실패
 *   SCREEN_COPY=update npm run copy:screens   줄인 뒤 기록을 새로 적는다(늘린 채로 적지 않는다)
 *   SCREEN_COPY=list npm run copy:screens     걸린 조각을 파일마다 전부 보인다
 *
 * **한 번에 0 으로 만들지 않는다.** 지금 남은 수를 기록해 두고 늘지 못하게 막은 뒤, 화면을 고칠 때마다 줄인다.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

type Rule = { id: string; re: RegExp; why: string };

/* 화면에 쓰지 않는 꼴. 읽는 사람이 한국어가 모국어가 아닐 수 있다: 비유 · 관용구 · 수필체는 번역기도 사람도 틀리게 읽는다 */
export const RULES: Rule[] = [
  { id: "비유·관용구", re: /파고들|근거가 선|선 영역|서고\b|못 미칩니다|눈여겨|짚어|실마리|밑그림|디딤돌|발판|길잡이|오롯이|고스란히|곱씹|녹여|녹아 있|담아내|풀어내|엮어|그려 보|펼쳐 보|결이 |결을 |결에 /g,
    why: "뜻을 바로 쓴다(예: '근거가 선 영역' → '근거가 확인된 영역')" },
  { id: "AI 상투어", re: /여정|맞춤형|인사이트|첫걸음|한 걸음 더|효과적으로|체계적으로|최적의|전략적|다양한 |핵심적|혁신적|획기적|압도적|함께 만들어|도와드립니다|드릴게요|해 드립니다/g,
    why: "구체적인 값 · 동작으로 바꾼다" },
  { id: "대시·대구", re: /—|(?:이|가|은|는)\s*아니라\s/g, why: "쉼표나 두 문장으로 나눈다" },
  { id: "하지 않는 것 목록", re: /(?:하지|보내지|쓰지|묻지|팔지|만들지|세우지) 않습니다|(?:하지|보내지|쓰지) 않아요/g,
    why: "하지 않는 일을 늘어놓지 않는다. 필요한 고지는 확인창 한 곳에만" },
  { id: "해명 종결", re: /이유(?:입니다|예요)|때문입니다|뜻입니다|셈입니다/g, why: "설명을 줄이고 값과 버튼만 둔다" },
];

/** 한 문장 길이(공백 포함). 넘으면 둘로 나눈다. 세기만 하고 막지는 않는다(목록 · 고지문이 섞여 있다) */
const LONG = 60;

const ROOTS = ["src/app", "src/components"];
const EXTRA = ["src/lib/featured/text.ts", "src/lib/surface-text.ts", "src/lib/mat/job-title.ts"];
const SKIP = /\/(admin|ops|api)\//;

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    /* 화면 문구 파일(`*-text.ts`)도 잰다. 화면이 거기서 글자를 읽는다 */
    else if ((/\.tsx$/.test(f) || /-text\.ts$/.test(f)) && !SKIP.test(p + "/")) out.push(p);
  }
  return out;
}

/** 주석을 걷어 내고 한글이 든 화면 조각만(JSX 글자 · 따옴표 · 템플릿 문자열) */
export function fragments(src: string): string[] {
  const noComments = src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const out: string[] = [];
  const push = (s: string) => { const t = s.replace(/\s+/g, " ").trim(); if (/[가-힣]/.test(t)) out.push(t); };
  for (const m of noComments.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) push(m[1]);
  for (const m of noComments.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) push(m[1]);
  for (const m of noComments.matchAll(/`((?:[^`\\]|\\.)*)`/g)) push(m[1].replace(/\$\{[^}]*\}/g, "○"));
  for (const m of noComments.matchAll(/>([^<>{}]*[가-힣][^<>{}]*)</g)) push(m[1]);
  return out;
}

/** 한 화면 안의 높임 꼴. 둘이 섞이면 센다(어느 쪽으로 맞출지는 대표 결정) */
const yo = (s: string) => (s.match(/[가-힣](?:요|죠)[.!?]?(?=$|\s|["'`])/g) ?? []).length;
const da = (s: string) => (s.match(/니다[.!?]?(?=$|\s|["'`])/g) ?? []).length;

(function main() {
  const mode = process.env.SCREEN_COPY ?? "check";
  const files = [...ROOTS.flatMap((r) => walk(r)), ...EXTRA].sort();
  const counts: Record<string, Record<string, number>> = {};
  const hits: Record<string, string[]> = {};
  let long = 0, mixed = 0;
  const mixedFiles: string[] = [];
  for (const f of files) {
    const frs = fragments(readFileSync(f, "utf8"));
    let y = 0, d = 0;
    for (const fr of frs) {
      y += yo(fr); d += da(fr);
      for (const s of fr.split(/(?<=[.?!])\s+/)) if (s.length > LONG && /[가-힣]{2}/.test(s)) long += 1;
      for (const r of RULES) {
        const n = (fr.match(r.re) ?? []).length;
        if (!n) continue;
        (counts[r.id] ??= {})[f] = (counts[r.id][f] ?? 0) + n;
        (hits[f] ??= []).push(`[${r.id}] ${fr.slice(0, 120)}`);
      }
    }
    if (y >= 2 && d >= 2) { mixed += 1; mixedFiles.push(`${f} (요 ${y} · 니다 ${d})`); }
  }
  const BASE = "scripts/screen-copy-baseline.json";
  const total = (c: Record<string, number> = {}) => Object.values(c).reduce((a, b) => a + b, 0);

  if (mode === "list") {
    for (const [f, hs] of Object.entries(hits)) { console.log(`\n${f}`); for (const h of hs) console.log(`  ${h}`); }
    console.log(`\n높임 꼴이 섞인 파일 ${mixed}개`); for (const m of mixedFiles) console.log(`  ${m}`);
  }
  for (const r of RULES) console.log(`  ${r.id.padEnd(12)} ${String(total(counts[r.id])).padStart(4)}곳 — ${r.why}`);
  console.log(`  긴 문장(${LONG}자 넘음) ${long}개 · 높임 꼴이 섞인 파일 ${mixed}개 (세기만 한다)`);

  if (mode === "update") {
    writeFileSync(BASE, JSON.stringify(counts, null, 1) + "\n");
    console.log(`기록을 새로 적었다 — ${BASE}`);
    return;
  }
  let base: Record<string, Record<string, number>> = {};
  try { base = JSON.parse(readFileSync(BASE, "utf8")); } catch { /* 첫 실행 */ }
  const worse: string[] = [];
  for (const [id, byFile] of Object.entries(counts)) {
    for (const [f, n] of Object.entries(byFile)) {
      const was = base[id]?.[f] ?? 0;
      if (n > was) worse.push(`${f} · ${id} ${was} → ${n}`);
    }
  }
  if (worse.length) {
    console.log(`\n늘었다 ${worse.length}곳:`); for (const w of worse) console.log(`  ${w}`);
    console.log("고쳐서 줄이고, 줄인 뒤에만 `SCREEN_COPY=update npm run copy:screens`.");
    process.exit(1);
  }
  console.log("\n화면 문구 점검 OK — 기록보다 늘지 않았다.");
})();
