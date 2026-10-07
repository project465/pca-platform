/**
 * 문항 설계가 여섯 가지 오판을 내지 않는가. 사람 여덟 벌로 본다.
 *
 * **여기 든 산식은 제품 채점기가 아니다.** 설계 문서에 적은 규칙을 그대로
 * 옮긴 **설계 검산**이고, 7단계에서 제품 채점기를 쓰면 그쪽이 이 값을
 * 다시 내놓아야 한다. 검산을 따로 두는 까닭은, 문면을 쓰고 나서 **규칙이
 * 그 문면으로 오판을 내는지**를 채점기 전에 알아야 하기 때문이다.
 *
 * 규칙은 `53_v3_05_result_trace.md` 3~4절에서 왔다.
 *
 *   L2 이상이 확인 · L1 은 확인이 아니다
 *   L3 은 근거 둘 이상일 때만
 *   G4 = 선별 네 축의 확인 수 · G8 = 여덟 축의 확인 수
 *   Z1 = G8 ≥ 4 이고 필수 축 둘이 L2 이상이고 **J5 산출물이 L2 이상**
 *        이고 관심이 낮지 않음
 *   Z2 = 관심이 높고 (확인 수가 적거나 **산출물이 비어 있음**)
 *
 * **산출물 조건을 뒤에 더했다.** 이 검산을 처음 돌렸을 때 포닥 한 벌이
 * 걸렸다: 문제 정의와 직접 판단과 방법과 비교·검증이 L2 이상이어서 G8 이
 * 다섯인데 산출물이 L1 이고 조직 활용이 L0 이었다. 그 상태를 `근거가 선
 * 영역` 으로 적으면 **남은 것이 없는 사람에게 지원서에 쓸 근거가 섰다고
 * 말하는 셈**이다. 앞 판본의 `APPLICATION_EVIDENCE_AVAILABLE` 이 이미
 * `산출물 이상 하나` 를 요구하고 있어서, 그 선을 Z1 에도 같이 둔다.
 *
 *   npm run v3:persona
 */
import { coreFile, registry } from "../src/lib/me-v3/core-registry";

type Lv = "L0" | "L1" | "L2" | "L3";
const AX = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"] as const;
type Axis = typeof AX[number];

type Answers = {
  stage: "bachelor" | "master" | "phd" | "postdoc";
  field: "STEM" | "HUMANITIES_SOCIAL" | "BUSINESS" | "OTHER_INTERDISCIPLINARY" | null;
  industry: string | null;
  role: string | null;
  interest: Record<string, 1 | 2 | 3 | 4 | 5>;
  exposure: Record<string, 0 | 1 | 2>;
  learning: Record<string, 1 | 2 | 3 | 4 | 5>;
  /** 영역별 축 응답. 심화를 연 영역만 있다 */
  axes: Record<string, Partial<Record<Axis, Lv>>>;
  /** 체크리스트나 번역에서 같은 축에 붙은 추가 근거의 수 */
  corroboration: Record<string, Partial<Record<Axis, number>>>;
  tier: "BASIC" | "STANDARD" | "PRO";
};

type Derived = {
  level: Record<string, Partial<Record<Axis, Lv>>>;
  g4: Record<string, number>;
  g8: Record<string, number>;
  zones: { Z1: string[]; Z2: string[]; Z3: string[]; Z4: string[] };
  surfaced: string[];
};

/* ---------- 설계 검산 ---------- */

const S4: Axis[] = ["J3", "J5", "J6", "J8"];

function band(v: number): "높음" | "중간" | "낮음" {
  return v >= 4 ? "높음" : v <= 2 ? "낮음" : "중간";
}

function derive(a: Answers, req: Record<string, string[]>, tds: string[]): Derived {
  const level: Derived["level"] = {};
  const g4: Record<string, number> = {};
  const g8: Record<string, number> = {};

  for (const td of tds) {
    const got = a.axes[td] ?? {};
    const out: Partial<Record<Axis, Lv>> = {};
    for (const ax of AX) {
      const raw = got[ax];
      if (!raw) continue;
      /* L3 은 근거 둘 이상일 때만. 하나면 L2 로 둔다 */
      const corr = a.corroboration[td]?.[ax] ?? 0;
      out[ax] = raw === "L3" && corr < 1 ? "L2" : raw;
    }
    level[td] = out;
    const conf = (list: readonly Axis[]) =>
      list.filter((ax) => out[ax] === "L2" || out[ax] === "L3").length;
    g4[td] = conf(S4);
    /* BASIC 은 여덟 축을 묻지 않는다. 묻지 않은 축을 센 것으로 적지 않는다 */
    g8[td] = a.tier === "BASIC" ? 0 : conf(AX);
  }

  const zones: Derived["zones"] = { Z1: [], Z2: [], Z3: [], Z4: [] };
  for (const td of tds) {
    const I = band(a.interest[td] ?? 3);
    const opened = Object.keys(level[td] ?? {}).length > 0;
    if (!opened) { zones.Z4.push(td); continue; }
    const conf2 = (ax: Axis) =>
      level[td]?.[ax] === "L2" || level[td]?.[ax] === "L3";
    const needOk = (req[td] ?? []).every((ax) => conf2(ax as Axis));
    /* 산출물이 비면 근거라고 적지 않는다. 연구 축만 높은 자리가 여기 걸린다 */
    const artefact = conf2("J5");
    const z1ok = a.tier !== "BASIC" && g8[td] >= 4 && needOk && artefact;
    if (z1ok && I !== "낮음") zones.Z1.push(td);
    /* **근거가 아직 덜 선 자리**는 전부 여기로 온다: 확인된 축이 적은
       경우와, 축은 여럿인데 필수 축이 비거나 산출물이 없는 경우다.
       '아직 판단할 수 없는 영역' 으로 보내면 많이 답한 사람에게 답이
       모자란다고 말하는 셈이 된다 */
    else if (I === "높음"
             && (a.tier === "BASIC" ? (g4[td] <= 1 || !artefact) : !z1ok))
      zones.Z2.push(td);
    else if (I === "낮음" && (a.tier === "BASIC" ? g4[td] >= 2 : g8[td] >= 3)) zones.Z3.push(td);
    else zones.Z4.push(td);
  }

  /* 결과지 첫 쪽에 올리는 영역. 근거가 선 쪽이 먼저고 없으면 Z2 */
  const surfaced = zones.Z1.length ? zones.Z1 : zones.Z2;
  return { level, g4, g8, zones, surfaced };
}

/* ---------- 사람 여덟 벌 ---------- */

const TDS = Array.from({ length: 12 }, (_, i) => `TD${String(i + 1).padStart(2, "0")}`);

function flat<T>(v: T): Record<string, T> {
  return Object.fromEntries(TDS.map((t) => [t, v]));
}

function person(p: Partial<Answers>): Answers {
  return {
    stage: "bachelor", field: null, industry: null, role: null,
    interest: flat(3 as const), exposure: flat(0 as const), learning: flat(3 as const),
    axes: {}, corroboration: {}, tier: "STANDARD", ...p,
  };
}

const HIGH = { J1: "L2", J2: "L2", J3: "L3", J4: "L2", J5: "L3", J6: "L2", J7: "L2", J8: "L2" } as Partial<Record<Axis, Lv>>;
const RESEARCHY = { J1: "L3", J2: "L2", J3: "L3", J4: "L3", J6: "L3", J5: "L1", J8: "L0" } as Partial<Record<Axis, Lv>>;
const TOUCHED = { J1: "L1", J3: "L1", J4: "L1", J5: "L1", J6: "L1", J8: "L1" } as Partial<Record<Axis, Lv>>;
const CORR2 = { J1: 2, J2: 2, J3: 2, J4: 2, J5: 2, J6: 2, J7: 2, J8: 2 } as Partial<Record<Axis, number>>;

const PEOPLE: Record<string, Answers> = {
 "A 경험 거의 없는 3학년": person({
   tier: "BASIC",
   interest: { ...flat(3 as const), TD01: 5, TD02: 5, TD05: 4 },
   learning: { ...flat(3 as const), TD01: 5, TD02: 5 },
   axes: { TD01: { J3: "L0", J5: "L0", J6: "L0", J8: "L0" },
           TD02: { J3: "L0", J5: "L0", J6: "L0", J8: "L0" } },
 }),
 "B 캡스톤 설계 경험자": person({
   interest: { ...flat(3 as const), TD01: 5, TD08: 4 },
   exposure: { ...flat(0 as const), TD01: 2, TD08: 1 },
   axes: { TD01: { ...HIGH }, TD08: { J1: "L2", J3: "L2", J5: "L1", J6: "L1" },
           TD02: { J1: "L1", J3: "L1", J4: "L1", J5: "L0", J6: "L0", J8: "L0" } },
   corroboration: { TD01: { ...CORR2 } },
 }),
 "C 구조해석 석사": person({
   stage: "master", field: "STEM",
   interest: { ...flat(3 as const), TD02: 5, TD01: 4, TD07: 4 },
   exposure: { ...flat(0 as const), TD02: 2, TD07: 1 },
   axes: { TD02: { ...HIGH }, TD07: { J3: "L2", J4: "L2", J5: "L1", J6: "L2" },
           TD01: { J2: "L2", J3: "L1", J5: "L0", J6: "L1" } },
   corroboration: { TD02: { ...CORR2 } },
 }),
 "D 열유체 석사": person({
   stage: "master", field: "STEM",
   interest: { ...flat(3 as const), TD03: 5, TD07: 4 },
   exposure: { ...flat(0 as const), TD03: 2 },
   axes: { TD03: { ...HIGH }, TD07: { J3: "L2", J4: "L2", J5: "L2", J6: "L1" },
           TD02: { J1: "L1", J3: "L1", J4: "L2", J5: "L1" } },
   corroboration: { TD03: { ...CORR2 } },
 }),
 "E 재료·파손 박사": person({
   stage: "phd", field: "STEM", tier: "PRO",
   interest: { ...flat(3 as const), TD06: 5, TD07: 4, TD10: 4 },
   exposure: { ...flat(0 as const), TD06: 2, TD07: 1 },
   axes: { TD06: { ...HIGH }, TD07: { J3: "L2", J4: "L3", J5: "L2", J6: "L2" },
           TD10: { J1: "L2", J4: "L2", J6: "L1", J7: "L2" } },
   corroboration: { TD06: { ...CORR2 }, TD07: { J4: 2 } },
 }),
 "F 생산기술 경험자": person({
   interest: { ...flat(3 as const), TD08: 5, TD09: 4, TD10: 4 },
   exposure: { ...flat(0 as const), TD08: 2, TD09: 1 },
   axes: { TD08: { ...HIGH }, TD09: { J3: "L2", J4: "L2", J7: "L2", J5: "L1" },
           TD10: { J3: "L2", J6: "L2", J5: "L1", J8: "L1" } },
   corroboration: { TD08: { ...CORR2 } },
 }),
 "G 자동차 연구 박사": person({
   stage: "phd", field: "STEM", tier: "PRO",
   industry: "INDUSTRY_MOBILITY_V1", role: "ROLE_CAE_V1",
   interest: { ...flat(3 as const), TD02: 5, TD04: 5, TD03: 4 },
   exposure: { ...flat(0 as const), TD02: 2, TD04: 2 },
   axes: { TD02: { ...HIGH }, TD04: { ...HIGH },
           TD03: { J1: "L2", J3: "L2", J4: "L2", J6: "L1" } },
   corroboration: { TD02: { ...CORR2 }, TD04: { ...CORR2 } },
 }),
 "I 관심만 높고 남은 것이 없는 학생": person({
   interest: { ...flat(3 as const), TD03: 5 },
   exposure: { ...flat(0 as const), TD03: 1 },
   axes: { TD03: { J1: "L1", J3: "L2", J5: "L0", J6: "L1", J8: "L0" } },
 }),
 "J 판단은 많고 남은 것이 없는 사람": person({
   interest: { ...flat(3 as const), TD08: 5 },
   exposure: { ...flat(0 as const), TD08: 2 },
   axes: { TD08: { J1: "L2", J2: "L2", J3: "L3", J4: "L2", J6: "L2", J7: "L2",
                   J5: "L0", J8: "L1" } },
   corroboration: { TD08: { J3: 2 } },
 }),
 "K 산출물은 있고 판단은 적은 사람": person({
   interest: { ...flat(3 as const), TD01: 5 },
   exposure: { ...flat(0 as const), TD01: 2 },
   axes: { TD01: { J1: "L1", J2: "L2", J3: "L0", J4: "L2", J5: "L3", J6: "L1",
                   J8: "L1" } },
   corroboration: { TD01: { J5: 2 } },
 }),
 "L 판단·산출물·검증이 다 있는 사람": person({
   interest: { ...flat(3 as const), TD02: 5 },
   exposure: { ...flat(0 as const), TD02: 2 },
   axes: { TD02: { J1: "L2", J3: "L2", J5: "L2", J6: "L2", J8: "L1" } },
 }),
 "H 산업을 모르는 포닥": person({
   stage: "postdoc", field: "STEM", tier: "PRO",
   interest: { ...flat(3 as const), TD02: 4, TD03: 4 },
   exposure: { ...flat(0 as const), TD02: 2, TD03: 2 },
   axes: { TD02: { ...RESEARCHY }, TD03: { ...RESEARCHY } },
   corroboration: { TD02: { J1: 2, J3: 2, J4: 2, J6: 2 },
                    TD03: { J1: 2, J3: 2, J4: 2, J6: 2 } },
 }),
};

/* ---------- 검사 ---------- */

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
  const dom = coreFile<any>(code, "domains");
  const req: Record<string, string[]> = {};
  for (const d of dom.domains) req[d.code] = d.required_axes;
  const tds: string[] = dom.domains.map((d: any) => d.code);

  console.log(`  core  ${code} · 설계 검산 (제품 채점기가 아니다)\n`);

  const out: Record<string, Derived> = {};
  for (const [name, a] of Object.entries(PEOPLE)) {
    const d = derive(a, req, tds);
    out[name] = d;
    const z1 = d.zones.Z1.length ? d.zones.Z1.join(",") : "없음";
    const z2 = d.zones.Z2.length ? d.zones.Z2.join(",") : "없음";
    console.log(`  ${name.padEnd(22)} ${a.tier.padEnd(9)} Z1 ${z1.padEnd(14)} Z2 ${z2}`);
  }
  console.log("");

  // 1. 학위로 점수가 오르지 않는다
  const base = PEOPLE["C 구조해석 석사"];
  const asPostdoc = derive({ ...base, stage: "postdoc" }, req, tds);
  const asBachelor = derive({ ...base, stage: "bachelor" }, req, tds);
  ok("학위를 바꿔도 축 수준과 묶음이 같다",
     JSON.stringify(asPostdoc) === JSON.stringify(asBachelor) &&
     JSON.stringify(asPostdoc) === JSON.stringify(out["C 구조해석 석사"]));

  // 2. 계열로도 오르지 않는다
  const asBiz = derive({ ...base, field: "BUSINESS" }, req, tds);
  ok("전공계열을 바꿔도 결과가 같다",
     JSON.stringify(asBiz) === JSON.stringify(out["C 구조해석 석사"]));

  // 3. 관심만 높은 사람을 경험자로 오판하지 않는다
  const A = out["A 경험 거의 없는 3학년"];
  ok("관심만 높은 사람에게 근거가 선 영역이 없다",
     A.zones.Z1.length === 0 && Object.values(A.g4).every((v) => v === 0),
     `Z1 ${A.zones.Z1.length}개 · 확인된 선별 축 0`);

  // 4. 참여를 소유로 오판하지 않는다
  const touched = person({
    tier: "STANDARD",
    interest: { ...flat(3 as const), TD02: 5 },
    exposure: { ...flat(0 as const), TD02: 2 },
    axes: { TD02: { ...TOUCHED } },
  });
  const T = derive(touched, req, tds);
  ok("남이 한 것을 받아 쓴 응답은 확인으로 세지 않는다",
     T.zones.Z1.length === 0 && T.g8.TD02 === 0,
     `전부 L1 · G8 ${T.g8.TD02}`);

  // 5. 근거 하나짜리 L3 을 소유로 올리지 않는다
  const once = person({
    tier: "STANDARD",
    interest: { ...flat(3 as const), TD01: 5 },
    axes: { TD01: { J3: "L3", J5: "L3", J6: "L3", J8: "L3" } },
    corroboration: {},
  });
  const O = derive(once, req, tds);
  const noL3 = Object.values(O.level.TD01 ?? {}).every((v) => v !== "L3");
  ok("근거가 하나면 소유로 올리지 않는다", noL3, "L3 응답이 L2 로 내려간다");

  // 6. 산업 선택이 Core 결과를 바꾸지 않는다
  const g = PEOPLE["G 자동차 연구 박사"];
  const semi = derive({ ...g, industry: "INDUSTRY_SEMICON_V1" }, req, tds);
  const none = derive({ ...g, industry: null }, req, tds);
  ok("산업을 바꿔도 Core 결과가 같다",
     JSON.stringify(semi) === JSON.stringify(none) &&
     JSON.stringify(semi) === JSON.stringify(out["G 자동차 연구 박사"]));

  // 7. 역할팩이 Core 결과를 바꾸지 않는다
  const pm = derive({ ...g, role: "ROLE_PM_V1" }, req, tds);
  ok("역할팩을 바꿔도 Core 결과가 같다",
     JSON.stringify(pm) === JSON.stringify(out["G 자동차 연구 박사"]));

  // 8. 근거 없는 영역을 첫 쪽에 올리지 않는다
  const bad = Object.entries(out).filter(([, d]) =>
    d.surfaced.some((td) => (d.g8[td] ?? 0) < 4 && d.zones.Z1.includes(td)));
  ok("첫 쪽에 올린 영역은 근거 조건을 지킨다", bad.length === 0);
  const emptyZ1 = Object.entries(out).filter(([, d]) =>
    d.zones.Z1.length === 0 && d.surfaced.some((td) => d.zones.Z1.includes(td)));
  ok("Z1 이 비면 Z2 를 먼저 보여 준다", emptyZ1.length === 0,
     `A 는 ${A.surfaced.join(",") || "없음"} 을 먼저 본다`);

  // 9. BASIC 에 Z1 이 없다
  const basics = Object.entries(PEOPLE).filter(([, a]) => a.tier === "BASIC");
  ok("BASIC 응시에는 근거가 섰다는 판정이 없다",
     basics.every(([n]) => out[n].zones.Z1.length === 0), `${basics.length}명`);

  // 10. 포닥이 박사보다 자동으로 높지 않다
  const H = out["H 산업을 모르는 포닥"];
  ok("연구 축은 높고 산출·활용 축이 비면 근거가 서지 않는다",
     H.zones.Z1.length === 0,
     `TD02 G8 ${H.g8.TD02} · 산출물과 조직 활용이 비어 있다`);

  /* 11. 그 사람을 빈손으로 돌려보내지 않는다. 많이 답했는데 산출물만
     비었다면 모자란 것은 응답이 아니라 남은 것이고, 그 사실을 적을
     자리가 Z2 다 */
  ok("산출물만 빈 영역을 아직 판단할 수 없다고 적지 않는다",
     !H.zones.Z4.includes("TD02") && !H.zones.Z4.includes("TD03") &&
     H.surfaced.length > 0,
     `H 는 ${H.surfaced.join(",")} 을 먼저 본다`);

  /* 12~15. Z1·Z2 를 고친 뒤 네 유형이 제대로 갈리는가.
     '근거가 섰다' 와 '경험은 있으나 아직 근거가 완성되지 않았다' 가
     갈리는 자리다 */
  const z2has = (name: string, td: string) => {
    const d = out[name];
    return d.zones.Z1.length === 0 && d.zones.Z2.includes(td) &&
      !d.zones.Z4.includes(td);
  };
  ok("관심만 높고 남은 것이 없으면 근거가 서지 않는다",
     z2has("I 관심만 높고 남은 것이 없는 학생", "TD03"),
     `TD03 확인 ${out["I 관심만 높고 남은 것이 없는 학생"].g8.TD03}`);
  ok("판단이 많아도 남은 것이 없으면 근거가 서지 않는다",
     z2has("J 판단은 많고 남은 것이 없는 사람", "TD08"),
     `TD08 확인 ${out["J 판단은 많고 남은 것이 없는 사람"].g8.TD08} · 산출물이 비어 있다`);
  ok("산출물만 있고 직접 판단이 비면 근거가 서지 않는다",
     z2has("K 산출물은 있고 판단은 적은 사람", "TD01"),
     `TD01 필수 축 J3 가 비어 있다`);
  const L = out["L 판단·산출물·검증이 다 있는 사람"];
  ok("판단과 산출물과 검증이 다 있으면 근거가 선다",
     L.zones.Z1.includes("TD02"),
     `TD02 확인 ${L.g8.TD02} · 필수 축 둘과 산출물이 모두 L2 이상`);

  console.log(`\n사람 ${Object.keys(PEOPLE).length}벌 · 확인 ${pass + fail}가지 — ` +
              `통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}

main();
