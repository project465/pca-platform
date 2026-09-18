/**
 * 원고에서 기계로 쓴 냄새를 센다.
 *
 * **왜 스크립트인가.** "AI 티" 를 눈으로만 잡으면 고칠 때마다 다시 들어온다.
 * 실제로 세 번 들어왔다. 세는 규칙이 있으면 취향 다툼이 아니라 숫자가 된다.
 *
 * 패턴은 한국어 AI 문체 판별 연구(im-not-ai, 실측 코퍼스 기반)에서 가져왔고
 * 이 원고에 실제로 나타난 것만 남겼다. 한도는 그 문서의 "몇 회 이상이면
 * 신호" 기준을 이 원고 길이에 맞춰 잡았다.
 *
 *   node scripts/copy-audit.mjs            모든 원고
 *   node scripts/copy-audit.mjs <파일...>   고른 파일만
 */
import { readFileSync, readdirSync } from "node:fs";

// [이름, 정규식, 한글 1000자당 허용치, 설명]
const RULES = [
  ["대시(—) 부가설명", /—/g, 0.3,
   "한국어에서 이만큼 쓰는 사람은 드물다. 쉼표·괄호·문장 분리로 푼다"],
  ["'A가 아니라 B' 대구", /(?:이|가|은|는|을|를)\s*아니라|것이\s*아니|것은\s*아닙/g, 0.4,
   "한 원고에 한두 번이면 수사, 그 위로는 버릇이다"],
  ["'~하는 이유다' 도치", /이유(?:다|입니다)[.\s]/g, 0.2,
   "문단을 잠언으로 닫는 습관. 순방향 단언으로 편다"],
  ["분열문 '핵심은/문제는'", /(?:핵심|관건|중요한 것|필요한 것)(?:은|는)\s/g, 0.3,
   "주어와 서술을 직결한다"],
  ["hype 어휘", /혁신적|획기적|압도적|파격적|폭발적|전례 없/g, 0.1,
   "구체 수치로 바꾼다"],
  ["의의 과장", /시사하는 바|주목할 만|매우 중요/g, 0.1, "삭제하거나 구체 결론으로"],
  ["'결국'", /결국/g, 0.2, "논리 결산어. 원고당 한 번이면 충분하다"],
  ["이중 피동", /되어진|지게 된/g, 0.05, "능동이나 단일 피동으로"],
  ["'가지고 있다'", /가지고 있/g, 0.1, "형용사·동사로 환원한다"],
];

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["marketing/src/content/kr.ts", "marketing/src/content/global.ts",
     "sites/metri-plus/index.html", "sites/metri-plus-print/index.html",
     "sites/imweb/copy.md", "sites/careermetri/index.html",
     "sites/careermetri/imweb/README.md",
     // 아임웹 위젯은 실제로 붙여 넣는 원고다. index.html 만 보다가
     // 위젯 쪽 문장을 놓치면 사이트에 남는 것은 위젯 쪽이다
     ...readdirSync("sites/careermetri/imweb")
       .filter((f) => /^\d\d-.*\.html$/.test(f))
       .map((f) => `sites/careermetri/imweb/${f}`),
     // 약관도 사람이 읽는 글이다. 법 문장이라 딱딱해도 기계 티는 따로 난다
     ...readdirSync("sites/careermetri/legal")
       .filter((f) => f.endsWith(".md"))
       .map((f) => `sites/careermetri/legal/${f}`)];

/** 사람이 읽는 글만 본다. 코드·주석·태그는 문체와 상관이 없다. */
function prose(path) {
  const raw = readFileSync(path, "utf8");
  if (path.endsWith(".ts")) {
    // 큰따옴표 문자열만. 주석에 쓴 설계 메모는 원고가 아니다
    const noComment = raw.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
    return (noComment.match(/"(?:[^"\\]|\\.)*"/g) ?? []).join(" ");
  }
  return raw
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ");
}

let failed = 0;
for (const path of files) {
  const text = prose(path);
  const ko = (text.match(/[가-힣]/g) ?? []).length;
  if (ko < 200) continue;                       // 영어 원고는 대시만 본다
  const rows = [];
  for (const [name, re, per1000, fix] of RULES) {
    const n = (text.match(re) ?? []).length;
    const cap = Math.max(1, Math.round((per1000 * ko) / 1000));
    if (n > cap) { rows.push([name, n, cap, fix]); failed++; }
  }
  const head = `${path}  (한글 ${ko}자)`;
  if (!rows.length) { console.log(`  OK  ${head}`); continue; }
  console.log(`\n  넘침 ${head}`);
  for (const [name, n, cap, fix] of rows) {
    console.log(`      ${name}: ${n}회 (한도 ${cap})\n        ${fix}`);
  }
}

// 영어 원고는 규칙이 다르다. 대시만 따로 본다
for (const path of files.filter((f) => f.includes("global"))) {
  const n = (prose(path).match(/—/g) ?? []).length;
  console.log(n ? `\n  넘침 ${path}: em dash ${n}회 (한도 0)` : `  OK  ${path} (영문) em dash 0`);
  if (n) failed++;
}

console.log(failed ? `\n${failed}개 항목이 한도를 넘었다.` : "\n원고 OK.");
process.exit(failed ? 1 : 0);
