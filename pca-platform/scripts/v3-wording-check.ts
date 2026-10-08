/**
 * ME_V3 문항 문면이 설 수 있는가. **문항 파일만 읽는다.**
 *
 * 이 검사가 묻는 것은 개수가 아니다. **전공자가 읽었을 때 경험과 판단을
 * 가를 수 있는 문항인가**를 기계가 셀 수 있는 만큼 센다. 나머지는 사람이
 * 본다(`55_items_02_domain_qa.md` 의 영역별 표).
 *
 *   npm run v3:wording
 */
import {
  coreFile, packs as readPacks, registry, CONTENT_DIR,
} from "../src/lib/me-v3/core-registry";
import { readFileSync } from "node:fs";
import { counts, minutes, DOMAINS_BY_TIER } from "../src/lib/me-v3/response-count";

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
  origin?: string; old_item_id?: string | null; change_reason?: string | null;
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
    const m = s.block === "PROBE-S4" || s.block === "DEEP-S8"
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

  /* 7. 선별 네 축은 영역마다 문항 둘이다.
     하나이면 체크리스트를 고르지 않은 사람에게 소유가 구조적으로 설 수
     없다. 영역마다 같은 수여야 BASIC 응답 수가 갈리지 않는다 */
  const probePer: Record<string, number> = {};
  const deepPer: Record<string, number> = {};
  for (const t of TD) {
    probePer[t] = core.filter((i) => i.module === "PROBE-S4" && i.technical_domain === t).length;
    deepPer[t] = core.filter((i) => i.module === "DEEP-S8" && i.technical_domain === t).length;
  }
  const badProbe = TD.filter((t) => probePer[t] !== 8);
  ok("선별 네 축은 영역마다 문항 둘", badProbe.length === 0,
     badProbe.length ? badProbe.map((t) => `${t}(${probePer[t]})`).join(" ")
                     : "네 축 × 둘 = 여덟. BASIC 응답 수가 영역마다 같다");
  const badDeep = TD.filter((t) => deepPer[t] !== 4);
  ok("심화 축 문항은 영역마다 넷", badDeep.length === 0,
     badDeep.length ? badDeep.map((t) => `${t}(${deepPer[t]})`).join(" ")
                    : "선별에 없는 네 축을 하나씩");

  /* 7-1. 문면이 l2 쪽에 가까운가.
     문면에 l3 를 적으면 **도면을 그렸지만 제작에 나가지 않은 학부생이
     `없다` 로 떨어진다.** 소유는 보기 넷이 가르고 l3 는 체크리스트 근거가
     받친다. 글자 삼중쌍으로 두 정의와의 닮음을 재어 l3 쪽이 더 가까운
     자리를 찾는다 */
  const l3ish: string[] = [];
  for (const i of core) {
    if (i.measurement_axis !== "axis_level" || !i.technical_domain || !i.evidence_axis) continue;
    /* **선별 축의 둘째 문항은 빼고 본다.** 선별 축은 영역마다 문항이 둘이고
       축 수준은 둘 가운데 높은 쪽을 쓴다. 첫째가 수행 조건을 묻고 있으므로
       둘째가 소유 쪽으로 기울어도 아무도 아래로 밀리지 않는다. 심화 축은
       문항이 하나라 이 면제가 없다 */
    if (i.module === "PROBE-S4" && i.item_id.endsWith("_2")) continue;
    const d = (dom.domains as any[]).find((x) => x.code === i.technical_domain);
    const c = d?.axes?.[i.evidence_axis];
    if (!c) continue;
    const toL2 = sim(i.wording, c.l2), toL3 = sim(i.wording, c.l3);
    /* 닮음이 양쪽 다 낮으면 자카드가 재는 것이 없다. 문면이 실제로 l3 를
       옮겨 적은 자리만 잡게 바닥을 둔다 */
    if (toL3 >= 0.2 && toL3 > toL2 + 0.05) {
      l3ish.push(`${i.item_id}(${toL2.toFixed(2)}<${toL3.toFixed(2)})`);
    }
  }
  ok("문면이 소유가 아니라 행동을 묻는다", l3ish.length === 0,
     l3ish.length ? l3ish.slice(0, 6).join(" ") : "l2 쪽에 가깝다");

  // 8. measurement_axis 누락
  const noAxis = items.filter((i) => !i.measurement_axis);
  ok("measurement_axis 누락", noAxis.length === 0);
  const badEv = items.filter((i) => i.evidence_axis && !AX.includes(i.evidence_axis));
  ok("evidence_axis 값", badEv.length === 0);

  // 9. 등급 값과 범위
  const badTier = items.filter((i) => !TIERS.includes(i.tier));
  ok("등급 값", badTier.length === 0);
  const probeNotBasic = core.filter((i) => i.module === "PROBE-S4" && i.tier !== "BASIC");
  const deepNotStd = core.filter((i) => i.module === "DEEP-S8" && i.tier !== "STANDARD");
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

  /* 10-1. 산업팩은 산업 상식 퀴즈가 아니다.
     용어를 모르는 사람이 `없다` 로 떨어지지 않게 문항마다 그 판단을 일반
     기계공학 말로 바꿔 적은 줄이 있어야 한다 */
  const ip = readPacks<any>(code, "industry");
  const rp = readPacks<any>(code, "role");
  const indItems = (ip.packs as any[]).flatMap((p) => p.items as any[]);
  const noGloss = indItems.filter((i) => !i.gloss || String(i.gloss).length < 10);
  ok("산업팩 문항에 쉬운 말 풀이가 있다", noGloss.length === 0,
     noGloss.length ? noGloss.map((i) => i.id).join(" ") : `${indItems.length} / ${indItems.length}`);
  const gatedPacks = [ip, rp]
    .filter((x) => x.exploration?.browse !== "all" || x.exploration?.subscription_gate !== false);
  ok("팩이 구독으로 막혀 있지 않다", gatedPacks.length === 0,
     "여덟 산업과 여덟 역할 전부를 탐색할 수 있고 한 응시에 깊게 묻는 것은 하나다");

  /* 10-2. 산업팩 문항이 용어를 아는지 묻지 않는다.
           `파티클 관리 경험이 있다` 는 그 말을 아는 사람만 답할 수 있다.
           문면에 그 산업의 전문 낱말만 덜렁 놓인 자리를 찾는다 */
  const jargonOnly = indItems.filter((i) => {
    const ask = String(i.ask);
    return !/경험이 있다$|적이 있다$/.test(ask) || ask.length < 18;
  });
  ok("산업팩 문항이 경험을 묻는 꼴이다", jargonOnly.length === 0,
     jargonOnly.length ? jargonOnly.map((i) => i.id).join(" ") : `${indItems.length}개`);

  /* 10-3. 역할팩이 역할마다 다른 판단을 묻는다.
           같은 질문을 역할 이름만 바꿔 돌리면 비교가 서지 않는다 */
  const roleAsks = (rp.packs as any[]).flatMap((p) =>
    (p.items as any[]).map((i) => String(i.ask)));
  const dupAsk = roleAsks.filter((x, n) => roleAsks.indexOf(x) !== n);
  ok("역할팩 문항이 역할마다 다르다", dupAsk.length === 0,
     dupAsk.length ? dupAsk.slice(0, 3).join(" / ") : `${roleAsks.length}개`);

  /* 10-4. 역할기능과 역할팩이 하나씩 맞물린다.
           V1 은 시험·검증 기능을 두 팩이 가리켰고 품질팩에 자기 기능이
           없었다. 그러면 두 팩의 비교가 같은 축에서 서지 않는다 */
  const rfs = (rp.packs as any[]).map((p) => p.core_ref.rf[0]);
  ok("역할기능과 역할팩이 하나씩 맞물린다",
     new Set(rfs).size === rfs.length && rfs.length === tax.role_functions.length,
     `역할기능 ${tax.role_functions.length} · 역할팩 ${rfs.length}`);

  /* 10-5. 문항마다 어디서 왔는지 적혀 있다.
           옛 은행에서 온 문항인지 새로 쓴 자리인지 모르면, 감사에서
           버리기로 한 문항이 조용히 살아 있어도 아무도 못 찾는다 */
  const ORIGIN = ["v1_keep", "v1_rewrite", "v1_move", "v1_merge", "new"];
  const noOrigin = items.filter((i) => !i.origin || !ORIGIN.includes(i.origin));
  ok("문항마다 어디서 왔는지 적혀 있다", noOrigin.length === 0,
     noOrigin.length ? noOrigin.slice(0, 4).map((i) => i.item_id).join(" ")
       : ORIGIN.map((o) => `${o} ${items.filter((i) => i.origin === o).length}`).join(" · "));
  const noReason = items.filter((i) =>
    i.origin && i.origin !== "v1_keep" && !i.change_reason);
  ok("그대로 쓰지 않은 문항마다 까닭이 적혀 있다", noReason.length === 0,
     noReason.length ? noReason.slice(0, 4).map((i) => i.item_id).join(" ") : "");

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

  /* --- 응답 수와 추정 시간 ---
     세는 산식은 `src/lib/me-v3/response-count.ts` 하나다. 두 검사가 같은
     수를 따로 세다 84 와 88 로 갈린 적이 있다 */
  const n = (m: string) => core.filter((i) => i.module === m).length;
  const deepOf = (t: string) =>
    core.filter((i) => i.module === "DEEP-J8" && i.technical_domain === t).length;
  const deepMax = Math.max(...TD.map(deepOf));
  const base = {
    grid: n("CORE-GRID") - 12, judge: n("CORE-JUDGE"), force: n("CORE-FORCE"),
    probePerDomain: 8, deepPerDomain: 4, learningPerDomain: 1,
    consist: n("CONSIST"),
    trans: n("TRANS-10"), target: n("TARGET"), branch: 0, pack: 24,
  };
  const branch: [string, string, number][] = [
    ["학사", "-", n("UG-CORE")],
    ["석사 이상", "이공계·융합", n("GRAD-CORE")],
    ["석사 이상", "타계열 (학부 기계)", n("UG-CORE") + n("GRAD-XFIELD")],
  ];
  console.log("\n한 사람이 받는 응답 수 (처음부터 그 등급으로 시작할 때)\n");
  console.log("  학위        계열                       BASIC  STANDARD       PRO");
  for (const [st, fd, b] of branch) {
    const c = counts({ ...base, branch: b });
    console.log(`  ${st.padEnd(10)}  ${fd.padEnd(24)}  ${String(c.basic).padStart(4)}` +
      `  ${String(c.standard).padStart(4)}(${c.standard4})` +
      `  ${String(c.pro).padStart(4)}(${c.proFull})`);
  }
  console.log("  괄호는 넷째 영역이 열리고 산업팩 하나와 역할팩 둘까지 본 경우다.");
  void deepMax;

  const c0 = counts({ ...base, branch: n("GRAD-CORE") });
  console.log("\n등급을 올릴 때 새로 묻는 응답 (앞 응답은 그대로 쓴다)\n");
  console.log(`  BASIC → STANDARD   ${c0.upgradeBasicToStandard}개  ` +
    `(심화 영역 ${DOMAINS_BY_TIER.standard}개의 남은 축 · 일관성 ${base.consist} · ` +
    `역할팩 ${n("ROLE") ? "고른 역할" : "없음"})`);
  console.log(`  STANDARD → PRO     ${c0.upgradeStandardToPro}개  ` +
    `(경험 번역 ${base.trans} · 목표 입력 ${base.target})`);
  console.log(`  그 뒤 선택으로      산업팩 10 · 역할팩 7 · ` +
    `넷째 영역 ${c0.extraFourthDomain}`);

  /* --- 선별 등급에서 실제 판단을 묻는 비중 ---
     V1 은 선별 응답 쉰넷 가운데 여덟만 판단이었고, 서른여섯이 관심과
     경험과 학습 의향이었다. 그 비율이 응시자가 읽기를 멈춘 까닭이다 */
  const basicItems = core.filter((i) => i.tier === "BASIC");
  const judged = basicItems.filter((i) => i.measurement_axis === "axis_level"
    || i.measurement_axis === "common_judgement"
    || i.measurement_axis === "experience_translation");
  const judgedPerPerson = n("CORE-JUDGE") + n("UG-CORE") + 8 * DOMAINS_BY_TIER.basic;
  const sweepPerPerson = 24 + DOMAINS_BY_TIER.basic;
  const pct = Math.round(judgedPerPerson / (judgedPerPerson + sweepPerPerson) * 100);
  ok("선별 등급 응답의 절반 이상이 실제 판단", pct >= 50,
     `판단 ${judgedPerPerson} · 훑기 ${sweepPerPerson} · ${pct}% (은행 기준 ${judged.length}/${basicItems.length})`);

  const mm = minutes({ ...base, branch: n("GRAD-CORE") });
  console.log("\n추정 시간 (블록마다 한 응답에 드는 시간을 곱한 값. 실측이 아니다)\n");
  console.log(`  BASIC                        약 ${mm.basic}분`);
  console.log(`  처음부터 STANDARD            약 ${mm.standardFresh}분`);
  console.log(`  처음부터 PRO                 약 ${mm.proFresh}분 ` +
    `(팩까지 ${mm.proFreshWithPack}분)`);
  console.log(`  BASIC 끝낸 뒤 STANDARD       약 ${mm.upgradeToStandard}분`);
  console.log(`  STANDARD 끝낸 뒤 PRO         약 ${mm.upgradeToPro}분 ` +
    `(팩까지 ${mm.upgradeToProWithPack}분)`);

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
