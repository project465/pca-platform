/**
 * 지역화 덮임 검사.
 *
 * **셈은 `src/lib/localization.ts` 한 곳이다.** 운영 화면
 * (`/admin/localization`)이 같은 함수를 부른다. 두 곳에서 따로 세면
 * 숫자가 갈리고, 갈리는 순간 둘 다 못 믿는다.
 *
 *   npx tsx scripts/i18n-coverage.ts
 *   npx tsx scripts/i18n-coverage.ts --dump   빠진 것을 파일로
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { localizationReport } from "../src/lib/localization";

const r = localizationReport();
const rows: string[] = [];
const bad: string[] = [];

for (const x of [...r.screen, ...r.matchers]) {
  rows.push(`${x.file.padEnd(44)} ${x.covered}/${x.total}  ${x.where}`);
  if (x.missing.length) {
    bad.push(`${x.where} 두 언어로 없는 것 ${x.missing.length}가지 (${x.file})`);
  }
}
rows.push(`${"assessment/ME_V2/family-names.json".padEnd(44)} ` +
  `짝 ${r.families.covered}/${r.families.total}`);
if (r.families.missing.length) {
  bad.push(`영어 이름이 빠진 직무군 ${r.families.missing.length}: ` +
    r.families.missing.slice(0, 3).join(" · "));
}
console.log(rows.join("\n"));
console.log(`\n사전 ${r.dictEntries}가지 · ` +
  `맞추기 어휘 ${r.glossaryTerms}가지(영어 낱말 ${r.glossaryWords}개)`);

if (process.argv.includes("--dump")) {
  mkdirSync("docs/metri/generated", { recursive: true });
  writeFileSync("docs/metri/generated/i18n-uncovered.json",
    JSON.stringify([...new Set(r.screen.flatMap((x) => x.missing))].sort(), null, 1) + "\n");
  writeFileSync("docs/metri/generated/i18n-nomatch.json",
    JSON.stringify([...new Set(r.matchers.flatMap((x) => x.missing))].sort(), null, 1) + "\n");
  console.log("빠진 것을 docs/metri/generated/ 에 적었다");
}

if (bad.length) {
  console.error(`\n${bad.length}개가 걸렸다.`);
  for (const b of bad) console.error("  " + b);
  process.exit(1);
}
console.log("\n사람이 읽는 칸과 경험에서 찾는 말이 전부 두 언어로 있다.");
