/**
 * **엔진을 뜯지 않고 Major Core 를 더할 수 있는가.**
 *
 * 장기 확장 원칙의 합격선이다. 전기전자와 경영학 core 를 나중에 더할 때
 * 코드를 고쳐야 하면 그 설계는 틀린 것이다. 그래서 **가짜 core 둘을 만들어
 * 같은 코드를 그대로 돌려 본다.**
 *
 *   1. 내용 폴더를 임시 자리에 베낀다
 *   2. 전기전자(STEM)와 경영학(BUSINESS) core 를 데이터로만 만든다
 *   3. 등록부에 줄을 더한다
 *   4. `v3:build` 와 `v3:domains` 와 `v3:items` 를 **고치지 않고** 돌린다
 *   5. 시장 정책이 새 core 를 제대로 가리는지 본다
 *   6. core 를 모르게 짜야 하는 파일에 core 이름이 박혀 있지 않은지 본다
 *
 * 임시 자리는 끝나고 지운다. 저장소의 내용 파일은 한 줄도 바뀌지 않는다.
 *
 *   npm run v3:extend
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { coresForMarket, sellableCores, contractGaps } from "../src/lib/me-v3/core-registry";

const REAL = "sites/pca-platform/content";
const AX = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

/** 계약을 지키는 가짜 core 하나를 데이터로만 만든다 */
function fakeCore(dir: string, prefix: string, domains: [string, string][],
                  rf: number, oc: number): void {
  const tds = domains.map(([code, name]) => ({
    code, name, owns: `${name} 에서 책임지는 판단`,
    subareas: [`${name} 하위 하나`, `${name} 하위 둘`],
    required_axes: ["J3", "J6"],
  }));
  const rfs = Array.from({ length: rf }, (_, i) => ({
    code: `RF${i + 1}`, name: `역할 ${i + 1}`, one_line: "한 줄",
    output_kind: "산출물", success: "성공의 모양",
  }));
  const ocs = Array.from({ length: oc }, (_, i) => ({
    code: `OC${i + 1}`, name: `조직 ${i + 1}`, performance: "성과",
    differs: "달라지는 점",
  }));
  const boundaries = tds.slice(0, Math.max(5, Math.ceil(tds.length * 0.8)))
    .map((t, i) => ({
      pair: `${t.name} 경계 ${i + 1}`,
      a: { td: t.code, rf: "RF1" }, b: { td: tds[(i + 1) % tds.length].code, rf: "RF2" },
      shared: "공통점", a_difference: "차이 가", b_difference: "차이 나",
      a_question: "이쪽을 해 보셨습니까", b_question: "저쪽을 해 보셨습니까",
    }));

  writeFileSync(join(dir, `${prefix}-taxonomy.json`), JSON.stringify({
    schema_version: "core-taxonomy.1",
    axes: Object.fromEntries(AX.map((a) => [a, { name: a, question: "무엇" }])),
    scales: { S4: { axes: ["J3", "J5", "J6", "J8"] }, S8: { axes: AX } },
    levels: { L0: "없다", L1: "접했다", L2: "수행했다", L3: "소유했다" },
    technical_domains: tds, role_functions: rfs, org_contexts: ocs,
    job_aliases: tds.map((t) => ({
      posting_name: `${t.name} 엔지니어`, td: [t.code], rf: ["RF1"],
      oc: ["OC1"], distinguisher: "가르는 한 마디",
    })),
    boundaries,
  }, null, 1) + "\n");

  writeFileSync(join(dir, `${prefix}-domains.json`), JSON.stringify({
    schema_version: "core-domains.1",
    workflow_steps: Array.from({ length: 8 }, (_, i) => `걸음 ${i + 1}`),
    domains: tds.map((t) => ({
      code: t.code, name: t.name, required_axes: t.required_axes,
      workflow: Array.from({ length: 8 }, (_, i) => ({
        step: i + 1, name: `걸음 ${i + 1}`, detail: `${t.name} 의 걸음 ${i + 1}`,
      })),
      tools: ["도구 하나"], artifacts: ["산출물 하나"], verify_targets: ["견줄 것 하나"],
      axes: Object.fromEntries(AX.map((a) => [a, {
        l2: `${t.name} 에서 ${a} 를 수행했다`, l3: `${t.name} 에서 ${a} 를 소유했다`,
      }])),
      org_outcomes: Object.fromEntries(ocs.map((o) => [o.code, `${o.name} 의 성과 이름`])),
    })),
  }, null, 1) + "\n");

  writeFileSync(join(dir, `${prefix}-checklist-additions.json`), JSON.stringify({
    schema_version: "core-checklist-additions.1",
    items: tds.flatMap((t) => AX.flatMap((a) => [
      { td: t.code, axis: a, text: `${t.name} · ${a} 항목 하나`, source: "new" },
      { td: t.code, axis: a, text: `${t.name} · ${a} 항목 둘`, source: "new" },
    ])),
  }, null, 1) + "\n");

  writeFileSync(join(dir, `${prefix}-items-blueprint.json`), JSON.stringify({
    schema_version: "core-items-blueprint.1",
    rules: ["한 문항에 동작 하나 · 대상 하나 · 축 하나",
            "접속사와 가운뎃점으로 이어진 명사가 셋 이상이면 쓰기 전에 다시 본다"],
    result_sections: Object.fromEntries(
      "ABCDEFGHIJ".split("").map((k) => [k, `결과 절 ${k}`])),
    slots: [
      ...tds.flatMap((t) => ["interest", "exposure", "learning_intent"].map((c) => ({
        id: `G_${t.code}_${c}`, block: "CORE-GRID", construct: c, domain: t.code,
        axis: null, scale: "3보기", tier: "BASIC",
        result_sections: ["A", "B", "C", "D", "I"], reverse: false,
        stage_variants: false, field_routing: "all", note: "영역 훑기",
      }))),
      { id: "CJ_REV", block: "CORE-JUDGE", construct: "common_judgement",
        domain: null, axis: "J1", scale: "L0~L3", tier: "BASIC",
        result_sections: ["B", "E"], reverse: true, stage_variants: true,
        field_routing: "all", note: "역방향" },
      ...["J3", "J5", "J6", "J7"].flatMap((a) => [1, 2].map((n) => ({
        id: `P4_${a}_${n}`, block: "PROBE-S4", construct: "axis_level",
        domain: "selected",
        axis: a, scale: "L0~L3", tier: "BASIC",
        result_sections: ["A", "D", "E", "F", "G"], reverse: false,
        stage_variants: true, field_routing: "all", note: "선별 네 축" }))),
      ...["J1", "J2", "J4", "J8"].map((a) => ({
        id: `D8_${a}_1`, block: "DEEP-S8", construct: "axis_level", domain: "selected",
        axis: a, scale: "L0~L3", tier: "STANDARD",
        result_sections: ["A", "B", "D", "E", "G"], reverse: false,
        stage_variants: true, field_routing: "all", note: "심화 네 축" })),
      { id: "UG_ONE", block: "UG-CORE", construct: "experience_translation",
        domain: null, axis: "J5", scale: "L0~L3", tier: "BASIC",
        result_sections: ["D", "E", "H"], reverse: false, stage_variants: false,
        field_routing: "ug-core", note: "학사 분기" },
      { id: "GS_ONE", block: "GRAD-CORE", construct: "experience_translation",
        domain: null, axis: "J6", scale: "L0~L3", tier: "BASIC",
        result_sections: ["D", "E", "H"], reverse: false, stage_variants: true,
        field_routing: "grad-stem", note: "대학원 분기" },
      { id: "XF_ONE", block: "GRAD-XFIELD", construct: "translation_context",
        domain: null, axis: null, scale: "고르기", tier: "BASIC",
        result_sections: ["H"], reverse: false, stage_variants: false,
        field_routing: "xfield", note: "타계열 대학원 번역 맥락" },
      { id: "CN_1A", block: "CONSIST", construct: "consistency", domain: "selected",
        axis: "J3", scale: "L0~L3", tier: "STANDARD", result_sections: ["B"],
        reverse: false, stage_variants: true, field_routing: "all", note: "일관성" },
      { id: "TR_ONE", block: "TRANS-10", construct: "translation_step", domain: null,
        axis: "J8", scale: "보기", tier: "PRO", result_sections: ["E", "F", "H", "I"],
        reverse: false, stage_variants: true, field_routing: "계열", note: "번역" },
      { id: "TG_ONE", block: "TARGET", construct: "target_input", domain: null,
        axis: null, scale: "고르기", tier: "PRO", result_sections: ["J", "I"],
        reverse: false, stage_variants: false, field_routing: "all", note: "목표" },
    ],
  }, null, 1) + "\n");
}

/** 폴더 안 파일의 지문을 뜬다. 끝나고 같은지 보려는 것이다 */
function fingerprint(dir: string): string {
  const names = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const h = createHash("sha256");
  for (const n of names) {
    h.update(n);
    h.update(readFileSync(join(dir, n)));
  }
  return `${names.length}:${h.digest("hex").slice(0, 16)}`;
}

function run(dir: string, coreCode: string, script: string): string {
  return execFileSync("npx", ["tsx", script], {
    env: { ...process.env, CONTENT_DIR: dir, CORE: coreCode },
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
}

function main(): void {
  const tmp = mkdtempSync(join(tmpdir(), "v3-extend-"));
  const dir = join(tmp, "content");
  const before = fingerprint(REAL);
  try {
    cpSync(REAL, dir, { recursive: true });

    /* 전기전자 여섯 영역 · 경영학 다섯 영역. 개수가 달라도 돌아야 한다 */
    fakeCore(dir, "ee-v1", [
      ["TD01", "회로·보드 설계"], ["TD02", "전력·전자"], ["TD03", "통신·신호"],
      ["TD04", "반도체 소자"], ["TD05", "제어·임베디드"], ["TD06", "계측·검증"],
    ], 7, 7);
    fakeCore(dir, "biz-v1", [
      ["TD01", "재무·회계"], ["TD02", "마케팅·영업"], ["TD03", "전략·기획"],
      ["TD04", "운영·공급망"], ["TD05", "데이터·분석"],
    ], 6, 5);

    const reg = JSON.parse(readFileSync(join(dir, "major-cores.json"), "utf8"));
    for (const [code, major, ko, family, prefix, markets, n] of [
      ["EE_CORE_V1", "EE", "전기전자", "STEM", "ee-v1", ["KR", "GLOBAL"], 6],
      ["BIZ_CORE_V1", "BIZ", "경영학", "BUSINESS", "biz-v1", ["KR"], 5],
    ] as [string, string, string, string, string, string[], number][]) {
      const row = reg.cores.find((c: { code: string }) => c.code === code);
      const patch = {
        code, family, major, name_ko: ko, name_en: code,
        assessment_version: `${major}_V1_DOMAIN_2026`, status: "building",
        markets, domain_count: n, axis_count: 8,
        files: {
          taxonomy: `${prefix}-taxonomy.json`,
          domains: `${prefix}-domains.json`,
          checklists: `${prefix}-checklists.json`,
          items_blueprint: `${prefix}-items-blueprint.json`,
          checklist_additions: `${prefix}-checklist-additions.json`,
        },
      };
      if (row) Object.assign(row, patch);
      else reg.cores.push(patch);
    }
    writeFileSync(join(dir, "major-cores.json"), JSON.stringify(reg, null, 1) + "\n");

    /* 2. 같은 코드로 빌드와 검사가 돈다.
          **빌드를 계약 확인보다 먼저 돌린다**: 체크리스트는 생성물이라
          빌드 전에는 없는 것이 맞다. 없다고 걸면 거짓 경보가 된다 */
    for (const code of ["EE_CORE_V1", "BIZ_CORE_V1"]) {
      let built = "";
      try { built = run(dir, code, "scripts/v3-build.ts"); } catch (e) {
        built = `터졌다: ${(e as Error).message.slice(0, 120)}`;
      }
      ok(`${code} 를 v3:build 가 고치지 않고 만든다`,
         built.includes("만들었다"), built.trim().split("\n").pop() ?? "");

      const gaps = contractGaps(code, dir);
      ok(`${code} 가 계약을 지킨다`, gaps.length === 0,
         gaps.length ? gaps.join(" · ") : "required 파일과 열쇠");

      for (const [name, script] of [["v3:domains", "scripts/v3-domains-check.ts"],
                                    ["v3:items", "scripts/v3-items-check.ts"]]) {
        let out = "";
        let good = true;
        try { out = run(dir, code, script); } catch (e) {
          good = false;
          out = String((e as { stdout?: string }).stdout ?? (e as Error).message);
        }
        const last = out.trim().split("\n").filter((l) => l.includes("걸림")).pop() ?? "";
        ok(`${code} 가 ${name} 를 통과한다`, good && /걸림 0/.test(out), last.trim());
      }
    }

    // 3. 시장 정책이 새 core 를 가린다
    const g = sellableCores("GLOBAL", dir).map((c) => c.code);
    ok("GLOBAL 에 경영학 core 가 새지 않는다", !g.includes("BIZ_CORE_V1"),
       `GLOBAL: ${g.join(", ")}`);
    const k = sellableCores("KR", dir).map((c) => c.code);
    ok("KR 에 세 core 가 다 선다",
       ["ME_CORE_V3", "EE_CORE_V1", "BIZ_CORE_V1"].every((c) => k.includes(c)),
       `KR: ${k.join(", ")}`);
    ok("GLOBAL 은 STEM 만", sellableCores("GLOBAL", dir).every((c) => c.family === "STEM"));
    ok("없는 시장은 빈 목록", coresForMarket("JP", dir).length === 0);

    // 4. core 를 모르게 짜야 하는 파일에 core 이름이 박혀 있지 않다
    const agnostic = [
      "src/lib/me-v3/core-registry.ts", "scripts/v3-build.ts",
      "scripts/v3-domains-check.ts", "scripts/v3-items-check.ts",
      "scripts/v3-arch-check.ts",
    ];
    const banned = [/me-v3-/, /me-evidence-map/, /ME_CORE/, /\bTD0\d\b/, /ME_V3_DOMAIN/];
    const stuck: string[] = [];
    for (const f of agnostic) {
      const body = readFileSync(f, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/^\s*\/\/.*$/gm, " ");
      for (const re of banned) if (re.test(body)) stuck.push(`${f} ← ${re}`);
    }
    ok("core 를 모르게 짠 파일에 core 이름이 없다", stuck.length === 0,
       stuck.length ? stuck.join(" · ") : `${agnostic.length}벌`);

    /* 5. 저장소 내용 파일은 한 줄도 안 바뀐다.
          git 상태로 보지 않는 까닭은 이 회차에 새로 더한 파일까지 섞여
          들어오기 때문이다. 이 검사가 묻는 것은 **이 검사가 건드렸는가**다 */
    const after = fingerprint(REAL);
    ok("저장소 내용 파일을 건드리지 않는다", before === after,
       before === after ? `지문 그대로 ${before}` : `${before} → ${after}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  if (fail) {
    console.log("\n엔진을 뜯지 않고 core 를 더할 수 없는 상태입니다. " +
                "장기 확장 원칙을 깨므로 설계를 고치십시오.");
  }
  process.exit(fail ? 1 : 0);
}

main();
