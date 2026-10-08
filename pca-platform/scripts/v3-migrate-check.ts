/**
 * 옛 문항 은행에서 지금 은행으로 온 길이 실제로 맞는가.
 *
 * **이 검사를 만든 까닭.** 294문항을 전수 감사해서 유지·다시쓰기·이동·
 * 흡수·버림을 적었는데, 그 판정이 새 은행에 반영됐는지는 사람 눈으로
 * 찾을 수 없다. 버리기로 한 문항이 조용히 살아 있거나, 다시 쓰기로 한
 * 문항이 그대로 복사되어도 아무 검사가 걸리지 않는다. 그리고 가장 나쁜
 * 두 가지는 **받고 쓰지 않는 문항**과 **입력이 없는 결과 절**이다: 둘 다
 * 응시자에게는 보이지 않고 결과지에서만 드러난다.
 *
 *   npm run v3:migrate
 */
import { readFileSync } from "node:fs";
import {
  CONTENT_DIR, core, coreFile, registry,
} from "../src/lib/me-v3/core-registry";

type V2Item = {
  item_id: string; module: string; tier: string;
  technical_domain: string | null; evidence_axis: string | null;
  industry_pack: string | null; role_function: string | null;
  measurement_axis: string; origin: string;
  old_item_id: string | null; change_reason: string | null;
};
type Row = {
  v1_item: string; v1_module: string; planned: string | null; actual: string;
  v2_items: string[]; reason: string; agrees: boolean;
};
type Map2 = {
  from: string; to: string;
  verdicts: Record<string, string>;
  divergences: Record<string, string>;
  summary: { v1_items: number; v2_items: number;
             planned: Record<string, number>; actual: Record<string, number>;
             diverged: number; new_in_v2: number };
  rows: Row[];
  new_in_v2: { v2_item: string; reason: string }[];
};

const VERDICTS = ["KEEP", "REWRITE", "MOVE", "MERGE", "DELETE"];

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

function pickCore(): string {
  if (process.env.CORE) return process.env.CORE;
  return registry().cores.filter((c) => c.status === "building")[0].code;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function main(): void {
  const code = pickCore();
  const entry = core(code);
  const mapName = entry.files.migration;
  if (!mapName) throw new Error(`${code} 에 migration 파일이 등록되지 않았습니다`);
  const m = JSON.parse(readFileSync(`${CONTENT_DIR}/${mapName}`, "utf8")) as Map2;

  const frozen = entry.frozen?.[0];
  if (!frozen) throw new Error("등록부에 동결한 지난 판본이 없습니다");
  const v1 = JSON.parse(
    readFileSync(`${CONTENT_DIR}/${frozen.files.items}`, "utf8")) as { items: any[] };
  const bank = coreFile<{ items: V2Item[] }>(code, "items");
  const bp = coreFile<any>(code, "items_blueprint");

  console.log(`  core  ${code} · ${m.from} → ${m.to}\n`);

  const V1 = new Map(v1.items.map((i) => [i.item_id, i]));
  const V2 = new Map(bank.items.map((i) => [i.item_id, i]));
  const byRow = new Map(m.rows.map((r) => [r.v1_item, r]));

  // 1. 옛 문항이 한 줄도 빠지지 않는다
  const missing = [...V1.keys()].filter((id) => !byRow.has(id));
  ok("옛 문항 전부가 표에 있다", missing.length === 0 && m.rows.length === V1.size,
     missing.length ? missing.slice(0, 5).join(" ") : `${m.rows.length} / ${V1.size}`);

  // 2. 표에 없는 옛 문항을 적어 두지 않았다
  const ghost = m.rows.filter((r) => !V1.has(r.v1_item));
  ok("없는 옛 문항을 적어 두지 않았다", ghost.length === 0,
     ghost.map((r) => r.v1_item).join(" "));

  // 3. 판정 값이 다섯 가운데 하나다
  const badVerdict = m.rows.filter((r) => !VERDICTS.includes(r.actual));
  ok("판정 값이 다섯 가운데 하나", badVerdict.length === 0);

  /* 4. 가리키는 새 문항이 실제로 있다.
        흡수는 묶음 이름을 가리킬 수 있다(`GRAD-CORE`): 자리 하나가 아니라
        묶음 전체에 녹아든 자리다 */
  const blocks = new Set((bp.slots as { block: string }[]).map((s) => s.block));
  const dangling: string[] = [];
  for (const r of m.rows) {
    if (r.actual === "DELETE") continue;
    for (const id of r.v2_items) {
      if (!V2.has(id) && !blocks.has(id)) dangling.push(`${r.v1_item}→${id}`);
    }
  }
  ok("가리키는 새 문항이 실제로 있다", dangling.length === 0,
     dangling.length ? dangling.slice(0, 5).join(" ") : `${m.rows.length}줄`);

  /* 5. 버린 문항이 실제로 없다. **가장 중요한 줄이다**: 버리기로 한
        문항이 새 은행에 그대로 살아 있으면 감사가 아무 일도 하지 않은 것이다 */
  const zombie = m.rows.filter((r) => r.actual === "DELETE" && V2.has(r.v1_item));
  ok("버린 문항이 새 은행에 살아 있지 않다", zombie.length === 0,
     zombie.length ? zombie.map((r) => r.v1_item).join(" ")
       : `버린 자리 ${m.rows.filter((r) => r.actual === "DELETE").length}개`);

  // 6. 버린 자리마다 까닭이 있다
  const noWhy = m.rows.filter((r) => r.actual === "DELETE" && (r.reason ?? "").length < 20);
  ok("버린 자리마다 까닭이 적혀 있다", noWhy.length === 0,
     noWhy.map((r) => r.v1_item).join(" "));

  /* 7. 그대로 쓴다고 적은 자리는 문면이 실제로 같다 */
  const notSame = m.rows.filter((r) => r.actual === "KEEP" &&
    r.v2_items.length === 1 &&
    V2.get(r.v2_items[0])?.origin !== "v1_keep");
  ok("그대로 쓴다고 적은 자리는 은행도 그렇게 적혀 있다", notSame.length === 0,
     notSame.map((r) => r.v1_item).join(" "));
  const keepDiff = m.rows.filter((r) => r.actual === "KEEP" &&
    r.v2_items.length === 1 && V2.has(r.v2_items[0]) &&
    (V2.get(r.v2_items[0]) as any).wording !== (V1.get(r.v1_item) as any).wording);
  ok("그대로 쓴 자리의 문면이 실제로 같다", keepDiff.length === 0,
     keepDiff.length ? keepDiff.map((r) => r.v1_item).join(" ")
       : `${m.rows.filter((r) => r.actual === "KEEP").length}개`);

  /* 8. 새 은행이 가리키는 옛 문항이 표에도 있다. 두 자리가 어긋나면
        어느 쪽이 맞는지 알 길이 없다 */
  const orphanBack = bank.items.filter((i) => i.old_item_id && !byRow.has(i.old_item_id));
  ok("새 문항이 가리키는 옛 문항이 표에도 있다", orphanBack.length === 0,
     orphanBack.slice(0, 5).map((i) => i.item_id).join(" "));

  // 9. 판정이 감사와 다른 자리는 갈래마다 까닭이 적혀 있다
  const classes = new Set(m.rows.filter((r) => !r.agrees)
    .map((r) => `${r.planned} → ${r.actual}`));
  const unexplained = [...classes].filter((c) => !m.divergences[c]);
  ok("감사와 다른 판정은 갈래마다 까닭이 적혀 있다", unexplained.length === 0,
     unexplained.length ? unexplained.join(" / ")
       : `갈래 ${classes.size}가지 · 줄 ${m.summary.diverged}개`);

  // 10. 표의 합계가 줄과 맞는다
  const act: Record<string, number> = {};
  for (const r of m.rows) act[r.actual] = (act[r.actual] ?? 0) + 1;
  const sumOk = VERDICTS.every((v) => (m.summary.actual[v] ?? 0) === (act[v] ?? 0));
  ok("표의 합계가 줄과 맞는다", sumOk && m.summary.v2_items === bank.items.length,
     VERDICTS.map((v) => `${v} ${act[v] ?? 0}`).join(" · "));

  /* 11. 새로 쓴 자리마다 까닭이 있다 */
  const newNoWhy = m.new_in_v2.filter((x) => (x.reason ?? "").length < 10);
  ok("새로 쓴 자리마다 까닭이 적혀 있다", newNoWhy.length === 0,
     newNoWhy.length ? newNoWhy.slice(0, 4).map((x) => x.v2_item).join(" ")
       : `${m.new_in_v2.length}개`);

  /* ── 받고 쓰지 않는 문항 0 ──────────────────────────────────────
     Core 문항은 blueprint 자리의 `result_sections` 가 비면 안 되고, 팩
     문항은 산업이나 역할 맥락이 읽는다. 어느 쪽에도 닿지 않는 문항이
     있으면 그 사람은 답을 주고 아무것도 돌려받지 못한다 */
  const slotOf = new Map((bp.slots as any[]).map((s) => [s.id, s]));
  const blockSec = new Map<string, string[]>();
  for (const s of bp.slots as any[]) {
    if (!blockSec.has(s.block)) blockSec.set(s.block, s.result_sections);
  }
  const unread: string[] = [];
  for (const i of bank.items) {
    if (i.module === "INDUSTRY") {
      if (!i.industry_pack || !i.evidence_axis) unread.push(i.item_id);
      continue;
    }
    if (i.module === "ROLE") {
      if (!i.role_function || !i.evidence_axis) unread.push(i.item_id);
      continue;
    }
    const sec = slotOf.get(i.item_id)?.result_sections ?? blockSec.get(i.module);
    if (!sec || sec.length === 0) unread.push(i.item_id);
  }
  ok("받고 쓰지 않는 문항", unread.length === 0,
     unread.length ? `${unread.length}개: ${unread.slice(0, 6).join(" ")}`
       : `0 / ${bank.items.length}`);

  /* ── 입력이 없는 결과 절 0 ─────────────────────────────────────
     결과지의 절마다 그 절을 받치는 문항이 있어야 한다. 없으면 그 절은
     근거 없이 문장을 적는다 */
  const sections = Object.keys(bp.result_sections);
  const fed = new Set((bp.slots as any[]).flatMap((s) => s.result_sections as string[]));
  const dry = sections.filter((x) => !fed.has(x));
  ok("입력이 없는 결과 절", dry.length === 0,
     dry.length ? dry.join(" ") : `0 / ${sections.length}`);

  /* ── 요약 ─────────────────────────────────────────────────────── */
  console.log("\n감사가 적은 판정과 실제 결과\n");
  console.log("  판정       감사    실제");
  for (const v of VERDICTS) {
    console.log(`  ${v.padEnd(9)}${String(m.summary.planned[v] ?? 0).padStart(5)}`
      + `${String(act[v] ?? 0).padStart(8)}`);
  }
  console.log(`  ${"합".padEnd(9)}${String(V1.size).padStart(5)}${String(m.rows.length).padStart(8)}`);
  console.log(`\n  새로 쓴 자리 ${m.new_in_v2.length}개 · 새 은행 ${bank.items.length}문항`);
  console.log("\n감사와 다른 갈래\n");
  for (const c of [...classes].sort()) {
    const n = m.rows.filter((r) => `${r.planned} → ${r.actual}` === c).length;
    console.log(`  ${c.padEnd(22)}${String(n).padStart(4)}개`);
  }

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}

main();
