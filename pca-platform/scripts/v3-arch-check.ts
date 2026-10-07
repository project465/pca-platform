/**
 * 장기 구조가 서 있는가. **데이터만 읽는다.**
 *
 * 보는 것은 일곱 층이다.
 *
 *   Country/Market → Major Core → Industry Pack → Role Pack
 *   → Region Layer → Evidence/Gap → Career Action
 *
 * 가장 중요한 두 줄은 이것이다. **나라별로 엔진을 따로 만들지 않았는가**와
 * **조합별 문항세트를 복제하지 않았는가.**
 *
 *   npm run v3:arch
 */
import { readFileSync, existsSync } from "node:fs";
import {
  CONTENT_DIR as DIR, core, coreFile, registry, markets,
  coresForMarket, sellableCores, contractGaps,
} from "../src/lib/me-v3/core-registry";

const AX = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"];

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function packs(code: string): { ind: any; role: any } {
  const c = core(code) as any;
  const read = (n?: string) =>
    n && existsSync(`${DIR}/${n}`)
      ? JSON.parse(readFileSync(`${DIR}/${n}`, "utf8")) : null;
  return { ind: read(c.packs?.industry), role: read(c.packs?.role) };
}

function main(): void {
  const reg = registry();
  const mk = markets().markets;

  // --- 1층 Market ---
  ok("시장마다 허용 계열이 있다",
     mk.length > 0 && mk.every((m) => m.allowed_core_families.length > 0),
     mk.map((m) => `${m.code}:${m.allowed_core_families.length}`).join(" · "));

  const global = mk.find((m) => m.code === "GLOBAL");
  ok("GLOBAL 은 STEM 만 내놓는다",
     Boolean(global) && global!.allowed_core_families.length === 1 &&
     global!.allowed_core_families[0] === "STEM");

  const kr = mk.find((m) => m.code === "KR");
  ok("KR 은 STEM 과 인문·사회와 경상을 내놓는다",
     Boolean(kr) &&
     ["STEM", "HUMANITIES_SOCIAL", "BUSINESS"].every(
       (f) => kr!.allowed_core_families.includes(f)));

  ok("Region Layer 는 KR 만 켠다",
     Boolean(kr?.region_layer) && global?.region_layer === false);

  // --- 2층 Major Core ---
  const fams = new Set(mk.flatMap((m) => m.allowed_core_families));
  const orphanCore = reg.cores.filter((c) => !fams.has(c.family));
  ok("어느 시장에도 못 서는 core", orphanCore.length === 0,
     orphanCore.length ? orphanCore.map((c) => c.code).join(" ") : `core ${reg.cores.length}벌`);

  const noMarket = reg.cores.filter((c) => c.markets.length === 0);
  ok("시장이 비어 있는 core", noMarket.length === 0);

  const building = reg.cores.filter((c) => c.status === "building");
  const badContract = building.flatMap((c) =>
    contractGaps(c.code).map((g) => `${c.code}: ${g}`));
  ok("짓고 있는 core 가 계약을 지킨다", badContract.length === 0,
     badContract.length ? badContract.join(" · ") : building.map((c) => c.code).join(" "));

  const planned = reg.cores.filter((c) => c.status === "planned");
  ok("등록만 된 core 는 파일을 요구하지 않는다",
     planned.every((c) => contractGaps(c.code).length === 0),
     `${planned.length}벌`);

  for (const m of mk) {
    const all = coresForMarket(m.code);
    const sell = sellableCores(m.code);
    console.log(`        ${m.code} — 등록 ${all.length}벌 · 지금 응시 가능 ${sell.length}벌` +
      ` (${sell.map((c) => c.name_ko).join(", ") || "없음"})`);
  }

  // --- 3·4층 Industry · Role Pack ---
  for (const c of building) {
    const { ind, role } = packs(c.code);
    ok(`${c.code} 에 산업팩과 역할팩이 등록돼 있다`, Boolean(ind) && Boolean(role));
    if (!ind || !role) continue;

    const tax = coreFile<any>(c.code, "taxonomy");
    const tdSet = new Set<string>(tax.technical_domains.map((d: any) => d.code));
    const rfSet = new Set<string>(tax.role_functions.map((d: any) => d.code));
    const ocSet = new Set<string>(tax.org_contexts.map((d: any) => d.code));
    const cap = ind.caps;

    const overInd = ind.packs.filter((p: any) => p.items.length > cap.industry_items_max);
    ok("산업팩 문항이 상한 안", overInd.length === 0,
       `상한 ${cap.industry_items_max} · 팩 ${ind.packs.length}벌 · 합 ` +
       ind.packs.reduce((a: number, p: any) => a + p.items.length, 0));

    const overRole = role.packs.filter((p: any) => p.items.length > cap.role_items_max);
    ok("역할팩 문항이 상한 안", overRole.length === 0,
       `상한 ${cap.role_items_max} · 팩 ${role.packs.length}벌 · 합 ` +
       role.packs.reduce((a: number, p: any) => a + p.items.length, 0));

    const badAx = [...ind.packs, ...role.packs].flatMap((p: any) =>
      p.items.filter((i: any) => !AX.includes(i.axis)).map((i: any) => i.id));
    ok("팩이 새 축을 만들지 않는다", badAx.length === 0,
       badAx.length ? badAx.join(" ") : "축은 J1~J8 뿐");

    const badTd = ind.packs.flatMap((p: any) => [
      ...Object.keys(p.axis_emphasis).filter((d) => !tdSet.has(d)),
      ...p.items.map((i: any) => i.domain).filter((d: string) => d && !tdSet.has(d)),
    ]);
    ok("산업팩이 가리키는 영역이 Core 에 있다", badTd.length === 0,
       badTd.length ? [...new Set(badTd)].join(" ") : "");

    const badRef = role.packs.filter((p: any) =>
      p.core_ref.td.some((t: string) => !tdSet.has(t)) ||
      p.core_ref.rf.some((r: string) => !rfSet.has(r)));
    ok("역할팩이 Core 의 영역·역할을 가리킨다", badRef.length === 0,
       badRef.length ? badRef.map((p: any) => p.code).join(" ") : "");

    const codes = new Set<string>(role.packs.map((p: any) => p.code));
    const badCmp = role.packs.flatMap((p: any) =>
      p.compare_with.filter((x: string) => !codes.has(x)));
    ok("역할팩의 비교 대상이 실재한다", badCmp.length === 0,
       badCmp.length ? [...new Set(badCmp)].join(" ") : "");

    const badOc = ind.packs.flatMap((p: any) =>
      Object.keys(p.org_mix).filter((o) => !ocSet.has(o)));
    ok("산업팩의 조직 유형이 Core 에 있다", badOc.length === 0);

    /* 산업과 역할이 점수를 바꾸지 않는다. 가중치 낱말이 있으면 걸린다 */
    const body = JSON.stringify([ind, role]);
    const weighted = /"weight|가중치|score_delta|multiplier/.test(body);
    ok("팩에 가중치가 없다", !weighted,
       "산업과 역할은 해석과 보기를 바꾸고 축 수준을 바꾸지 않는다");

    /* 조합별 복제 금지 증명 */
    const I = ind.packs.length, R = role.packs.length;
    const authored = ind.packs.reduce((a: number, p: any) => a + p.items.length, 0) +
                     role.packs.reduce((a: number, p: any) => a + p.items.length, 0);
    const duplicated = I * R * (cap.industry_items_max + cap.role_items_max);
    ok("조합별 문항세트를 복제하지 않는다", authored < duplicated / 4,
       `조합 ${I * R}벌 · 쓴 문항 ${authored} · 복제하면 ${duplicated}`);

    /* 한 응시에서 깊게 보는 것은 산업 하나와 역할 하나 */
    ok("한 응시의 깊이 모듈 상한",
       cap.deep_industry_max === 1 && cap.deep_role_max === 1,
       `산업 ${cap.deep_industry_max} · 역할 ${cap.deep_role_max} · 더해지는 응답 최대 ` +
       `${cap.industry_items_max + cap.role_items_max}`);

    /* 판본 */
    const noVer = [...ind.packs, ...role.packs].filter((p: any) => !p.version);
    ok("팩마다 판본이 있다", noVer.length === 0,
       `${ind.packs.length + role.packs.length}벌`);
  }

  console.log(`\n확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}

main();
