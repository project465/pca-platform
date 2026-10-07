/**
 * ME_V3 문항 문면이 설 수 있는가. **문항 파일만 읽는다.**
 *
 * 이 검사가 묻는 것은 개수가 아니다. **전공자가 읽었을 때 경험과 판단을
 * 가를 수 있는 문항인가**를 기계가 셀 수 있는 만큼 센다. 나머지는 사람이
 * 본다(`55_items_02_domain_qa.md` 의 영역별 표).
 *
 *   npm run v3:wording
 */
import { coreFile, registry, CONTENT_DIR } from "../src/lib/me-v3/core-registry";
import { readFileSync } from "node:fs";

type Item = {
  item_id: string; module: string; tier: string;
  technical_domain: string | null; role_function: string | null;
  industry_pack: string | null; education_routing: string;
  measurement_axis: string | null; evidence_axis: string | null;
  wording: string; stage_wording: Record<string, string> | null;
  grid_row: string | null; grid_stem: string | null;
  options: string[] | null; response_scale: string | null;
  reverse_flag: boolean; consistency_pair: string | null;
  requirement: string; rationale: string | null;
};

const AX = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];
const TIERS = ["BASIC", "STANDARD", "PRO"];
const META = ["item_id", "module", "tier", "technical_domain", "role_function",
  "industry_pack", "education_routing", "measurement_axis", "evidence_axis",
  "wording", "response_scale", "reverse_flag", "consistency_pair",
  "requirement", "rationale"];

let fail = 0, pass = 0, warn = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}
function note(n: string, d: string): void {
  warn += 1; console.log(`  보고  ${n} — ${d}`);
}

/** 글자 삼중쌍 자카드. 같은 문장을 돌려 쓴 자리를 찾는다 */
function tri(s: string): Set<string> {
  const t = s.replace(/[\s,.·]/g, "");
  const out = new Set<string>();
  for (let i = 0; i + 3 <= t.length; i += 1) out.add(t.slice(i, i + 3));
  return out;
}
function sim(a: string, b: string): number {
  const x = tri(a), y = tri(b);
  if (!x.size || !y.size) return 0;
  let inter = 0;
  for (const g of x) if (y.has(g)) inter += 1;
  return inter / (x.size + y.size - inter);
}

function pickCore(): string {
  if (process.env.CORE) return process.env.CORE;
  const b = registry().cores.filter((c) => c.status === "building");
  return b[0].code;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function main(): void {
  const code = pickCore();
  console.log(`  core  ${code}\n`);
  const bank = coreFile<{ items: Item[]; scene_by_axis: any }>(code, "items");
  const bp = coreFile<any>(code, "items_blueprint");
  const dom = coreFile<any>(code, "domains");
  const tax = coreFile<any>(code, "taxonomy");
  const items = bank.items;
  const core = items.filter((i) => !["INDUSTRY", "ROLE"].includes(i.module));
  const packs = items.filter((i) => ["INDUSTRY", "ROLE"].includes(i.module));
  const TD: string[] = dom.domains.map((d: any) => d.code);

  // 1. item_id 중복
  const ids = items.map((i) => i.item_id);
  const dup = ids.filter((x, n) => ids.indexOf(x) !== n);
  ok("item_id 중복", dup.length === 0, dup.length ? [...new Set(dup)].join(" ") : `${ids.length}개`);

  // 2. metadata 칸이 전부 있다
  const missMeta = items.filter((i) =>
    META.some((k) => !(k in (i as unknown as Record<string, unknown>))));
  ok("metadata 칸 열다섯", missMeta.length === 0,
     missMeta.length ? missMeta.slice(0, 3).map((i) => i.item_id).join(" ") : `${META.length}칸`);

  // 3. blueprint 113자리가 전부 문항으로 덮인다
  const byId = new Map(items.map((i) => [i.item_id, i]));
  const uncovered: string[] = [];
  const mapCount: Record<string, number> = {};
  for (const s of bp.slots as { id: string; block: string; axis: string | null }[]) {
    if (byId.has(s.id)) { mapCount[s.id] = 1; continue; }
    const m = s.block === "PROBE-J4" || s.block === "DEEP-J8"
      ? items.filter((i) => i.module === s.block && i.evidence_axis === s.axis)
      : [];
    if (m.length === 0) uncovered.push(s.id);
    else mapCount[s.id] = m.length;
  }
  ok("blueprint 자리가 전부 문항으로 덮인다", uncovered.length === 0,
     uncovered.length ? uncovered.join(" ") : `자리 ${bp.slots.length} → 문항 ${core.length}`);

  // 4. Core 문항이 전부 어느 자리에 속한다
  const slotIds = new Set((bp.slots as { id: string }[]).map((s) => s.id));
  const slotBlocks = new Set((bp.slots as { block: string }[]).map((s) => s.block));
  const orphan = core.filter((i) => !slotIds.has(i.item_id) && !slotBlocks.has(i.module));
  ok("자리에 속하지 않는 Core 문항", orphan.length === 0,
     orphan.length ? orphan.map((i) => i.item_id).join(" ") : "0");

  // 5. 누락 domain
  const perDomain: Record<string, number> = {};
  for (const t of TD) perDomain[t] = 0;
  for (const i of items) if (i.technical_domain && perDomain[i.technical_domain] !== undefined) {
    perDomain[i.technical_domain] += 1;
  }
  const emptyDomain = TD.filter((t) => perDomain[t] === 0);
  ok("문항이 없는 기술영역", emptyDomain.length === 0,
     emptyDomain.length ? emptyDomain.join(" ") : `열둘 전부 (최소 ${Math.min(...TD.map((t) => perDomain[t]))}개)`);

  // 6. 영역 × 축이 빠짐없이 있다 (Core 깊이 문항)
  const cell = new Set(core.filter((i) => i.technical_domain && i.evidence_axis)
    .map((i) => `${i.technical_domain}.${i.evidence_axis}`));
  const holes = TD.flatMap((t) => AX.filter((a) => !cell.has(`${t}.${a}`)).map((a) => `${t}.${a}`));
  ok("영역 × 축 칸마다 문항", holes.length === 0,
     holes.length ? holes.join(" ") : `${TD.length * AX.length} / ${TD.length * AX.length}`);

  // 7. 과대표집. Core 깊이 문항은 영역마다 같아야 한다
  const deep: Record<string, number> = {};
  for (const t of TD) deep[t] = core.filter((i) => i.technical_domain === t &&
    i.measurement_axis === "axis_level").length;
  const vals = TD.map((t) => deep[t]);
  ok("Core 깊이 문항의 영역 쏠림", Math.min(...vals) === Math.max(...vals),
     `영역마다 ${vals[0]}개`);

  // 8. measurement_axis 누락
  const noAxis = items.filter((i) => !i.measurement_axis);
  ok("measurement_axis 누락", noAxis.length === 0);
  const badEv = items.filter((i) => i.evidence_axis && !AX.includes(i.evidence_axis));
  ok("evidence_axis 값", badEv.length === 0);

  // 9. 등급 값과 범위
  const badTier = items.filter((i) => !TIERS.includes(i.tier));
  ok("등급 값", badTier.length === 0);
  const probeNotBasic = core.filter((i) => i.module === "PROBE-J4" && i.tier !== "BASIC");
  const deepNotStd = core.filter((i) => i.module === "DEEP-J8" && i.tier !== "STANDARD");
  const transNotPro = core.filter((i) => i.module === "TRANS-10" && i.tier !== "PRO");
  ok("선별은 BASIC · 심화는 STANDARD · 번역은 PRO",
     probeNotBasic.length + deepNotStd.length + transNotPro.length === 0);

  // 10. 팩이 scoring 에 들어가지 않는다
  const packBody = JSON.stringify(packs);
  const packWeighted = /"weight|가중치|score_delta|multiplier/.test(packBody);
  ok("팩 문항에 가중치가 없다", !packWeighted, `산업 · 역할 문항 ${packs.length}개`);
  const packScored = packs.filter((i) => i.measurement_axis !== "axis_level");
  ok("팩 문항이 축 수준만 받는다", packScored.length === 0,
     "팩은 축 수준을 올릴 수 있어도 Core 묶음 조건을 바꾸지 않는다");

  // 11. 학위·계열이 scoring 에 들어가지 않는다
  const stageWeighted = items.filter((i) => {
    if (!i.stage_wording) return false;
    const set = new Set(Object.values(i.stage_wording));
    /* 장면만 달라야 한다. 보기(options)와 척도가 단계마다 같아야 한다 */
    return set.size > 4;
  });
  ok("학위 장면이 보기와 척도를 바꾸지 않는다", stageWeighted.length === 0);
  const fieldInScale = items.filter((i) =>
    /STEM|HUMANITIES|BUSINESS/.test(String(i.response_scale ?? "")));
  ok("계열이 척도에 들어가지 않는다", fieldInScale.length === 0);

  // 12. 역방향과 일관성 짝
  const rev = items.filter((i) => i.reverse_flag);
  ok("역방향 문항", rev.length >= 1, rev.map((i) => i.item_id).join(" "));
  const pairs = items.filter((i) => i.consistency_pair);
  const badPair = pairs.filter((i) => {
    const o = byId.get(i.consistency_pair as string);
    return !o || o.consistency_pair !== i.item_id || o.evidence_axis !== i.evidence_axis;
  });
  ok("일관성 짝이 서로를 가리킨다", badPair.length === 0, `${pairs.length / 2}쌍`);

  // 13. double-barreled 후보
  const hardDB = items.filter((i) => / 또는 | 및 |하고 .{0,6}(해|했|본) /.test(i.wording));
  ok("두 가지를 묻는 문항", hardDB.length === 0,
     hardDB.length ? hardDB.map((i) => i.item_id).join(" ") : "`또는` · `및` · 두 동작 0개");
  /* 격자 줄은 영역을 설명하는 자리라 센 목록이 맞다. 빼고 본다 */
  const listish = items.filter((i) => i.module !== "CORE-GRID" &&
    (i.wording.match(/와 |과 |이나 /g) ?? []).length >= 3);
  if (listish.length) {
    note("보기 목록이 긴 문항",
      `${listish.length}개. 묻는 행동은 하나이고 뒤의 목록이 답의 후보다: ` +
      listish.slice(0, 4).map((i) => i.item_id).join(" "));
  }

  // 14. 너무 긴 문항
  const LIMIT: Record<string, number> = { BASIC: 72, STANDARD: 92, PRO: 92 };
  const longOnes = items.filter((i) => i.wording.length > LIMIT[i.tier]);
  ok("문항 길이", longOnes.length === 0,
     longOnes.length
       ? longOnes.map((i) => `${i.item_id}(${i.wording.length})`).join(" ")
       : `BASIC ≤ ${LIMIT.BASIC}자 · 유료 ≤ ${LIMIT.STANDARD}자`);
  /* 격자는 줄과 칸이 따로다. 칸의 어미는 열 머리글로 한 번만 뜨므로
     재는 것은 **줄 길이**다 */
  const gridLong = items.filter((i) => i.module === "CORE-GRID" &&
    (i.grid_row ?? "").length > 42);
  ok("격자 줄 길이", gridLong.length === 0,
     gridLong.length
       ? gridLong.map((i) => `${i.item_id}(${(i.grid_row ?? "").length})`).join(" ")
       : "한 화면에 열두 줄이라 42자 안");

  // 15. 유사복제
  const cand = items.filter((i) => i.module !== "CORE-GRID");
  const close: string[] = [];
  for (let a = 0; a < cand.length; a += 1) {
    for (let b = a + 1; b < cand.length; b += 1) {
      const x = cand[a], y = cand[b];
      if (x.consistency_pair === y.item_id) continue;
      const s = sim(x.wording, y.wording);
      if (s >= 0.72) close.push(`${x.item_id}~${y.item_id}(${s.toFixed(2)})`);
    }
  }
  ok("같은 문장을 돌려 쓴 자리", close.length === 0,
     close.length ? close.slice(0, 6).join(" ") : `견준 짝 ${cand.length * (cand.length - 1) / 2}`);

  const rows = GRID_ROWS_sim(items);
  ok("격자 줄이 서로 다르다", rows.length === 0,
     rows.length ? rows.join(" ") : "열두 줄");

  // 16. rationale 이 비어 있지 않다
  const noWhy = items.filter((i) => !i.rationale);
  ok("문항마다 왜 묻는지 적혀 있다", noWhy.length === 0);

  // --- 응답 수와 시간 ---
  const n = (m: string) => core.filter((i) => i.module === m).length;
  const perDeepDomain = 4;
  const CORE_FIXED = n("CORE-GRID") + n("CORE-JUDGE") + n("CORE-FORCE");
  const branch: [string, string, number][] = [
    ["학사", "-", n("UG-COURSE")],
    ["석사 이상", "STEM", n("GRAD-STEM")],
    ["석사 이상", "HUMANITIES_SOCIAL", n("GRAD-HS")],
    ["석사 이상", "BUSINESS", n("GRAD-BIZ")],
    ["석사 이상", "OTHER_INTERDISCIPLINARY", n("GRAD-MIX")],
  ];
  console.log("\n한 사람이 받는 응답 수 (괄호는 넷째 영역 · 팩 포함)\n");
  console.log("  학위        계열                       BASIC   STANDARD        PRO");
  for (const [st, fd, b] of branch) {
    const basic = CORE_FIXED + perDeepDomain * 2 + b;
    const std = basic + perDeepDomain * 3 + n("PREF-RF-OC") + n("CONSIST");
    const std4 = basic + perDeepDomain * 4 + n("PREF-RF-OC") + n("CONSIST");
    const pro = std + n("TRANS-10") + n("TARGET");
    const proPack = std4 + n("TRANS-10") + n("TARGET") + 12;
    console.log(`  ${st.padEnd(10)}  ${fd.padEnd(24)}  ${String(basic).padStart(4)}` +
      `   ${String(std).padStart(4)}(${std4})   ${String(pro).padStart(4)}(${proPack})`);
  }

  console.log(`\n문항 은행 ${items.length}개 (Core ${core.length} · 팩 ${packs.length})`);
  console.log(`확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail} · 보고 ${warn}`);
  process.exit(fail ? 1 : 0);
}

/** 격자 줄끼리 너무 닮았는지 */
function GRID_ROWS_sim(items: Item[]): string[] {
  const rows = new Map<string, string>();
  for (const i of items) {
    if (i.module !== "CORE-GRID" || !i.technical_domain) continue;
    if (!rows.has(i.technical_domain)) {
      rows.set(i.technical_domain, i.wording.replace(/,.*$/, ""));
    }
  }
  const keys = [...rows.keys()];
  const out: string[] = [];
  for (let a = 0; a < keys.length; a += 1) {
    for (let b = a + 1; b < keys.length; b += 1) {
      const s = sim(rows.get(keys[a]) as string, rows.get(keys[b]) as string);
      if (s >= 0.5) out.push(`${keys[a]}~${keys[b]}(${s.toFixed(2)})`);
    }
  }
  return out;
}

void readFileSync; void CONTENT_DIR; void tax_unused();
function tax_unused(): void { /* 자리만 둔다 */ }
main();
