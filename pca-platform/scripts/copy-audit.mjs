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
  // 대구만 센다. "파는 것이 아니다" 같은 평범한 부정까지 세면, 고치는 쪽이
  // 뜻을 비틀게 된다. 버릇은 "A가 아니라 B" 로 짝을 맞출 때 생긴다.
  ["'A가 아니라 B' 대구", /(?:이|가|은|는|을|를)\s*아니라/g, 0.4,
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
     // 화면 모음 페이지. 밖으로 나가는 링크라 다른 원고와 같은 기준으로 센다
     "sites/screens/index.html",
     // 아임웹 위젯은 실제로 붙여 넣는 원고다. index.html 만 보다가
     // 위젯 쪽 문장을 놓치면 사이트에 남는 것은 위젯 쪽이다
     ...readdirSync("sites/careermetri/imweb")
       // 01b · 01c 처럼 사이에 끼워 넣은 절이 있다. 두 자리만 보던 규칙은
       // 그런 파일을 조용히 빼놓았고, 빠진 파일이 곧 아무도 안 보는 원고가 된다.
       .filter((f) => /^\d\d[a-z]?-.*\.html$/.test(f) && !f.includes("head-code"))
       .map((f) => `sites/careermetri/imweb/${f}`),
     // 약관도 사람이 읽는 글이다. 법 문장이라 딱딱해도 기계 티는 따로 난다
     // 결과지 원고. 학생이 실제로 읽는 문장이라 위젯 원고와 같은 기준으로 센다
     "sites/pca-platform/content/me.json",
     // 화면 자체의 문구. 상세·상품·단계 화면은 코드가 아니라 여기 적혀 있다
     "sites/pca-platform/index.html",
     // 결과지의 공통 원고는 코드 안에 문자열로 있다. JSON 만 보면 절반을 놓친다
     "sites/pca-platform/assets/report.js",
     "sites/pca-platform/assets/app.js",
     // 결과지 문장의 절반이 이제 여기 있다. 세 상품이 같이 읽는 파일이라
     // 여기 밴 버릇은 세 결과지에 한꺼번에 나간다
     "sites/pca-platform/assets/writing.js",
     // 경험 입력 화면의 문구. 응시자가 실제로 읽는 글이다
     "sites/pca-platform/assets/evidence-ui.js",
     // ME_V2 화면과 결과지. **문항 은행(`data/me-v2.js`)은 넣지 않는다**:
     // 규격이 준 문장 그대로라 문체 규칙으로 다듬으면 문항이 바뀐다
     "sites/pca-platform/v2.html",
     "sites/pca-platform/assets/v2-app.js",
     "sites/pca-platform/assets/v2-report.js",
     "sites/pca-platform/assets/v2-value-report.js",
     "sites/pca-platform/assets/v2-coverage-report.js",
     // 응시자가 적은 글을 거르는 자리. 여기 문구가 결과지에 그대로 나간다
     "sites/pca-platform/assets/report-sanitize.js",
     // 플랫폼 화면 전부. 관리자·담당자만 넣었다가 **학생이 보는 화면이
     // 밖에 남아 있는 것**을 알았다. 결과지 문구는 화면 파일이 아니라
     // 사전(`locale.ts`)에 있어서, 화면만 훑는 규칙으로는 영원히 안 걸린다
     ...readdirSync("src/app", { recursive: true })
       .filter((f) => String(f).endsWith(".tsx"))
       .map((f) => `src/app/${f}`),
     ...readdirSync("src/components")
       .filter((f) => f.endsWith(".tsx"))
       .map((f) => `src/components/${f}`),
     // 설계 문서. 다음 사람이 이 저장소에서 가장 오래 읽는 글이다
     "CLAUDE.md", "LAUNCH.md", "docs/HANDOFF.md",
     ...readdirSync("docs/metri")
       .filter((f) => f.endsWith(".md"))
       .map((f) => `docs/metri/${f}`),
     // 주석. 경로 뒤에 #주석 을 붙이면 주석만 뽑아 센다.
     // `copy-audit.mjs` 자신은 뺀다. 금지한 패턴을 예시로 적어 두는 파일이라,
     // 자기를 세면 규칙을 고칠 때마다 자기가 걸린다
     ...[
       "db/schema.sql", "db/schema_metri.sql",
       "sites/pca-platform/assets/app.js",
       "sites/pca-platform/assets/engine.js",
       "sites/pca-platform/assets/writing.js",
       "sites/pca-platform/assets/result-json.js",
       "sites/pca-platform/assets/report.js",
       "sites/pca-platform/assets/evidence.js",
       "sites/pca-platform/assets/readiness.js",
       "sites/pca-platform/assets/evidence-ui.js",
       "sites/pca-platform/assets/stage.js",
       "sites/pca-platform/assets/country.js",
       "sites/pca-platform/assets/research.js",
       "sites/pca-platform/assets/v2-scoring.js",
       "sites/pca-platform/assets/v2-decision.js",
       "sites/pca-platform/assets/v2-result-json.js",
       "sites/pca-platform/assets/v2-report.js",
       "sites/pca-platform/assets/v2-app.js",
       "sites/pca-platform/assets/value-engine.js",
       "sites/pca-platform/assets/v2-value-report.js",
       "sites/pca-platform/assets/v2-coverage-report.js",
       "sites/pca-platform/assets/coverage-engine.js",
       "sites/pca-platform/assets/report-sanitize.js",
       ...readdirSync("src/lib", { recursive: true })
         .filter((f) => String(f).endsWith(".ts"))
         .map((f) => `src/lib/${f}`),
       ...readdirSync("scripts/metri")
         .filter((f) => f.endsWith(".ts") || f.endsWith(".mjs"))
         .map((f) => `scripts/metri/${f}`),
     ].map((f) => `${f}#주석`),
     // 학생이 읽는 결과지·화면 문구가 전부 이 사전에 있다. 한글 4,200자다
     "src/lib/locale.ts",
     "src/lib/prescribe.ts",
     "src/lib/chain.ts",
     "src/lib/evidence.ts",
     "src/lib/refund.ts",
     "src/lib/redeem.ts",
     "src/lib/survey.ts",
     ...readdirSync("sites/careermetri/legal")
       .filter((f) => f.endsWith(".md"))
       .map((f) => `sites/careermetri/legal/${f}`),
     // 영문 위젯. 한글 규칙은 안 걸리지만 대시는 영문에서도 센다
     ...readdirSync("sites/careermetri/imweb-en")
       // 01b · 01c 처럼 사이에 끼워 넣은 절이 있다. 두 자리만 보던 규칙은
       // 그런 파일을 조용히 빼놓았고, 빠진 파일이 곧 아무도 안 보는 원고가 된다.
       .filter((f) => /^\d\d[a-z]?-.*\.html$/.test(f) && !f.includes("head-code"))
       .map((f) => `sites/careermetri/imweb-en/${f}`)];

/**
 * 빈칸 표시는 원고가 아니다.
 *
 * 결과지와 관리자 표에서 값이 없는 칸은 `—` 로 둔다(CLAUDE.md: 증거가
 * 없으면 추정해 채우지 않는다). 그 한 글자가 문자열 전체인 경우는 문장
 * 부호가 아니라 데이터 자리라서 문체 규칙으로 셀 것이 아니다. 문장 안에
 * 끼어든 대시는 그대로 센다.
 */
/** 표에서 값이 없는 칸(`| — |`)은 부호가 아니라 빈자리 표시다. */
function dropTableBlanks(t) {
  return t.replace(/\|\s*—\s*(?=\|)/g, "| ");
}

function dropBlanks(lits) {
  return lits.filter((s) => !/^(?::\s*)?["'][\s—]+["'],?$/.test(s));
}

/**
 * 주석도 사람이 읽는 글이다.
 *
 * 처음에는 "주석은 원고가 아니다" 로 빼 뒀다. 그런데 다음 사람이 이 저장소에서
 * 가장 오래 읽는 글이 설계 문서와 주석이고, 거기 밴 버릇이 화면 문구로 다시
 * 흘러나온다. 그래서 `#주석` 을 붙인 경로는 주석만 뽑아 같은 자로 잰다.
 */
function commentsOf(path) {
  const raw = readFileSync(path, "utf8");
  const out = [];
  for (const m of raw.matchAll(/\/\*[\s\S]*?\*\//g)) out.push(m[0]);
  for (const m of raw.matchAll(/^[ \t]*(?:\/\/|--).*$/gm)) out.push(m[0]);
  return out.join("\n");
}

/** 사람이 읽는 글만 본다. 코드와 태그는 문체와 상관이 없다. */
function prose(path) {
  if (path.endsWith("#주석")) return commentsOf(path.slice(0, -3));
  const raw = readFileSync(path, "utf8");
  if (path.endsWith(".js") || path.endsWith(".mjs")) {
    // 작은따옴표 문자열만. 주석에 쓴 설계 메모는 원고가 아니다
    const noComment = raw.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
    return dropBlanks(noComment.match(/'(?:[^'\\]|\\.)*'/g) ?? []).join(" ");
  }
  if (path.endsWith(".json")) {
    // 값(문자열)만 본다. 키는 원고가 아니다
    return dropBlanks(raw.match(/:\s*"(?:[^"\\]|\\.)*"/g) ?? []).join(" ") +
      dropBlanks(raw.match(/^\s*"(?:[^"\\]|\\.)*",?$/gm) ?? []).join(" ");
  }
  if (path.endsWith(".md")) {
    // 코드 블록과 인라인 코드는 원고가 아니다. 특히 `a < b` 같은 조각을 두면
    // 뒤쪽 태그 제거가 한 문단을 통째로 삼켜서 글자 수가 반으로 줄어든다.
    return dropTableBlanks(raw)
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`[^`\n]*`/g, " ");
  }
  if (path.endsWith(".ts") || path.endsWith(".tsx")) {
    // 화면 문구의 대부분은 문자열이 아니라 **JSX 본문**이다. 큰따옴표만
    // 세던 규칙은 그래서 결과지 화면의 한글 2,000자 중 200자도 못 봤고,
    // 감사에 넣어 둔 채로 통과 표시만 찍혔다. 가장 나쁜 종류의 통과다.
    //
    // 그래서 주석·import·코드용 속성값을 걷어낸 뒤 **한글이 든 조각만**
    // 남긴다. 코드 토큰은 전부 ASCII 라 이 한 줄이 코드와 원고를 가른다.
    // placeholder·title·alt·aria-label 은 사람이 읽는 말이라 남겨 둔다.
    const t = raw
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
      .replace(/(^|[^:/])\/\/.*$/gm, "$1")
      .replace(/^\s*import[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, " ")
      .replace(
        /\b(?:className|style|href|src|id|key|type|name|value|htmlFor|rel|target|method|action|scope|colSpan|rowSpan|width|height|viewBox|fill|stroke|d|x|y|cx|cy|r)=(?:"[^"]*"|\{[^{}]*\})/g,
        " ",
      );
    // 대시는 한글 조각 밖에도 선다: `<b>{t("repQuality")}</b> — {t(flag)}`
    // 처럼 코드 사이에 홀로 놓인 것이 화면에서는 문장 가운데에 찍힌다.
    // 그래서 값이 없는 칸의 `—` 만 걷어낸 뒤 **남은 대시를 전부** 센다.
    const body = t.replace(/(["'])\s*—\s*\1|>\s*—\s*</g, " ");
    const segs = dropBlanks(body.match(/[^\n<>]*[가-힣][^\n<>]*/g) ?? []);
    const inSeg = (segs.join("").match(/—/g) ?? []).length;
    const all = (body.match(/—/g) ?? []).length;
    return segs.join("\n") + "\n" + "—".repeat(Math.max(0, all - inSeg));
  }
  return raw
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ");
}

/**
 * 토막 문단. 짧은 단정문 두 개를 연달아 놓는 버릇이다.
 *
 * "빈 막대로 두면 0으로 읽힙니다." 처럼 주어를 떼고 짧게 끊은 문장을 이어
 * 붙이면 사람이 말하는 리듬이 아니라 메모가 된다. 지적이 네 번째로 들어왔을 때
 * 세기 시작했다. 한 덩어리 안의 문장이 전부 열일곱 자 미만이면 토막으로 본다.
 *
 * **상황 설명은 원래 짧다.** 결과지의 장면 제시("설비가 멈췄습니다. 알람은
 * 모호하고 생산은 대기 중입니다.")는 사람도 그렇게 쓴다. 그래서 0을 요구하지
 * 않고 비율로 본다.
 */
function chunks(path) {
  if (path.endsWith("#주석")) return commentsOf(path.slice(0, -3)).split(/\n\s*\n/);
  const raw = readFileSync(path, "utf8");
  if (path.endsWith(".json")) {
    return (raw.match(/"(?:[^"\\]|\\.)*"/g) ?? []).map((t) => t.slice(1, -1));
  }
  if (path.endsWith(".js") || path.endsWith(".mjs")) {
    const t = raw.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
    return (t.match(/'(?:[^'\\]|\\.)*'/g) ?? []).map((x) => x.slice(1, -1));
  }
  if (path.endsWith(".ts") || path.endsWith(".tsx")) {
    const t = raw.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:/])\/\/.*$/gm, "$1");
    return (t.match(/"(?:[^"\\]|\\.)*"/g) ?? []).map((x) => x.slice(1, -1));
  }
  if (path.endsWith(".md")) return dropTableBlanks(raw).split(/\n\s*\n/);
  return raw
    .replace(/<(style|script)[\s\S]*?<\/\1>|<!--[\s\S]*?-->/g, " ")
    .split(/<[^>]+>/);
}

function koLen(s) { return (s.match(/[가-힣]/g) ?? []).length; }

function choppy(path) {
  let units = 0, bad = 0, first = "";
  for (const c of chunks(path)) {
    const t = c.replace(/\s+/g, " ").trim();
    if (koLen(t) < 25) continue;
    const ss = t.split(/(?<=[.!?])\s+/).filter((x) => koLen(x) > 1);
    if (ss.length < 2) continue;
    units++;
    if (ss.every((x) => koLen(x) < 17)) { bad++; if (!first) first = t.slice(0, 60); }
  }
  return { units, bad, first };
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
  const ch = choppy(path);
  const chCap = Math.max(2, Math.round(ch.units * 0.08));
  if (ch.bad > chCap) {
    rows.push(["토막 문단", ch.bad, chCap,
      `문장을 잇거나 주어를 살린다. 예: ${ch.first}`]);
    failed++;
  }
  const head = `${path}  (한글 ${ko}자)`;
  if (!rows.length) { console.log(`  OK  ${head}`); continue; }
  console.log(`\n  넘침 ${head}`);
  for (const [name, n, cap, fix] of rows) {
    console.log(`      ${name}: ${n}회 (한도 ${cap})\n        ${fix}`);
  }
}

// 영어 원고는 규칙이 다르다. 대시만 따로 본다
for (const path of files.filter((f) => {
  const t = prose(f);
  const ko = (t.match(/[가-힣]/g) ?? []).length;
  // 한글이 적은 파일. 영문 원고이거나, 문구가 사전에 있고 화면 파일에는
  // 조각만 남은 경우다. 길이로 거르던 규칙은 **결과지 화면을 통째로
  // 빠뜨렸다**: 한글 아홉 자뿐이라 양쪽 검사에 다 들지 않았다.
  return ko < 200 && t.replace(/\s/g, "").length > 0;
})) {
  const n = (prose(path).match(/—/g) ?? []).length;
  console.log(n ? `\n  넘침 ${path}: em dash ${n}회 (한도 0)` : `  OK  ${path} (영문) em dash 0`);
  if (n) failed++;
}

// 두 사이트의 Head Code 는 머리말만 다르고 몸통이 같아야 한다.
// 두 벌을 따로 고치면 반드시 한쪽만 고쳐지는 날이 오고, 그날 두 사이트의
// 디자인이 갈린다. 눈으로 지킬 수 없는 약속이라 여기서 센다.
{
  const MARK = "<!-- Two font links.";
  const heads = [
    "sites/careermetri/imweb-en/00-head-code.html",
    "sites/careermetri/imweb/00-head-code.html",
    "sites/careermetri/imweb/00b-head-code-as-widget.html",
  ];
  const bodies = heads.map((h) => {
    const t = readFileSync(h, "utf8");
    const i = t.indexOf(MARK);
    return i < 0 ? null : t.slice(i);
  });
  const missing = heads.filter((_, i) => bodies[i] === null);
  const drifted = heads.filter((_, i) => bodies[i] !== null && bodies[i] !== bodies[0]);
  if (missing.length) {
    console.log(`\n  넘침 Head Code 에서 "${MARK}" 를 못 찾음: ${missing.join(", ")}`);
    failed++;
  } else if (drifted.length) {
    console.log(`\n  넘침 Head Code 몸통이 갈라졌다: ${drifted.join(", ")}`);
    console.log(`        고칠 곳은 ${heads[0]} 하나이고, 나머지는 거기서 복사한다`);
    failed++;
  } else {
    console.log(`  OK  Head Code ${heads.length}벌 몸통 동일`);
  }
}

console.log(failed ? `\n${failed}개 항목이 한도를 넘었다.` : "\n원고 OK.");
process.exit(failed ? 1 : 0);
