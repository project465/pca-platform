/**
 * 응시 화면이 문항을 빠짐없이 세우는가. **DB 없이 계획만으로 센다.**
 *
 * 묻는 것: 은행의 문항이 전부 어느 화면엔가 서는가 · 선 문항은 전부
 * 보기를 받는가 · 화면에 내부 코드가 새지 않는가 · 한 화면에 한 문항인가 ·
 * 고르기 전에 팩 문항이 열리지 않는가.
 *
 * 첫 번째가 이 검사를 만든 까닭이다. 조직 선호 일곱(`PO_OC1`~`PO_OC7`)이
 * **어느 화면에도 서지 않고 있었다**: 화면이 `PR_OC` 로 찾고 있었고 은행의
 * 번호는 `PO_OC` 였다. 문항을 쓴 사람도 화면을 짠 사람도 눈으로는 못 찾는다.
 *
 *   npm run v3:ui
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of (() => {
  try { return readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n"); }
  catch { return [] as string[]; }
})()) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { buildPlan, type Plan } from "../src/lib/me-v3/runtime/blocks";
import { controlOf, type MenuContext } from "../src/lib/me-v3/runtime/menus";
import { branchBlock, crossField } from "../src/lib/me-v3/runtime/routing";
import {
  content, domainName, gridRowOf, industryChoices, industryGloss, industryScene,
  itemOf, levelOptions, orgChoices, roleChoices, roleName, wordingOf,
} from "../src/lib/me-v3/runtime/session";
import type { GradField, Stage, Tier } from "../src/lib/me-v3/scoring/types";

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

const TDS = content().domains.domains.map((d) => d.code);
const ITEMS = content().bank.items;

function ctx(tied: string[]): MenuContext {
  return {
    tiedPair: tied.map((code) => ({ code, name: domainName(code) })),
    domains: TDS.map((code) => ({ code, name: domainName(code) })),
    industries: industryChoices().map((i) => ({ code: i.code, name: i.name })),
    roles: roleChoices().map((r) => ({ code: r.code, name: r.name })),
    orgs: orgChoices().map((o) => ({ code: o.code, name: o.name })),
  };
}

const DEPS = {
  items: ITEMS, domainName, wording: wordingOf, gridRow: gridRowOf,
  scene: industryScene, gloss: industryGloss, roleName,
};

function plan(args: {
  tier: Tier; stage: Stage; field: GradField | null;
  probe: string[]; deep: string[];
  industry?: string[] | null; role?: string[] | null; tied?: string[];
}): Plan {
  return buildPlan({
    tier: args.tier, stage: args.stage,
    branchBlock: branchBlock(args.stage, args.field),
    crossField: crossField(args.stage, args.field),
    probe: args.probe, deep: args.deep,
    industryInterest: args.industry ?? [],
    roleInterest: args.role ?? [],
    tiedPair: args.tied ?? [],
  }, DEPS);
}

/** 화면에 **보이는 글자** 전부. 내부 코드를 여기서 찾는다 */
function visible(p: Plan, tied: string[]): string[] {
  const out: string[] = [];
  for (const s of p.screens) {
    out.push(s.eyebrow ?? "", s.subject ?? "", s.question ?? "", s.help ?? "");
    for (const id of s.items) {
      out.push(wordingOf(id, "bachelor"));
      const it = itemOf(id);
      if (!it) continue;
      const c = controlOf(it, ctx(tied));
      if (c.kind === "level") out.push(...c.options);
      else if (c.kind === "scale5") out.push(...c.labels);
      else if (c.kind === "exposure") out.push(...c.options);
      else if (c.kind === "pick3") out.push(...c.options.map((o) => o.label));
      else out.push(...c.options.map((o) => o.label), c.note?.label ?? "");
    }
  }
  return out.filter(Boolean);
}

const INTERNAL = [
  /\bTD\d{2}\b/, /\bJ[1-8]\b/, /\b[A-Z]{2,3}_[A-Z0-9_]{2,}\b/,
  /ME_V3|ME_CORE|ITEM_BANK/,
];

function main(): void {
  /* --- 1. 은행의 문항이 전부 어느 화면엔가 선다 --- */
  const seen = new Set<string>();
  const tiers: Tier[] = ["BASIC", "STANDARD", "PRO"];
  const branches: [Stage, GradField | null][] = [
    ["bachelor", null], ["master", "STEM"], ["master", "HUMANITIES_SOCIAL"],
    ["master", "BUSINESS"], ["phd", "OTHER_INTERDISCIPLINARY"],
  ];
  for (const tier of tiers) {
    for (const [stage, field] of branches) {
      for (const ind of [[], ...industryChoices().map((x) => [x.code])]) {
        for (const role of [[], ...roleChoices().map((x) => [x.code])]) {
          const p = plan({
            tier, stage, field, probe: TDS, deep: TDS,
            industry: ind, role, tied: [TDS[0], TDS[1]],
          });
          for (const s of p.screens) for (const id of s.items) seen.add(id);
        }
      }
    }
  }
  const orphan = ITEMS.filter((i) => !seen.has(i.item_id)).map((i) => i.item_id);
  ok("은행의 문항이 전부 어느 화면엔가 선다", orphan.length === 0,
     orphan.length ? `서지 않는 문항 ${orphan.length}: ${orphan.slice(0, 6).join(",")}`
       : `${seen.size}개`);

  /* --- 2. 선 문항은 전부 보기를 받는다 --- */
  const noMenu: string[] = [];
  for (const id of seen) {
    const it = itemOf(id);
    if (!it) { noMenu.push(id); continue; }
    try { controlOf(it, ctx([TDS[0], TDS[1]])); } catch { noMenu.push(id); }
  }
  ok("화면에 선 문항은 전부 보기를 받는다", noMenu.length === 0,
     noMenu.length ? noMenu.slice(0, 5).join(",") : `${seen.size}개`);

  /* --- 3. 보기 넷은 은행의 것을 그대로 쓴다 --- */
  const lv = levelOptions();
  const lvItem = itemOf("TD01_J3_1");
  const c3 = lvItem ? controlOf(lvItem, ctx([])) : null;
  ok("보기 넷은 문항 은행의 것을 그대로 쓴다",
     !!c3 && c3.kind === "level" && c3.options.join("|") === lv.join("|"),
     lv.join(" · "));

  /* --- 4. 훑기는 보기 셋이고 저장되는 값이 전과 같다 --- */
  const gi = itemOf("G_TD01_INT");
  const ge = itemOf("G_TD01_EXP");
  const ci = gi ? controlOf(gi, ctx([])) : null;
  const ce = ge ? controlOf(ge, ctx([])) : null;
  ok("훑기는 보기 셋이고 저장되는 값이 전과 같다",
     !!ci && ci.kind === "pick3" && ci.options.length === 3 &&
     ci.answer === "scale5" &&
     ci.options.map((o) => o.value).join(",") === "5,3,1" &&
     !!ce && ce.kind === "pick3" && ce.answer === "exposure" &&
     ce.options.map((o) => o.value).join(",") === "2,1,0",
     "관심은 5·3·1 · 경험은 2·1·0");

  /* --- 5. 화면에 내부 코드가 새지 않는다 --- */
  const pPro = plan({
    tier: "PRO", stage: "master", field: "STEM",
    probe: TDS.slice(0, 4), deep: TDS.slice(0, 4),
    industry: [industryChoices()[0].code], role: [roleChoices()[0].code],
    tied: [TDS[0], TDS[1]],
  });
  const leaked = visible(pPro, [TDS[0], TDS[1]])
    .map((t) => INTERNAL.map((re) => (t.match(re) ?? [])[0]).filter(Boolean)[0])
    .filter(Boolean);
  ok("화면 문면에 내부 코드가 없다", leaked.length === 0,
     leaked.length ? leaked.slice(0, 5).join(",") : "머리말·주제·질문·도움말·보기");

  /* --- 6. 한 화면에 한 문항 --- */
  const many = pPro.screens.filter((s) => s.items.length > 1 && s.kind !== "sweep");
  ok("한 화면에 한 문항이다", many.length === 0,
     many.length ? many.map((s) => s.id).join(",") : "영역 훑기만 예외");

  /* --- 7. BASIC 은 심화와 번역과 팩 문항을 열지 않는다 --- */
  const pBasic = plan({
    tier: "BASIC", stage: "bachelor", field: null,
    probe: TDS.slice(0, 2), deep: [],
    industry: [industryChoices()[0].code], role: [roleChoices()[0].code],
  });
  const basicStages = new Set(pBasic.screens.map((s) => s.stage));
  const basicPackItems = pBasic.screens.filter((s) =>
    s.id.startsWith("ind-") || s.id.startsWith("role-"));
  ok("BASIC 에는 심화와 번역 화면과 팩 문항이 없다",
     !basicStages.has("DEEP") && !basicStages.has("TRANSLATE") &&
     basicPackItems.length === 0,
     [...basicStages].join(","));

  /* --- 8. 강제 선택은 묶였을 때만 서고 보기가 그 두 영역이다 --- */
  const noTie = plan({ tier: "BASIC", stage: "bachelor", field: null,
    probe: TDS.slice(0, 2), deep: [] });
  const withTie = plan({ tier: "BASIC", stage: "bachelor", field: null,
    probe: TDS.slice(0, 2), deep: [], tied: [TDS[2], TDS[5]] });
  const force = withTie.screens.find((s) => s.id.startsWith("force-"));
  const fc = force ? controlOf(itemOf(force.items[0])!, ctx([TDS[2], TDS[5]])) : null;
  ok("강제 선택은 묶였을 때만 서고 보기가 그 두 영역이다",
     !noTie.screens.some((s) => s.id.startsWith("force-")) && !!force &&
     !!fc && fc.kind === "choice" && fc.options.length === 2 &&
     fc.options[0].label === domainName(TDS[2]),
     fc && fc.kind === "choice" ? fc.options.map((o) => o.label).join(" / ") : "");

  /* --- 9. 선호를 다섯 점 척도로 받지 않는다 --- */
  const five = ITEMS.filter((i) => i.response_scale === "5점");
  ok("선호를 다섯 점 척도로 받는 문항이 없다", five.length === 0,
     five.length ? five.map((i) => i.item_id).join(",")
       : "관심 역할과 선호 조직은 고르기로 받는다");

  /* --- 10. 산업 여덟과 역할 여덟 전부를 고를 수 있다 --- */
  ok("산업 여덟과 역할 여덟 전부를 고를 수 있다",
     industryChoices().length === 8 && roleChoices().length === 8 &&
     industryChoices().every((x) => x.name && x.first) &&
     roleChoices().every((x) => x.name && x.domains.length),
     `산업 ${industryChoices().length} · 역할 ${roleChoices().length}`);

  /* --- 11. 고르기 전에는 팩 문항이 계획에 없다 --- */
  const noPack = plan({ tier: "PRO", stage: "master", field: "STEM",
    probe: TDS.slice(0, 3), deep: TDS.slice(0, 3), industry: [], role: [] });
  const packScreens = noPack.screens.filter((s) =>
    s.id.startsWith("ind-") || s.id.startsWith("role-"));
  ok("고르기 전에는 팩 문항이 화면에 없다", packScreens.length === 0,
     `고른 뒤 ${pPro.screens.filter((s) => s.id.startsWith("ind-") || s.id.startsWith("role-")).length}개`);

  /* --- 12. 화면 이름이 겹치지 않는다 --- */
  const ids = pPro.screens.map((s) => s.id);
  ok("화면 이름이 겹치지 않는다", new Set(ids).size === ids.length,
     `${ids.length}개`);

  /* --- 13. 영역 훑기는 두 화면이고 줄마다 영역 이름이 있다 --- */
  const sweeps = pBasic.screens.filter((s) => s.kind === "sweep");
  const fixed = sweeps.filter((s) => s.items.length === TDS.length);
  ok("영역 훑기는 두 화면으로 접힌다",
     fixed.length === 2 && sweeps.length <= 3,
     `열두 줄 화면 ${fixed.length}개 · 학습 의향까지 ${sweeps.length}개`);
  const rows = sweeps.flatMap((s) => s.items)
    .every((id) => !!itemOf(id)?.grid_row);
  ok("훑기 줄마다 영역을 말하는 줄이 있다", rows);

  /* --- 14. 심화 영역은 선별 네 축도 함께 선다 --- */
  const deepOnly = plan({ tier: "STANDARD", stage: "bachelor", field: null,
    probe: TDS.slice(0, 3), deep: TDS.slice(0, 3) });
  const axesOf = (td: string) => new Set(deepOnly.screens
    .filter((s) => s.domain === td)
    .flatMap((s) => s.items).map((id) => itemOf(id)?.evidence_axis).filter(Boolean));
  ok("심화 영역은 여덟 축을 모두 받는다",
     TDS.slice(0, 3).every((td) => axesOf(td).size === 8),
     TDS.slice(0, 3).map((td) => `${domainName(td)}:${axesOf(td).size}`).join(" · "));

  /* --- 15. 필수 화면은 답을 받을 자리가 있다 --- */
  const badRequired = pPro.screens.filter((s) =>
    s.required && s.items.length === 0 && s.kind !== "profile");
  ok("답을 받지 않는 화면을 필수로 두지 않는다", badRequired.length === 0,
     badRequired.map((s) => s.id).join(","));

  /* --- 16. 자동으로 넘어가는 화면은 한 선택으로 끝나는 자리뿐이다 --- */
  const badAuto = pPro.screens.filter((s) => s.auto &&
    (s.kind !== "single" || s.items.length !== 1));
  ok("자동으로 넘어가는 화면은 보기 하나짜리뿐이다", badAuto.length === 0,
     badAuto.length ? badAuto.map((s) => s.id).join(",")
       : `${pPro.screens.filter((s) => s.auto).length}개`);
  const shouldManual = pPro.screens.filter((s) =>
    ["sweep", "checklist", "pick-industry", "pick-role", "pick-org",
     "transition", "scene", "done", "profile"].includes(s.kind) && s.auto);
  ok("훑기와 복수 선택과 적는 칸은 손으로 넘긴다", shouldManual.length === 0,
     shouldManual.map((s) => s.id).join(","));
  const trans = pPro.screens.filter((s) => s.id.startsWith("trans-"));
  ok("경험 번역은 손으로 넘긴다", trans.length > 0 && trans.every((s) => !s.auto),
     `${trans.length}개`);

  /* --- 17. 산업이 검사 앞에 선다 --- */
  const order = pPro.screens.map((s) => s.id);
  const atPickIndustry = order.indexOf("pick-industry");
  const atFirstSweep = order.indexOf("sweep-interest");
  const atFirstProbe = order.findIndex((x) => x.startsWith("probe-"));
  ok("관심 산업을 영역 훑기 앞에서 고른다",
     atPickIndustry > 0 && atPickIndustry < atFirstSweep,
     `프로필 → 산업(${atPickIndustry + 1}째) → 훑기(${atFirstSweep + 1}째)`);
  const scene = pPro.screens.find((s) => s.kind === "scene");
  ok("고른 산업의 장면을 문항 앞에서 읽는다",
     !!scene && (scene.body ?? []).length >= 3 &&
     order.indexOf(scene.id) < atFirstProbe,
     scene ? `${scene.subject} · ${(scene.body ?? []).length}줄` : "없다");

  /* --- 18. 선별 등급 응답의 절반 이상이 실제 판단이다 --- */
  const judgeIds = pBasic.screens.filter((s) => s.kind === "single")
    .flatMap((s) => s.items);
  const sweepIds = pBasic.screens.filter((s) => s.kind === "sweep")
    .flatMap((s) => s.items);
  const ratio = judgeIds.length / (judgeIds.length + sweepIds.length);
  ok("선별 등급 응답의 절반 이상이 실제 판단 문항이다", ratio >= 0.5,
     `판단 ${judgeIds.length} · 훑기 ${sweepIds.length} · ${Math.round(ratio * 100)}%`);

  /* --- 19. 관심 역할은 Core 심화 뒤에 고른다 --- */
  const atRole = order.indexOf("pick-role");
  const lastDeep = order.reduce((n, x, i) => (x.startsWith("deep-") ? i : n), -1);
  ok("관심 역할은 Core 심화 뒤에 고른다", atRole > lastDeep && lastDeep > 0,
     `심화 끝 ${lastDeep + 1}째 → 역할 ${atRole + 1}째`);

  /* --- 20. 산업 문항에는 쉬운 말 풀이가 함께 뜬다 --- */
  const indScreens = pPro.screens.filter((s) => s.id.startsWith("ind-"));
  ok("산업 문항마다 쉬운 말 풀이가 함께 뜬다",
     indScreens.length >= 8 && indScreens.every((s) => (s.help ?? "").length > 10),
     `${indScreens.length}개`);

  /* --- 21. 타계열 대학원은 학부 묶음과 번역 맥락을 받는다 --- */
  const xf = plan({ tier: "BASIC", stage: "master", field: "HUMANITIES_SOCIAL",
    probe: TDS.slice(0, 2), deep: [] });
  const xfIds = xf.screens.filter((s) => s.id.startsWith("xfield-")).length;
  const ugIds = xf.screens.filter((s) => s.id.startsWith("branch-")).length;
  ok("타계열 대학원은 학부 묶음과 번역 맥락을 받는다", xfIds === 4 && ugIds === 6,
     `학부 묶음 ${ugIds} · 번역 맥락 ${xfIds}`);

  console.log(`\n  통과 ${pass} · 걸림 ${fail}`);
  if (fail) process.exitCode = 1;
}

main();
