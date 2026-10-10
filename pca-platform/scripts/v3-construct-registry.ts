/**
 * construct 등록부를 만든다. **한 번 만들고 그 뒤에는 손으로 고친다.**
 *
 * 처음 줄을 채우는 일만 기계가 한다. 그 뒤로 이 파일이 **정본**이고, 검사는
 * 여기 적힌 것만 읽는다. 문항이 늘면 `REGISTRY=update` 로 빈 줄을 채우고,
 * 사람이 정한 줄(`pinned`)은 덮지 않는다.
 *
 * 왜 추론을 버렸는가. `measurement_axis` 하나로 construct 를 읽으면
 * `axis_level` 이 소유와 산출물과 검증 셋으로 갈리고, 그 추론이 **문면과
 * 보기가 어긋난 문항을 통과시켰다**. 선언을 믿는 검사는 선언이 틀린 날
 * 아무것도 재지 않는다.
 *
 *   npm run v3:registry            적힌 것과 은행을 맞춰 센다
 *   REGISTRY=update npm run v3:registry   빠진 줄을 채운다
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONTENT_DIR, core as coreEntry, registry } from "../src/lib/me-v3/core-registry";
import { load } from "../src/lib/me-v3/scoring/engine";
import {
  COMPATIBLE, SCALE_TO_TYPE, compatible,
  type Construct, type ConstructRegistry, type ConstructRow, type ResponseType,
} from "../src/lib/me-v3/measurement/registry";

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

const coreCode = process.env.CORE
  ?? registry().cores.filter((c) => c.status === "building")[0].code;
const loaded = load(coreCode);
type Item = {
  item_id: string; module: string; measurement_axis: string;
  evidence_axis: string | null; response_scale: string | null;
  reverse_flag?: boolean; consistency_pair?: string | null;
};
const items = loaded.bank.items as unknown as Item[];
const at = join(CONTENT_DIR, coreEntry(coreCode).files.constructs!);

/**
 * 첫 줄을 채울 때만 쓰는 표.
 *
 * **검사가 이 표를 읽지 않는다.** 등록부를 처음 만들 때 한 번 돌고, 그 뒤로는
 * 등록부가 정본이다. 그래서 여기 틀린 줄이 있어도 사람이 등록부에서 고치면
 * 그 고침이 남는다.
 */
function seed(i: Item): Construct {
  switch (i.measurement_axis) {
    case "interest": return "INTEREST";
    case "learning_intent": return "LEARNING_INTENT";
    case "exposure": return "EXPERIENCE";
    case "consistency": return "CONSISTENCY";
    case "forced_choice": return "ROUTING_ONLY";
    case "target_input": return "GOAL";
    case "translation_step": return "TRANSLATION";
    case "translation_context": return "TRANSLATION";
    case "common_judgement": return "JUDGMENT";
    case "experience_translation": return "JUDGMENT";
    case "axis_level":
      return i.evidence_axis === "J5" ? "OUTPUT"
        : i.evidence_axis === "J6" ? "VERIFICATION" : "OWNERSHIP";
    default: return "OWNERSHIP";
  }
}

let reg: ConstructRegistry;
try {
  reg = JSON.parse(readFileSync(at, "utf8")) as ConstructRegistry;
} catch {
  reg = {
    schema_version: "me-v3-2-constructs.1",
    core: coreCode,
    item_bank_version: loaded.bank.assessment_version,
    note: "문항마다 무엇을 재는가와 어떻게 받는가. 추론하지 않고 적어 둔다."
      + " 짝 표는 src/lib/me-v3/measurement/registry.ts 에 있고 여기는 줄만 있다."
      + " 새 문항을 더하면 여기 한 줄을 적어야 v3:measure 가 지나간다.",
    items: [],
  };
}

const byId = new Map(reg.items.map((r) => [r.item_id, r]));
if (process.env.REGISTRY === "update") {
  let added = 0, kept = 0;
  for (const i of items) {
    const have = byId.get(i.item_id);
    const rt = SCALE_TO_TYPE[i.response_scale ?? ""];
    if (have) {
      /* 사람이 정한 줄은 덮지 않는다. response type 만 은행에 맞춘다 */
      if (!have.pinned && rt) have.response_type = rt;
      kept += 1;
      continue;
    }
    const row: ConstructRow = {
      item_id: i.item_id, primary: seed(i),
      response_type: rt ?? "FREE_TEXT",
    };
    reg.items.push(row); byId.set(i.item_id, row); added += 1;
  }
  reg.item_bank_version = loaded.bank.assessment_version;
  reg.items.sort((a, b) => a.item_id.localeCompare(b.item_id));
  writeFileSync(at, JSON.stringify(reg, null, 2) + "\n");
  console.log(`  적었다  ${at} — 새 줄 ${added} · 그대로 ${kept}\n`);
}

console.log(`  core  ${coreCode} · 은행 ${items.length}문항 · 등록부 ${reg.items.length}줄\n`);

/* 1. 사용자 입력 문항마다 줄이 있는가 */
const missing = items.filter((i) => !byId.has(i.item_id)).map((i) => i.item_id);
ok("사용자 입력 문항마다 construct 가 적혀 있다 (UNKNOWN_CONSTRUCT 0)",
   missing.length === 0,
   missing.length ? `${missing.length}개: ${missing.slice(0, 5).join(" ")}`
     : `${items.length}문항`);

/* 2. 은행에 없는 문항을 가리키지 않는가 */
const bankIds = new Set(items.map((i) => i.item_id));
const stray = reg.items.filter((r) => !bankIds.has(r.item_id)).map((r) => r.item_id);
ok("등록부가 은행에 없는 문항을 가리키지 않는다", stray.length === 0,
   stray.slice(0, 5).join(" "));

/* 3. primary 가 정확히 하나이고 아는 이름인가 */
const badC = reg.items.filter((r) => !CONSTRUCTS_OK(r.primary));
function CONSTRUCTS_OK(c: string): boolean { return c in COMPATIBLE; }
ok("primary construct 가 등록된 이름 열셋 안에 있다", badC.length === 0,
   badC.map((r) => `${r.item_id}:${r.primary}`).slice(0, 4).join(" "));

/* 4. response type 이 은행의 척도와 같은가 */
const scaleOff = reg.items.filter((r) => {
  const i = items.find((x) => x.item_id === r.item_id);
  if (!i) return false;
  return SCALE_TO_TYPE[i.response_scale ?? ""] !== r.response_type;
});
ok("등록부의 response type 이 은행의 척도와 같다", scaleOff.length === 0,
   scaleOff.map((r) => r.item_id).slice(0, 4).join(" "));

/* 5. **짝 표.** construct 와 response type 이 서로 맞는가 */
const mismatch = reg.items.filter((r) => !compatible(r.primary, r.response_type));
ok("construct 와 response type 이 맞는 짝이다", mismatch.length === 0,
   mismatch.map((r) => `${r.item_id} ${r.primary}×${r.response_type}`).join(" | "));

/* 6. 역방향 문항마다 짝이 있는가 */
const rev = items.filter((i) => i.reverse_flag);
const noPair = rev.filter((r) => !items.some((i) => !i.reverse_flag
  && i.module === r.module && i.evidence_axis === r.evidence_axis));
ok("역방향 문항마다 같은 묶음·축의 정방향 짝이 있다", noPair.length === 0,
   noPair.length ? `${noPair.map((i) => i.item_id).join(" ")} (짝이 없으면 품질 규칙이 돌지 않는다)`
     : `역방향 ${rev.length}개`);

/* 7. 일관성 짝은 서로를 가리키는가 */
const pairs = items.filter((i) => i.consistency_pair);
const brokenPair = pairs.filter((i) => {
  const o = items.find((x) => x.item_id === i.consistency_pair);
  return !o || o.consistency_pair !== i.item_id;
});
ok("일관성 짝이 서로를 가리킨다", brokenPair.length === 0,
   brokenPair.map((i) => i.item_id).join(" "));

/* 8. 짝 표가 construct 열셋을 다 덮는가 */
const uncovered = Object.entries(COMPATIBLE)
  .filter(([, v]) => !v.length).map(([k]) => k);
ok("짝 표가 construct 열셋에 빠진 칸이 없다", uncovered.length === 0,
   uncovered.join(" "));

/* 9. 쓰이는 response type 이 아는 이름인가 */
const scales = [...new Set(items.map((i) => i.response_scale ?? ""))];
const unknownScale = scales.filter((s) => !SCALE_TO_TYPE[s]);
ok("은행의 척도 이름마다 response type 이 있다", unknownScale.length === 0,
   unknownScale.join(" ") || scales.map((s) => `${s}→${SCALE_TO_TYPE[s]}`).join(" · "));

/* 분포 */
console.log("");
const dist = new Map<string, number>();
for (const r of reg.items) {
  const k = `${r.primary} × ${r.response_type}`;
  dist.set(k, (dist.get(k) ?? 0) + 1);
}
for (const [k, v] of [...dist].sort()) {
  console.log(`  ${String(v).padStart(4)}  ${k}`);
}

console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
process.exit(fail ? 1 : 0);
