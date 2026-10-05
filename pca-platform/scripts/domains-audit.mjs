/**
 * 도메인 철자 감사.
 *
 * 받은 규격은 `careermatri`, 이 저장소가 오래 쓴 것은 `careermetri` 다.
 * **한 글자 차이**라 눈으로 읽으면 둘이 같아 보이고, 사고 나면 되돌리기
 * 어렵다: 소개 사이트의 '시작하기' 가 한 글자 다른 주소를 가리키면 학생이
 * 남의 집으로 간다.
 *
 * 그래서 이 스크립트가 보는 것은 **어느 철자가 맞는가**가 아니다. 그건
 * 도메인을 사는 사람이 정한다. 여기서 보는 것은 셋이다.
 *
 *   1. 저장소 안에 **두 철자가 같이 사는가**. 같이 살면 그 자체로 탈이다
 *   2. 플랫폼이 쓰는 철자와 소개 사이트가 쓰는 철자가 **같은가**
 *   3. 도메인이 **한 곳에만 적혀 있는가**(`site_configs`). 적어 두는 자리가
 *      늘면 고칠 때 한 곳이 반드시 남는다
 *
 *   node scripts/domains-audit.mjs          대조
 *   node scripts/domains-audit.mjs --list   어느 줄에 적혀 있는지
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

/* 생성물과 캡처는 세지 않는다. 고치는 곳이 아니다 */
const SKIP_DIR = new Set([
  "node_modules", ".git", ".next", "dist", "build", "shots", "generated",
  "var", "coverage",
]);
const SKIP_EXT = new Set([".png", ".jpg", ".jpeg", ".pdf", ".ico", ".woff", ".woff2"]);
/* 생성되는 번들은 원본에서 다시 만들어진다 */
const SKIP_FILE = new Set([
  "sites/pca-platform/data/report-i18n.js",
  "sites/pca-platform/data/match-glossary.js",
  "sites/pca-platform/data/value-data.js",
  "sites/pca-platform/data/me-v2.js",
]);

const SPELLINGS = ["careermatri", "careermetri"];
/* **도메인으로 쓰인 자리만 센다.** `sites/careermetri/imweb` 같은 디렉터리
   이름과, 옛 이름을 적어 둔 내력 기록은 고칠 곳이 아니다. 거기까지 세면
   감사가 늘 빨간불이어서 아무도 보지 않게 된다 */
const AS_DOMAIN = (sp) =>
  new RegExp(sp + "(?:plus)?\\.(?:com|co\\.kr|kr|io|net|app)");
/* 규격이 적은 철자. **바꾸려면 받은 규격부터 바꿔야 한다** */
const SPEC = "careermatri";

/**
 * 도메인을 적어 두어도 되는 자리.
 *
 * **목록으로 둔 것이 일부러다.** 한 곳을 늘리려면 이 줄을 늘려야 하므로
 * 늘리는 것이 눈에 띈다. 정적 페이지는 모듈이 없어서 주소를 글자로 적을
 * 수밖에 없는데, 그래도 어디에 몇 곳 적혀 있는지는 세어 둔다.
 */
const ALLOWED = new Set([
  /* 플랫폼 쪽 도메인이 사는 한 곳 */
  "db/schema_platform.sql",
  /* 소개 사이트 쪽 도메인이 사는 한 곳 */
  "marketing/src/lib/domains.ts",
  /* 주소를 재 보는 검사와 이 감사 자신 */
  "scripts/domains-check.mjs", "scripts/domains-audit.mjs",
  "scripts/platform-check.mjs", "scripts/commercial-check.ts",
  /* 손으로 고치는 정적 페이지. 모듈이 없어서 글자로 적는다 */
  "sites/careermetri/imweb-en/16-markets.html",
  "sites/metri-plus/index.html",
  "sites/status/index.html",
]);

function walk(dir, out) {
  for (const e of readdirSync(dir)) {
    if (SKIP_DIR.has(e)) continue;
    const p = join(dir, e);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) { walk(p, out); continue; }
    if (SKIP_EXT.has(extname(p))) continue;
    if (st.size > 2_000_000) continue;
    const rel = p.replace(/^\.\//, "");
    if (SKIP_FILE.has(rel)) continue;
    out.push(rel);
  }
  return out;
}

/* **설계 문서는 두 철자를 같이 적어도 된다.** 철자가 왜 갈렸고 무엇을
   정해야 하는지를 적어 둔 기록이라, 거기서 옛 철자를 지우면 기록이
   거짓이 된다. 고쳐야 하는 자리는 코드와 원고다 */
const isRecord = (f) => f.startsWith("docs/");

const hits = { careermatri: [], careermetri: [] };
for (const f of walk(".", [])) {
  if (isRecord(f)) continue;
  let text;
  try { text = readFileSync(f, "utf8"); } catch { continue; }
  if (!text.includes("careerm")) continue;
  text.split("\n").forEach((line, i) => {
    for (const sp of SPELLINGS) {
      if (AS_DOMAIN(sp).test(line)) {
        hits[sp].push({ f, n: i + 1, line: line.trim().slice(0, 100) });
      }
    }
  });
}

const bad = [];
const n = (sp) => hits[sp].length;
const files = (sp) => [...new Set(hits[sp].map((x) => x.f))];

console.log("── 철자별 ───────────────────────────────────────");
for (const sp of SPELLINGS) {
  console.log(`  ${sp.padEnd(14)} ${String(n(sp)).padStart(4)}줄 · ` +
    `${files(sp).length}개 파일${sp === SPEC ? "  ← 규격이 적은 철자" : ""}`);
}

/* 1. 두 철자가 같이 사는가 */
if (n("careermatri") && n("careermetri")) {
  bad.push(`두 철자가 같이 산다. 규격은 ${SPEC} 이고, ` +
    `다른 철자가 ${n(SPELLINGS.find((x) => x !== SPEC))}줄 남아 있다`);
}

/* 2. 플랫폼과 소개 사이트가 같은 철자인가 */
const where = (sp, pre) => files(sp).filter((f) => f.startsWith(pre));
const platform = SPELLINGS.filter((sp) =>
  where(sp, "db/").length || where(sp, "src/").length);
const marketing = SPELLINGS.filter((sp) =>
  where(sp, "marketing/").length || where(sp, "sites/").length);
console.log("\n── 어디가 어느 철자를 쓰는가 ───────────────────");
console.log(`  플랫폼(db · src)      ${platform.join(" + ") || "없음"}`);
console.log(`  소개 사이트(marketing · sites)  ${marketing.join(" + ") || "없음"}`);
if (platform.length && marketing.length &&
    JSON.stringify(platform) !== JSON.stringify(marketing)) {
  bad.push(`플랫폼은 ${platform.join("+")} · 소개 사이트는 ${marketing.join("+")} 를 쓴다. ` +
    `소개 사이트의 '시작하기' 가 플랫폼이 아닌 주소를 가리킨다`);
}

/* 3. 도메인이 한 곳에만 적혀 있는가 */
const DOM = /careerm[ae]tri\.(com|co\.kr|kr|io|net|app)/;
const hard = [...hits.careermatri, ...hits.careermetri]
  .filter((x) => DOM.test(x.line))
  /* 적어도 되는 자리: 도메인이 사는 한 곳과, 그 자리를 설명하는 문서,
     그리고 주소를 재 보는 검사 */
  .filter((x) => !ALLOWED.has(x.f) && !x.f.endsWith(".md"));
console.log(`\n── 도메인을 코드에 박아 둔 자리 ${hard.length}곳 ───────────`);
for (const h of hard.slice(0, 20)) console.log(`  ${h.f}:${h.n}  ${h.line}`);
if (hard.length) {
  bad.push(`도메인이 코드에 ${hard.length}곳 박혀 있다. ` +
    `적어 두는 자리가 늘면 고칠 때 한 곳이 반드시 남는다`);
}

if (process.argv.includes("--list")) {
  console.log("\n── 전부 ─────────────────────────────────────────");
  for (const sp of SPELLINGS) {
    for (const h of hits[sp]) console.log(`  [${sp}] ${h.f}:${h.n}  ${h.line}`);
  }
}

if (bad.length) {
  console.log(`\n${bad.length}개가 걸렸다.`);
  for (const b of bad) console.log("  " + b);
  process.exitCode = 1;
} else {
  console.log("\n도메인 철자 감사 OK.");
}
