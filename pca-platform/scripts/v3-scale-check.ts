/**
 * **보기를 셋에서 다섯으로 늘려도 판정이 그대로인가.**
 *
 * 영역 훑기의 관심과 배울 뜻이 화면에서 셋만 내놓고 있었다(`관심 있다` ·
 * `관심이 적다` · `잘 모르겠다`). 둘이 섞여 있어서 그렇다: **`관심이 적다`
 * 는 관심 수준이고 `잘 모르겠다` 는 정보가 없다는 뜻**이다.
 *
 * 그런데 저장되는 값은 처음부터 1~5 였고 `band()` 가 `1~2 = LOW` ·
 * `3 = MID` · `4~5 = HIGH` 로 가른다. 그래서 다섯으로 늘리는 일은
 * **새 mapping 이 필요한 변경이 아니고 화면이 못 보내던 두 값을 열어 주는
 * 일**이다. 그 사실을 말로 적어 두면 다음 사람이 `MID` 를 새 상태로 보고
 * 분기를 더한다. 그래서 센다.
 *
 * 세는 것 넷.
 *
 *   ① `band()` 가 1~5 와 `UNKNOWN` 을 표대로 가른다
 *   ② 옛 세 값만으로 돌린 Core 지문이 바뀌지 않는다
 *   ③ 새 값 둘이 옛 값과 같은 band 를 만든다
 *   ④ `3` 은 `MID` 이고 `LOW` 도 `HIGH` 도 아니다
 *
 *   npm run v3:scale
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { coreOnly, load, score } from "../src/lib/me-v3/scoring/engine";
import { band, UNKNOWN } from "../src/lib/me-v3/scoring/normalize";
import { expand, type Fixture } from "../src/lib/me-v3/scoring/fixtures";
import { decide, nextSteps } from "../src/lib/me-v3/scoring/zones";
import type { Answer } from "../src/lib/me-v3/scoring/types";

let pass = 0;
const bad: string[] = [];
function ok(what: string, cond: boolean, saw = ""): void {
  if (cond) { pass++; console.log(`  통과  ${what}`); }
  else { bad.push(what); console.log(`  걸림  ${what} ${saw}`); }
}

const CORE = process.env.CORE ?? "ME_CORE_V3";

/** 보기 다섯의 값과 그 band. **지시의 권장 mapping 과 같다** */
const TABLE: [number, "LOW" | "MID" | "HIGH"][] = [
  [1, "LOW"], [2, "LOW"], [3, "MID"], [4, "HIGH"], [5, "HIGH"],
];

/** 화면이 셋만 내놓던 때 보낼 수 있던 값 */
const OLD_VALUES = [5, 1, UNKNOWN] as const;

function fingerprint(f: Fixture): string {
  const sub = expand(f, CORE);
  const snap = score(sub, load(CORE));
  return createHash("sha256").update(JSON.stringify(coreOnly(snap))).digest("hex").slice(0, 16);
}

/**
 * **판정만** 떠낸다. 되돌려 적는 날값을 뺀다.
 *
 * `coreOnly` 는 `interest: d.interest.raw` 를 함께 적는다 — 그 사람이 무엇을
 * 눌렀는지 되짚는 자리라서 맞다. 그래서 `4` 와 `5` 는 지문이 다르다.
 * 여기서 묻는 것은 **같은 band 면 판정이 같은가**이므로 날값을 걷고 센다.
 */
function judgeOnly(f: Fixture): string {
  const snap = score(expand(f, CORE), load(CORE));
  const core = coreOnly(snap) as {
    zones: unknown; focus: unknown;
    domains: Record<string, unknown>[];
  };
  const judged = {
    zones: core.zones, focus: core.focus,
    domains: core.domains.map((d) => {
      const { interest: _i, experience: _e, learning: _l, ...rest } = d;
      return rest;
    }),
  };
  return createHash("sha256").update(JSON.stringify(judged)).digest("hex").slice(0, 16);
}

/** 관심과 배울 뜻을 주어진 값으로 덮은 사람 하나 */
function withGrid(int: number | string, lea: number | string): Fixture {
  const answers: Record<string, Answer> = {};
  for (const td of ["TD01", "TD02", "TD03"]) {
    answers[`G_${td}_INT`] = typeof int === "number"
      ? { kind: "scale5", value: int } : { kind: "choice", value: int };
    answers[`G_${td}_LEA`] = typeof lea === "number"
      ? { kind: "scale5", value: lea } : { kind: "choice", value: lea };
    answers[`G_${td}_EXP`] = { kind: "exposure", value: 1 };
  }
  return {
    id: "scale", name: "척도 점검", tier: "STANDARD", stage: "bachelor",
    field: null, probe: ["TD01", "TD02", "TD03"], deep: ["TD02"], answers,
  };
}

function main(): void {
  console.log("\n보기를 셋에서 다섯으로 늘려도 판정이 그대로인가\n");

  /* ① 표 */
  const wrong = TABLE.filter(([v, want]) => band(v) !== want)
    .map(([v, want]) => `${v}→${band(v)} (${want} 이어야 한다)`);
  ok(`\`band()\` 가 다섯 값을 표대로 가른다 — 1~2 LOW · 3 MID · 4~5 HIGH`,
    wrong.length === 0, wrong.join(" / "));

  /* ② 옛 값만으로 돌린 지문. **바꾸기 전 값을 파일에 적어 둔다** */
  const old5 = fingerprint(withGrid(5, 5));
  const old1 = fingerprint(withGrid(1, 1));
  const oldU = fingerprint(withGrid(UNKNOWN, UNKNOWN));
  const LOCK = "assessment/ME_V3/scale-lock.json";
  let locked: Record<string, string> = {};
  try { locked = JSON.parse(readFileSync(LOCK, "utf8")) as Record<string, string>; }
  catch { locked = {}; }
  const now = { old5, old1, oldU };
  if (process.env.LOCK === "update" || !Object.keys(locked).length) {
    console.log(`  (지문을 적는다 — ${LOCK})`);
    const { writeFileSync, mkdirSync } = await0();
    mkdirSync("assessment/ME_V3", { recursive: true });
    writeFileSync(LOCK, `${JSON.stringify(now, null, 2)}\n`);
    locked = now;
  }
  const moved = Object.entries(now).filter(([k, v]) => locked[k] !== v)
    .map(([k, v]) => `${k}: ${locked[k]} → ${v}`);
  ok("옛 세 값으로 돌린 Core 지문이 그대로다", moved.length === 0, moved.join(" / "));

  /* ③ 새 값이 옛 값과 같은 band */
  const j5 = judgeOnly(withGrid(5, 5));
  const j1 = judgeOnly(withGrid(1, 1));
  ok("`4` 가 `5` 와 같은 판정을 받는다 (HIGH)", judgeOnly(withGrid(4, 4)) === j5,
    `${judgeOnly(withGrid(4, 4))} vs ${j5}`);
  ok("`2` 가 `1` 과 같은 판정을 받는다 (LOW)", judgeOnly(withGrid(2, 2)) === j1,
    `${judgeOnly(withGrid(2, 2))} vs ${j1}`);
  ok("**누른 값은 그대로 되짚을 수 있다** (`4` 와 `5` 의 지문은 다르다)",
    fingerprint(withGrid(4, 4)) !== fingerprint(withGrid(5, 5)));

  /* ④ `3` 은 MID 이고 두 분기 어디에도 안 들어간다 */
  const jmid = judgeOnly(withGrid(3, 3));
  ok("`3` 은 `5` 와도 `1` 과도 다른 판정이다 (MID)", jmid !== j5 && jmid !== j1);
  const base = {
    tier: "STANDARD" as const, openedDeep: true, openedProbe: true,
    confirmedAll: 3, confirmedScreen: 2, requiredOk: false, missingRequired: ["J3"],
    outputOk: false, outputEvidenceOk: false, verificationOk: false, anyAnswer: true,
  };
  ok("`MID` 는 `LOW` 분기(Z3)에 들어가지 않는다",
    decide({ ...base, interest: "MID" }).zone !== "Z3_EVIDENCE_LOW_INTEREST"
    && decide({ ...base, interest: "LOW" }).zone === "Z3_EVIDENCE_LOW_INTEREST");
  ok("`MID` 는 `HIGH` 분기(한 번 겪어 보기)에 들어가지 않는다",
    !nextSteps({
      zone: "Z4_INSUFFICIENT_EVIDENCE", interest: "MID", learning: "HIGH",
      experience: "NONE", confirmedAll: 0, outputOk: false, verificationOk: false,
    }).includes("TRY_SHORT_EXPERIENCE")
    && nextSteps({
      zone: "Z4_INSUFFICIENT_EVIDENCE", interest: "HIGH", learning: "HIGH",
      experience: "NONE", confirmedAll: 0, outputOk: false, verificationOk: false,
    }).includes("TRY_SHORT_EXPERIENCE"));

  /* ⑤ 문항 은행이 실제로 다섯을 내놓는가 (화면 쪽) */
  type Bank = { items: { item_id: string; measurement_axis: string;
    options?: string[] | null; option_values?: (number | null)[] | null }[] };
  const bank = JSON.parse(
    readFileSync("sites/pca-platform/content/me-v3-2-items.json", "utf8")) as Bank;
  const gridOf = (axis: string) =>
    bank.items.filter((i) => i.measurement_axis === axis && i.item_id.startsWith("G_"));
  const five = (axis: string) => gridOf(axis).every((i) => {
    const vs = (i.option_values ?? []).filter((v) => typeof v === "number");
    return vs.length === 5 && [1, 2, 3, 4, 5].every((n) => vs.includes(n));
  });
  const esc = (axis: string) => gridOf(axis).every((i) =>
    (i.option_values ?? []).some((v) => v === null));
  ok(`관심이 다섯 값을 내놓는다 — 문항 ${gridOf("interest").length}개`, five("interest"));
  ok(`배울 뜻이 다섯 값을 내놓는다 — 문항 ${gridOf("learning_intent").length}개`,
    five("learning_intent"));
  ok("`잘 모르겠다` 가 척도 밖에 남아 있다 (값 없는 자리)",
    esc("interest") && esc("learning_intent"));

  /**
   * ⑥ **경험은 늘리지 않는다.** 읽는 자리가 세 마디뿐이라 다섯으로 받으면
   * `2·3·4` 가 전부 `여러 번` 으로 모이고, 받고 쓰지 않는 값이 둘 생긴다.
   */
  const expVals = gridOf("exposure").flatMap((i) => i.option_values ?? []);
  ok("경험은 세 값 그대로다 — 0 · 1 · 2",
    gridOf("exposure").every((i) => (i.option_values ?? []).length === 3)
    && [0, 1, 2].every((n) => expVals.includes(n)));

  console.log(`\n  옛 값 ${OLD_VALUES.length}개로 돌린 지문 ${old5.slice(0, 8)} ·`
    + ` ${old1.slice(0, 8)} · ${oldU.slice(0, 8)}`);
}

/** `node:fs` 를 늦게 들이는 자리. 지문을 적을 때만 쓴다 */
function await0() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("node:fs") as typeof import("node:fs");
}

main();
console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
process.exit(bad.length ? 1 : 0);
