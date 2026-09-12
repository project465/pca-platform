/**
 * 명단 파서 점검. 라이브러리 없이 xlsx 를 읽으므로(src/lib/sheet.ts),
 * 그 판단이 옳았는지 확인할 수단이 레포에 있어야 한다.
 *
 *   npm run check:sheet
 *
 * 샘플 엑셀 두 개는 실제 엑셀 파일이다(scripts/fixtures/). 숫자로 저장된 학번,
 * XML 이스케이프가 필요한 이름, 서식이 섞여 한 셀이 여러 조각으로 쪼개진 경우,
 * 중간 빈 줄 — 실제로 명단에서 터지는 것들을 담았다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readSheet, SheetError } from "../src/lib/sheet";

let failed = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  통과  ${label}`);
  } else {
    failed++;
    console.log(`  실패  ${label}\n        기대: ${e}\n        실제: ${a}`);
  }
}

function fixture(name: string): Buffer {
  return readFileSync(resolve(process.cwd(), "scripts/fixtures", name));
}

console.log("\nxlsx");
check(
  "숫자 학번·이스케이프·빈 줄",
  readSheet("roster-sample.xlsx", fixture("roster-sample.xlsx")),
  [
    ["학번", "이름", "이메일"],
    ["2021001234", "이학생", "s1@hyu.ac.kr"],
    ["2021005678", "김학생", ""],
    ["2021009999", '따옴표 "김" & <태그>', "s3@hyu.ac.kr"],
    ["", "", ""],
    ["2021001111", "박학생", "s4@hyu.ac.kr"],
  ],
);
check(
  "서식이 섞인 셀은 조각을 이어 붙인다",
  readSheet("roster-richtext.xlsx", fixture("roster-richtext.xlsx")),
  [
    ["학번", "이름"],
    ["2022000001", "정현직"],
  ],
);

console.log("\ncsv · tsv");
check(
  "BOM·따옴표 안의 쉼표·두 겹 따옴표",
  readSheet(
    "a.csv",
    Buffer.from('﻿학번,이름\n2021001234,"김, 학생"\n2021005678,"따옴표 ""김"""\n', "utf8"),
  ),
  [
    ["학번", "이름"],
    ["2021001234", "김, 학생"],
    ["2021005678", '따옴표 "김"'],
  ],
);
check(
  "탭으로 나뉜 파일",
  readSheet("a.tsv", Buffer.from("학번\t이름\n2021\t홍길동\n", "utf8")),
  [
    ["학번", "이름"],
    ["2021", "홍길동"],
  ],
);

console.log("\n거절해야 하는 것");
for (const [label, name, buf] of [
  ["빈 파일", "a.csv", Buffer.alloc(0)],
  ["구형 .xls", "a.xls", Buffer.from("\xd0\xcf\x11\xe0", "binary")],
  ["zip 이지만 시트가 없음", "a.xlsx", Buffer.from("PK\x05\x06" + "\0".repeat(18), "binary")],
] as const) {
  try {
    readSheet(name, buf);
    failed++;
    console.log(`  실패  ${label} — 통과시키면 안 된다`);
  } catch (e) {
    const ok = e instanceof SheetError;
    if (!ok) failed++;
    console.log(`  ${ok ? "통과" : "실패"}  ${label}: ${(e as Error).message}`);
  }
}

console.log(failed === 0 ? "\n전부 통과.\n" : `\n${failed}건 실패.\n`);
process.exit(failed === 0 ? 0 : 1);
