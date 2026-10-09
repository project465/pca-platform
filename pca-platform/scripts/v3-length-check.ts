/**
 * 검사가 실제로 몇 화면이고 몇 분인가. **계획을 세워서 센다.**
 *
 * 이 검사를 만든 까닭. 응답 수는 `response-count.ts` 가 blueprint 에서
 * 세는데, **응시자가 읽는 양은 응답 수가 아니라 화면 수**다. 한 화면에
 * 문항 하나를 세우면 응답 103개가 화면 106개가 되고, 자동 진행 여부와
 * 관계없이 사람이 문장 106벌을 읽는다. 그 수를 아무도 세고 있지 않았다.
 *
 * 노리는 길이:
 *
 *   BASIC      8~12분
 *   STANDARD  15~22분
 *   PRO       22~35분
 *
 * 박사와 포닥은 학위 분기가 조금 길어서 **2분까지** 넘어갈 수 있다. 그보다
 * 길어지면 걸린다: 길어진 까닭을 적을 수 없는 길이는 줄여야 하는 길이다.
 *
 * **추정이고 실측이 아니다.** 화면 종류마다 초를 적어 두었고 파일럿에서
 * `v3_responses.answered_at` 으로 재서 고친다.
 *
 *   npm run v3:length
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
import { branchBlock, crossField } from "../src/lib/me-v3/runtime/routing";
import {
  content, domainName, estimate, gridRowOf, industryChoices, industryGloss,
  industryScene, roleChoices, roleName,
} from "../src/lib/me-v3/runtime/session";
import { planCost } from "../src/lib/me-v3/response-count";
import type { GradField, Stage, Tier } from "../src/lib/me-v3/scoring/types";

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

const DEPS = {
  items: content().bank.items, domainName, wording: (id: string, st: string) =>
    content().bank.items.find((i) => i.item_id === id) ? wordingHack(id, st) : id,
  gridRow: gridRowOf, scene: industryScene, gloss: industryGloss, roleName,
};
/* 문면은 길이 계산에 쓰지 않는다. 자리만 선다 */
function wordingHack(id: string, _st: string): string { return id; }

/**
 * 화면 하나에 드는 초와 계획 하나의 값.
 *
 * **여기서 다시 세지 않는다.** 전에는 이 파일이 초 표를 따로 들고 있었고,
 * 시작 화면은 blueprint 를 다시 세는 `counts()` 를 읽었다. 그래서 같은
 * BASIC 이 여기서는 46문항 12분이고 시작 화면에서는 48문항 10분이었다.
 * 세는 자리를 `response-count.ts` 하나로 모았다.
 */
function cost(p: Plan): { screens: number; fields: number; minutes: number } {
  const c = planCost(p.screens);
  return { screens: c.screens, fields: c.responses, minutes: c.minutes };
}

const TD = content().domains.domains.map((d) => d.code);
const IND = industryChoices()[0]?.code ?? "";
const ROLE = roleChoices().map((r) => r.code);

/**
 * 가장 긴 경우를 만든다.
 *
 * 영역을 **전부 해 봤다고 답한** 사람이다: 선별 축의 둘째 문항이 전 영역에서
 * 뜨고, 심화 영역이 넷이고, 역할을 둘 고른다. 해 본 영역이 적은 사람은 이보다
 * 짧다.
 */
function plan(tier: Tier, stage: Stage, field: GradField | null, deepN: number): Plan {
  const deep = TD.slice(0, deepN);
  const probe = deepN ? deep : TD.slice(0, 2);
  return buildPlan({
    tier, stage,
    branchBlock: branchBlock(stage, field),
    crossField: crossField(stage, field),
    probe, deep,
    industryInterest: [IND],
    roleInterest: tier === "BASIC" ? [] : ROLE.slice(0, 2),
    tiedPair: [],
    strongCells: [],
    consistAxis: null,
    touched: TD,
  }, DEPS);
}

/** 그 등급이 넘어서는 안 되는 분. 학위 분기가 긴 쪽은 2분 더 준다 */
const CAP: Record<Tier, number> = { BASIC: 12, STANDARD: 22, PRO: 35 };
const FLOOR: Record<Tier, number> = { BASIC: 8, STANDARD: 15, PRO: 22 };
const LONG_DEGREE: Stage[] = ["phd", "postdoc"];

const WHO: { stage: Stage; field: GradField | null; label: string }[] = [
  { stage: "bachelor", field: null, label: "학부" },
  { stage: "master", field: "STEM", label: "석사" },
  { stage: "phd", field: "STEM", label: "박사" },
  { stage: "postdoc", field: "STEM", label: "포닥" },
  { stage: "master", field: "BUSINESS", label: "타계열 석사" },
];

function main(): void {
  console.log("\n화면 수와 추정 시간 (영역을 전부 해 봤다고 답한 사람 · 심화 셋)\n");
  console.log("  등급       학위         화면   응답   추정");
  const rows: { tier: Tier; who: string; stage: Stage; c: ReturnType<typeof cost> }[] = [];
  for (const [tier, deepN] of [["BASIC", 0], ["STANDARD", 3], ["PRO", 3]] as [Tier, number][]) {
    for (const w of WHO) {
      const c = cost(plan(tier, w.stage, w.field, deepN));
      rows.push({ tier, who: w.label, stage: w.stage, c });
      console.log(`  ${tier.padEnd(9)}  ${w.label.padEnd(10)}  ${String(c.screens).padStart(4)}   ${String(c.fields).padStart(4)}   ${String(c.minutes).padStart(3)}분`);
    }
  }
  console.log("");

  for (const tier of ["BASIC", "STANDARD", "PRO"] as Tier[]) {
    const mine = rows.filter((r) => r.tier === tier);
    /* 박사와 포닥은 학위 분기가 조금 길고, 타계열 석사는 번역 맥락 넷을
       더 받는다. 그만큼만 더 준다 */
    const slack = (r: typeof mine[number]) =>
      (LONG_DEGREE.includes(r.stage) ? 2 : 0) + (r.who === "타계열 석사" ? 2 : 0);
    const over = mine.filter((r) => r.c.minutes > CAP[tier] + slack(r));
    ok(`${tier} 가 ${CAP[tier]}분을 넘지 않는다`, over.length === 0,
       over.length ? over.map((r) => `${r.who} ${r.c.minutes}분`).join(" · ")
                   : `가장 긴 경우 ${Math.max(...mine.map((r) => r.c.minutes))}분`);
    const under = mine.filter((r) => r.c.minutes < FLOOR[tier]);
    ok(`${tier} 가 ${FLOOR[tier]}분 아래로 얇아지지 않았다`, under.length === 0,
       under.length ? under.map((r) => `${r.who} ${r.c.minutes}분`).join(" · ")
                    : `가장 짧은 경우 ${Math.min(...mine.map((r) => r.c.minutes))}분`);
  }

  /* 넷째 영역이 열린 경우. **추가 결제 없이 열리는 자리**라 길이도 함께
     적어 둔다. 셋만 보면 차례가 서지 않을 때만 열린다 */
  console.log("\n  넷째 영역이 열린 경우 (3위와 4위가 묶였을 때만)\n");
  for (const tier of ["STANDARD", "PRO"] as Tier[]) {
    const c = cost(plan(tier, "bachelor", null, 4));
    const base = rows.find((r) => r.tier === tier && r.who === "학부")!.c;
    console.log(`  ${tier.padEnd(9)}  ${String(c.screens).padStart(4)}   ${String(c.fields).padStart(4)}   ${String(c.minutes).padStart(3)}분  (심화 셋보다 +${c.minutes - base.minutes}분)`);
    ok(`${tier} 넷째 영역이 ${CAP[tier] + 4}분을 넘지 않는다`, c.minutes <= CAP[tier] + 4,
       `${c.minutes}분`);
  }
  console.log("");

  /* 화면 수가 응답 수보다 적어야 한다. 같으면 한 화면에 한 문항이라는
     뜻이고, 그러면 응시자가 문장 수만큼 화면을 넘긴다 */
  for (const tier of ["BASIC", "STANDARD", "PRO"] as Tier[]) {
    const r = rows.find((x) => x.tier === tier && x.who === "학부")!;
    ok(`${tier} 의 화면 수가 응답 수보다 적다`, r.c.screens < r.c.fields,
       `화면 ${r.c.screens} · 응답 ${r.c.fields}`);
  }

  /* **실제 판단을 묻는 화면의 비중.**
     V1 은 서른두 화면 가운데 여덟만 판단이었다. 응답으로 세면 5초짜리
     훑기가 13초짜리 판단과 같은 무게로 세어지므로 화면으로 센다 */
  {
    const p = plan("BASIC", "bachelor", null, 0);
    const judge = p.screens.filter((x) =>
      x.id.startsWith("probe-") || x.id.startsWith("judge-") || x.id.startsWith("branch-"));
    const pct = Math.round(judge.length / p.screens.length * 100);
    ok("선별 등급 화면의 절반 이상이 실제 판단", pct >= 50,
       `판단 ${judge.length} / 전체 ${p.screens.length} 화면 · ${pct}%`);
  }

  /* 학위 넷이 서로 다른 묶음을 받는다. 같은 문항을 받으면 학위를 바꿔도
     무엇이 달라지는지 체감할 수 없다 */
  const branchIds = (stage: Stage) => {
    const p = plan("BASIC", stage, stage === "bachelor" ? null : "STEM", 0);
    return p.screens.filter((s) => s.id.startsWith("branch-"))
      .flatMap((s) => s.items).sort().join(",");
  };
  const sets = (["bachelor", "master", "phd", "postdoc"] as Stage[]).map(branchIds);
  ok("학위 넷이 서로 다른 묶음을 받는다", new Set(sets).size === 4,
     sets.map((x, i) => `${["학부", "석사", "박사", "포닥"][i]} ${x.split(",").length}문항`).join(" · "));
  ok("학위 묶음이 비어 있지 않다", sets.every((x) => x.split(",").length >= 5),
     sets.join(" / ").slice(0, 80));

  /**
   * **시작 화면이 적는 수가 이 표와 같은가.**
   *
   * 전에는 갈려 있었다: 이 표는 실제 계획을 세우고 시작 화면은 blueprint
   * 를 다시 세는 `counts()` 를 읽어서, BASIC 이 여기서는 46문항 12분이고
   * 시작 화면에서는 48문항 10분이었다. 응시자가 받은 수와 본 수가 다르면
   * 시간을 비워 두고 앉은 사람이 먼저 안다.
   */
  for (const who of WHO) {
    const e = estimate(who.stage, who.field);
    const b = cost(plan("BASIC", who.stage, who.field, 0));
    const st = cost(plan("STANDARD", who.stage, who.field, 3));
    const pr = cost(plan("PRO", who.stage, who.field, 3));
    const same = e.responses.BASIC === b.fields && e.minutes.basic === b.minutes
      && e.responses.STANDARD === st.fields && e.minutes.standardFresh === st.minutes
      && e.responses.PRO === pr.fields && e.minutes.proFresh === pr.minutes;
    ok(`시작 화면이 적는 수가 이 표와 같다 — ${who.label}`, same,
       `${e.responses.BASIC}/${b.fields} · ${e.responses.STANDARD}/${st.fields}`
       + ` · ${e.responses.PRO}/${pr.fields}`);
  }

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}\n`);
  if (fail) process.exit(1);
}
main();
