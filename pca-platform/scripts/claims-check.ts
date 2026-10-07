/**
 * 공개 원고가 **제품이 계산하지 않는 값**을 적고 있지 않은가.
 *
 * 2026-10-07 에 홈페이지에서 지운 것들이다. 직무군 24개와 역량 138개를
 * 채용공고 428건에 대조한다고 적어 두었는데, 공고 표(`jd_postings`)와 기업
 * 표(`companies`)에 **줄이 하나도 없다.** 적합도 100점과 지역 기업
 * 1만여 곳도 같은 자리였다.
 *
 * **전수로 한 번 지우는 것으로는 돌아온다.** 지켜 주는 장치가 없으면 다음
 * 사람이 옛 제안서에서 같은 문장을 다시 가져온다. 그래서 세는 자리를
 * 만들었다.
 *
 * **주석은 세지 않는다.** 이 저장소는 왜 지웠는지를 주석으로 남기는 쪽을
 * 택했고, 그 기록에는 지운 숫자가 그대로 들어 있다. 세면 맞는 기록을
 * 지우라고 요구하게 된다(`copy:audit` 과 같은 규칙이다).
 *
 * **숫자는 수로 센다.** `1,240` 을 날것으로 찾으면 방사형 그래프의 좌표
 * `348.1,240.0` 이 걸린다. 앞뒤에 숫자나 점이 붙은 자리는 수의 일부이지
 * 주장이 아니므로 `num()` 이 그것을 끊는다.
 *
 * **부정문은 지나간다.** 금지한 것은 결론이고, 그 결론을 막는 문장은
 * 오히려 적어 두어야 하는 글이다. "합격 가능성을 내지 않습니다" 를 세면
 * 지켜 주려던 문장을 지우라고 요구하게 된다(`writing:check` 과 같은
 * 규칙이다).
 *
 *   npm run claims:check
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";

/** 앞뒤에 숫자나 점이 붙지 않은 자리에서만 센다 */
function num(body: string): RegExp {
  return new RegExp(`(?<![\\d.,])(?:${body})(?![\\d.,])`, "g");
}

type Rule = {
  re: RegExp;
  why: string;
  /** 부정문 안에 있으면 지나간다 */
  negatable?: boolean;
};

const BANNED: Rule[] = [
  { re: /채용\s*공고\s*\d/g, why: "공고를 몇 건 분석했다는 주장. `jd_postings` 가 0줄이다" },
  { re: /공고\s*\d[\d,]*\s*건/g, why: "같다" },
  { re: /\d[\d,]*\s*건\s*중\s*\d[\d,]*\s*건/g, why: "공고 요구 빈도. 그 자료가 없다" },
  { re: /\d[\d,]*\s*job\s*(postings|advertisements)/gi, why: "같다" },
  { re: /postings?\s+analysed/gi, why: "같다" },
  { re: /역량\s*138/g, why: "실제 자료는 148이고, 그 수를 제품이 쓰지도 않는다" },
  { re: /138\s*competencies/gi, why: "같다" },
  { re: /직무[–-]역량\s*요구관계/g, why: "확인할 수 없는 관계 수" },
  { re: num("2,346|2\\.346"), why: "개발 표본 수. 받은 제안서의 값이고 확인할 수 없다" },
  { re: num("2,091|2\\.091"), why: "같다" },
  { re: num("428"), why: "같다" },
  { re: /직무기술서\s*137|137\s*job\s*descriptions/gi, why: "같다" },
  { re: /NCS\s*62|62\s*NCS/gi, why: "같다" },
  { re: num("1,240|1\\.240|1\\s240"), why: "지역 공고 수. 그 자료가 없다" },
  { re: num("9,155|2,742|13,920|1,335"), why: "기업·기관 수. `companies` 가 0줄이다" },
  { re: /184\s*곳/g, why: "지역 기관·기업 검토 수. 같다" },
  { re: /적합도가?\s*높은\s*순/g, why: "기업을 적합도로 정렬해 준다는 주장. 그 기능이 없다" },
  { re: /지역\s*기업\s*매칭|기업\s*매칭률/g, why: "같다" },
  { re: /AI\s*기반/g, why: "쓰지 않기로 한 말이고, 그 기능도 없다" },
  { re: /상위\s*\d+\s*%|top\s+\d+\s*%/gi, why: "규준이 없어 백분위를 쓸 수 없다", negatable: true },
  { re: /합격\s*가능성|취업\s*확률/g, why: "재지 않는 값이다", negatable: true },
];

/** 주석과 데이터 URI 를 걷어 낸다 */
function strip(t: string): string {
  return t
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ")
    .replace(/^\s*\*.*$/gm, " ")
    .replace(/data:[a-z/+;]+;base64,[A-Za-z0-9+/=]+/g, " ");
}

const NEGATION = /않|없|아닙|아니|못|말고|대신|not |never |non-|without /;

/**
 * 걸린 자리의 주변을 떠낸다.
 *
 * 문장 하나로 끊지 않는 까닭은 부정이 다음 문장에 오는 일이 흔해서다
 * ("합격 가능성을 알고 싶은 분. 이 검사가 재는 값이 아닙니다"). 줄 하나를
 * 보되 긴 줄에서는 앞뒤 300자로 끊는다: 방사형 그래프처럼 한 줄이 수천
 * 자인 파일에서 줄 전체를 보면 멀리 떨어진 부정이 걸린 자리를 지나가게
 * 한다.
 */
function around(body: string, at: number): string {
  const nl = body.lastIndexOf("\n", at);
  const from = Math.max(nl + 1, at - 300);
  const nx = body.indexOf("\n", at);
  const to = Math.min(nx < 0 ? body.length : nx, at + 300);
  return body.slice(from, to);
}

function hitsIn(body: string, rule: Rule): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(rule.re)) {
    if (rule.negatable && NEGATION.test(around(body, m.index ?? 0))) continue;
    out.push(`${m[0].trim()} → ${rule.why}`);
    break;
  }
  return out;
}

/** 폴더 하나를 훑는다 */
function walk(dir: string, keep: RegExp, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    const at = `${dir}/${f}`;
    if (statSync(at).isDirectory()) walk(at, keep, out);
    else if (keep.test(f)) out.push(at);
  }
}

/**
 * 손님이 읽는 글이 있는 자리.
 *
 * **쪽도 센다.** 처음에는 원고 파일(`content/*.ts`)만 봤는데, 대전 소재
 * 기관·기업 184곳을 적합도로 나눈다는 주장이 `app/anchor/page.tsx` 에
 * 직접 적혀 있어서 그대로 지나갔다. 원고를 밖에 두는 규칙을 코드가 늘
 * 지키는 것은 아니다.
 */
function files(): string[] {
  const out: string[] = [
    "sites/careermetri/index.html", "sites/imweb/copy.md",
    "src/lib/product-copy.ts", "src/lib/start-copy.ts", "src/lib/tiers.ts",
  ];
  walk("marketing/src/content", /\.ts$/, out);
  walk("marketing/src/app", /\.tsx?$/, out);
  walk("marketing/src/components", /\.tsx?$/, out);
  for (const dir of ["sites/careermetri/imweb", "sites/careermetri/imweb-en"]) {
    walk(dir, /\.(html|md)$/, out);
  }
  return out.filter((f) => existsSync(f));
}

function main() {
  let bad = 0;
  let seen = 0;
  for (const f of files()) {
    const body = strip(readFileSync(f, "utf8"));
    const hits: string[] = [];
    for (const rule of BANNED) hits.push(...hitsIn(body, rule));
    seen += 1;
    if (hits.length) {
      bad += hits.length;
      console.log(`  걸림 ${f}`);
      for (const h of hits) console.log(`        ${h}`);
    }
  }
  console.log(`\n공개 원고 ${seen}벌 — 금지 주장 ${bad}곳`);
  if (bad) {
    console.log(
      "\n제품이 계산하지 않는 값입니다. 숫자를 새로 만들지 말고 그 줄을 지우십시오.",
    );
  }
  process.exit(bad ? 1 : 0);
}

main();
