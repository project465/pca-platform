/**
 * 어느 판본으로 응시했는지 되짚을 수 있는가. 그리고 Core 가 섞이지 않는가.
 *
 * 묻는 것 넷이다.
 *
 *  - **판본을 적는 자리가 하나인가.** 전역 상수를 응시 기록에 쓰면 전기전자
 *    응시 줄에 기계공학 판본이 적힌다. 판정에는 들어가지 않지만 **되짚을
 *    때 읽는 이름표가 거짓이 된다**: 끝난 뒤에는 되물을 수 없다.
 *  - **스냅샷 하나로 되짚을 수 있는가.** core_code · specialization ·
 *    item_bank_version · scoring_version · result_model_version ·
 *    assessment_ui_version 여섯이다. 갈래는 없으면 `null` 이다.
 *  - **두 Core 를 번갈아 열어도 섞이지 않는가.** 실제 DB 에 줄을 넣어 본다.
 *  - **할 일이 0개인 결과가 없는가.** 사람 열두 벌 × 등급 셋 × Core 둘.
 *
 *   npm run v3:provenance
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { loadEnv, makeStudent } from "./_loop-fixture";
loadEnv();

/* eslint-disable import/first */
import {
  CONTENT_DIR, core as coreEntry, coreFile, registry, sellableCores,
} from "../src/lib/me-v3/core-registry";
import { load, score } from "../src/lib/me-v3/scoring/engine";
import { bankVersionOf, SCORING_VERSION } from "../src/lib/me-v3/scoring/version";
import { expand, type Fixture } from "../src/lib/me-v3/scoring/fixtures";
import { buildResult } from "../src/lib/me-v3/result/build";
import { CHAIN_KO, chainFor } from "../src/lib/me-v3/result/chains";
import { RESULT_MODEL_VERSION } from "../src/lib/me-v3/result/version";
import { ASSESSMENT_UI_VERSION } from "../src/lib/me-v3/runtime/ui-version";
import { query, queryOne } from "../src/lib/db";
import type { Submission } from "../src/lib/me-v3/scoring/types";

let pass = 0; const bad: string[] = [];
function ok(name: string, good: boolean, saw = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${name}${saw ? " — " + saw : ""}`); }
  else { bad.push(name); console.log(`  걸림  ${name}${saw ? " — " + saw : ""}`); }
}

const TIERS: Submission["tier"][] = ["BASIC", "STANDARD", "PRO"];
/** 자료가 다 선 Core. `planned` 인 자리는 은행이 없다 */
const LIVE = registry().cores
  .filter((c) => c.status === "building" || c.status === "live")
  .map((c) => c.code);

function body(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

async function main(): Promise<void> {
  console.log(`  Core  ${LIVE.join(" · ")}\n`);

  /* ── 1절. 판본을 적는 자리가 하나다 ───────────────────────────── */

  /* 1. 적는 길에서 전역 상수를 읽지 않는다. **주석은 걷어 내고 본다**:
        왜 그렇게 짰는지 적어 둔 글까지 세면 기록을 지우라고 요구하게 된다 */
  const WRITERS = [
    "src/lib/me-v3/scoring/engine.ts",
    "src/lib/me-v3/runtime/session.ts",
  ];
  const leaks = WRITERS.filter((f) =>
    /\bITEM_BANK_VERSION\b/.test(body(readFileSync(f, "utf8"))));
  ok("판본을 적는 길이 전역 상수를 읽지 않는다", leaks.length === 0,
    leaks.length ? leaks.join(" ") : `${WRITERS.length}벌`);

  /* 2. Core 마다 은행이 제 판본을 적는다 */
  const vers = new Map<string, string>();
  const silent: string[] = [];
  for (const c of LIVE) {
    try { vers.set(c, bankVersionOf(c)); } catch { silent.push(c); }
  }
  ok("Core 마다 문항 은행이 제 판본을 적는다", silent.length === 0,
    silent.length ? silent.join(" ") : [...vers.values()].join(" · "));

  /* 3. 두 Core 가 같은 판본 이름을 쓰지 않는다. 쓰면 되짚을 때 못 가른다 */
  ok("Core 마다 판본 이름이 다르다",
    new Set(vers.values()).size === vers.size,
    `${vers.size}가지`);

  /* 4. 이름이 그 Core 의 검사 판본으로 시작한다. **새 체계를 만들지 않는다**:
        기계공학이 `ME_V3_ITEM_BANK_V2.5` 이므로 전기전자는 `EE_V1_...` 이다 */
  const offShape: string[] = [];
  for (const [c, v] of vers) {
    const av = coreEntry(c).assessment_version;
    /* 검사 판본을 안 적은 Core 는 이 줄로 재지 않는다. 그 사실은 등록부
       계약을 보는 `v3:domains` 가 센다 */
    if (!av) { offShape.push(`${c}: 검사 판본이 등록부에 없다`); continue; }
    /* `ME_V3_2` 의 검사 판본에서 뒤 토막을 뗀 `ME_V3` 가 은행 이름의 머리다 */
    const head = av.split("_").slice(0, 2).join("_");
    if (!v.startsWith(`${head}_ITEM_BANK_`)) offShape.push(`${c}:${v} (${head}_ITEM_BANK_*)`);
  }
  ok("판본 이름이 기존 convention 을 따른다", offShape.length === 0,
    offShape.length ? offShape.join(" · ") : [...vers.values()].join(" · "));

  /**
   * 5. **적는 차례가 Core 마다 따로 있다.**
   *
   * 영역 코드는 Core 안에서만 뜻이 있다. 공용 문장 층에 코드만 적어 두면
   * 다음 Core 가 그 표를 조용히 물려받고, 전기전자 응시자가
   * `공차와 체결 결정 → 도면 → 시작품 확인` 을 받는다. 전역 문항 은행
   * 판본과 같은 종류의 탈이다.
   */
  const noChain: string[] = [];
  const copied: string[] = [];
  for (const c of LIVE) {
    const dom = coreFile<{ domains: { code: string }[] }>(c, "domains");
    for (const d of dom.domains) {
      if (!chainFor(c, d.code).length) noChain.push(`${c}.${d.code}`);
    }
  }
  /* 두 Core 가 같은 영역 코드에 **같은 차례**를 들면 베낀 것이다 */
  for (let i = 0; i < LIVE.length; i += 1) {
    for (let j = i + 1; j < LIVE.length; j += 1) {
      const a = CHAIN_KO[LIVE[i]] ?? {}, b = CHAIN_KO[LIVE[j]] ?? {};
      for (const k of Object.keys(a)) {
        if (b[k] && a[k].join("|") === b[k].join("|")) {
          copied.push(`${LIVE[i]}/${LIVE[j]}.${k}`);
        }
      }
    }
  }
  ok("Core 마다 영역 전부에 적는 차례가 있다", noChain.length === 0,
    noChain.length ? noChain.slice(0, 4).join(" · ")
      : LIVE.map((c) => `${c} ${Object.keys(CHAIN_KO[c] ?? {}).length}개`).join(" · "));
  ok("두 Core 가 같은 차례를 돌려 쓰지 않는다", copied.length === 0,
    copied.length ? copied.slice(0, 4).join(" · ") : `${LIVE.length}개 Core`);

  /* ── 2절. 스냅샷 하나로 되짚는다 ──────────────────────────────── */

  type Row = { core: string; id: string; tier: Submission["tier"];
               bank: string; coreVer: string; actions: number };
  const rows: Row[] = [];
  const wrongBank: string[] = [];
  const zero: string[] = [];

  for (const c of LIVE) {
    const loaded = load(c);
    const fixPath = coreEntry(c).fixtures?.personas;
    if (!fixPath) { bad.push(`${c} fixtures.personas 없음`); continue; }
    const fx = JSON.parse(readFileSync(fixPath, "utf8")) as { personas: Fixture[] };
    for (const f of fx.personas) {
      for (const tier of TIERS) {
        const s = score({ ...expand(f, c), tier }, loaded);
        const m = buildResult(s, loaded, { packs: { industries: [], roles: [] } });
        rows.push({ core: c, id: f.id, tier,
          bank: s.module_versions.item_bank_version,
          coreVer: s.module_versions.core_version,
          actions: m.actions.length });
        if (s.module_versions.item_bank_version !== vers.get(c)) {
          wrongBank.push(`${c}/${f.id}/${tier}=${s.module_versions.item_bank_version}`);
        }
        if (m.actions.length === 0) zero.push(`${c}/${f.id}/${tier}`);
      }
    }
  }

  /* 5. 응시마다 그 Core 의 은행 판본이 적힌다 */
  ok("응시마다 그 Core 의 은행 판본이 적힌다", wrongBank.length === 0,
    wrongBank.length ? wrongBank.slice(0, 4).join(" · ") : `${rows.length}벌`);

  /* 6. 스냅샷의 Core 와 판단 규칙 */
  const badCore = rows.filter((r) => r.coreVer !== r.core);
  ok("스냅샷이 제 Core 를 적는다", badCore.length === 0, `${rows.length}벌`);
  const s0 = score({ ...expand(
    (JSON.parse(readFileSync(coreEntry(LIVE[0]).fixtures!.personas!, "utf8")) as
      { personas: Fixture[] }).personas[0], LIVE[0]), tier: "PRO" }, load(LIVE[0]));
  ok("판단 규칙 판본이 적힌다", s0.module_versions.scoring_version === SCORING_VERSION,
    SCORING_VERSION);

  /* 7. 결과 모델과 검사 화면 판본. **적는 자리에서 얹는다**: 채점 엔진은
        화면 판본을 모른다(알면 문장 하나 고친 날 채점이 달라진 것처럼 보인다) */
  const sess = readFileSync("src/lib/me-v3/runtime/session.ts", "utf8");
  const SIX = ["core_code", "specialization", "item_bank_version",
    "scoring_version", "result_model_version", "assessment_ui_version"];
  const vblock = /const versions = \{([\s\S]*?)\n  \};/.exec(sess)?.[1] ?? "";
  const missing = SIX.filter((k) =>
    k === "item_bank_version" || k === "scoring_version"
      ? !/\.\.\.snapshot\.module_versions/.test(vblock)
      : !new RegExp(`\\b${k}:`).test(vblock));
  ok("스냅샷에 되짚을 여섯 칸이 다 적힌다", missing.length === 0,
    missing.length ? missing.join(" ") : SIX.join(" · "));

  /* 8. 갈래는 없으면 null 이다. 칸을 빼지 않는 까닭은, 칸이 아예 없는 것과
        갈래 없이 응시한 것이 되짚을 때 구별되지 않기 때문이다 */
  ok("갈래가 없으면 null 로 적는다",
    /specialization: a\.specialization_code \?\? null/.test(sess));

  /* 9. 적는 판본이 지금 코드의 값과 같다 */
  ok("결과 모델 판본이 지금 값이다", RESULT_MODEL_VERSION.startsWith("me-v3-result-model."),
    RESULT_MODEL_VERSION);
  ok("검사 화면 판본이 지금 값이다", ASSESSMENT_UI_VERSION.length > 0,
    ASSESSMENT_UI_VERSION);

  /* ── 3절. 할 일이 0개인 결과를 만들지 않는다 ─────────────────── */

  ok("할 일이 0개인 결과가 없다", zero.length === 0,
    zero.length ? zero.slice(0, 6).join(" · ")
      : `사람 ${rows.length / TIERS.length}벌 × 등급 ${TIERS.length} × Core ${LIVE.length}`);

  /* ── 4절. 번갈아 응시해도 섞이지 않는다 (실제 DB) ─────────────── */

  if (!process.env.DATABASE_URL) {
    console.log("  지나감 DB 격리 — DATABASE_URL 이 없다");
    pass += 1;
  } else {
    const { openAttempt } = await import("../src/lib/me-v3/runtime/session");
    /**
     * 닫아 둔 Core 는 학교 맥락이 **통째로 버려진다**(그것이 설계다). 그래서
     * 전기전자로 응시 줄을 열어 보려면 그 칸을 잠시 열어야 한다. `ee:walk`
     * 와 같은 길이고 **반드시 되돌린다**: `finally` 가 되돌리고 지문을 견준다.
     */
    const REG = `${CONTENT_DIR}/major-cores.json`;
    const kept = readFileSync(REG);
    const flip = (code: string, open: boolean) => {
      const reg = JSON.parse(readFileSync(REG, "utf8")) as
        { cores: { code: string; open_to_students?: boolean }[] };
      const row = reg.cores.find((c) => c.code === code);
      if (!row) throw new Error(`등록부에 ${code} 가 없습니다`);
      row.open_to_students = open;
      writeFileSync(REG, `${JSON.stringify(reg, null, 1)}\n`);
    };
    const made: string[] = [];
    const mix: string[] = [];
    try {
      for (const c of LIVE) flip(c, true);
      /* **번갈아 연다.** 같은 Core 를 잇따라 열면 섞이는 것을 볼 수 없다 */
      const order = [...LIVE, ...LIVE];
      for (let n = 0; n < order.length; n += 1) {
        const want = order[n];
        const st = await makeStudent(`prov-${Date.now()}-${n}`);
        made.push(st.id);
        const a = await openAttempt({
          userId: st.id, tier: "BASIC", stage: "bachelor", gradField: null,
          campus: {
            university_code: "PCU", college_code: null,
            department_code: null, core_code: want, specialization: null,
          } as never,
        });
        const row = await queryOne<{ core_code: string; item_bank_version: string;
                                    assessment_version: string }>(
          `SELECT core_code, item_bank_version, assessment_version
             FROM v3_attempts WHERE id=$1`, [a.id]);
        const got = `${row!.core_code}/${row!.item_bank_version}/${row!.assessment_version}`;
        const need = `${want}/${bankVersionOf(want)}/${coreEntry(want).assessment_version}`;
        if (got !== need) mix.push(`${n}: ${got} (바라던 것 ${need})`);
      }
    } finally {
      writeFileSync(REG, kept);
    }
    ok("번갈아 열어도 응시 줄의 Core 와 판본이 짝이 맞는다", mix.length === 0,
      mix.length ? mix.join(" · ") : `${LIVE.length * 2}줄 · ${LIVE.join(" ")}`);
    ok("등록부를 글자까지 되돌렸다",
      createHash("sha256").update(readFileSync(REG)).digest("hex")
        === createHash("sha256").update(kept).digest("hex"));
    ok("되돌린 뒤 전기전자가 다시 닫혀 있다",
      !sellableCores("KR").some((c) => c.code === "EE_CORE_V1"),
      sellableCores("KR").map((c) => c.code).join(" "));
    /* 치운다. 남겨 두면 다음 사람이 이 줄을 손님 자료로 읽는다 */
    for (const id of made) {
      await query("DELETE FROM v3_attempts WHERE user_id=$1", [id]);
      await query("DELETE FROM users WHERE id=$1", [id]);
    }
    const left = await queryOne<{ n: string }>(
      `SELECT count(*)::text n FROM users WHERE id = ANY($1::bigint[])`, [made]);
    ok("검사가 넣은 줄을 치웠다", left?.n === "0", `사람 ${made.length}벌`);
  }

  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  if (bad.length) { console.log(bad.map((b) => `  - ${b}`).join("\n")); process.exit(1); }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
