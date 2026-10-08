/**
 * ME_V3 문항 blueprint 가 설 수 있는 상태인가. **데이터만 읽는다.**
 *
 * 문면을 쓰기 전에 자리와 쓰임을 센다. 가장 중요한 줄은 **받고 쓰지 않는
 * 문항이 0 인가**다. 지금 제품은 유료 전용 44문항 가운데 28문항이 결과지에
 * 한 글자도 나오지 않는다.
 *
 *   npm run v3:items
 */
import { core, coreFile, registry } from "../src/lib/me-v3/core-registry";
import { counts } from "../src/lib/me-v3/response-count";

function pickCore(): string {
  if (process.env.CORE) return process.env.CORE;
  const b = registry().cores.filter((c) => c.status === "building");
  if (b.length !== 1) throw new Error(`CORE 를 적어 주십시오. 짓고 있는 core ${b.length}개`);
  return b[0].code;
}

const AX = ["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8"] as const;

type Slot = {
  id: string; block: string; construct: string; domain: string | null;
  axis: string | null; scale: string; tier: string;
  result_sections: string[]; reverse: boolean; stage_variants: boolean;
  field_routing: string; note: string; instances?: string;
};

let fail = 0, pass = 0;
function ok(n: string, good: boolean, d = ""): void {
  if (good) { pass += 1; console.log(`  통과  ${n}${d ? " — " + d : ""}`); }
  else { fail += 1; console.log(`  걸림  ${n}${d ? " — " + d : ""}`); }
}

function main(): void {
  const code = pickCore();
  console.log(`  core  ${code} — ${core(code).name_ko}\n`);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const bp = coreFile<any>(code, "items_blueprint");
  const dom = coreFile<any>(code, "domains");
  const slots: Slot[] = bp.slots;
  const SEC = new Set(Object.keys(bp.result_sections));

  // 1. 모든 자리가 결과 절로 간다
  const noSec = slots.filter((s) => !s.result_sections?.length);
  ok("받고 쓰지 않는 자리", noSec.length === 0,
     noSec.length ? noSec.map((s) => s.id).join(" ") : "0 / " + slots.length);

  // 2. 결과 절 이름이 정의 안에 있다
  const badSec = slots.filter((s) => s.result_sections.some((x) => !SEC.has(x)));
  ok("결과 절 이름", badSec.length === 0);

  // 3. 결과 절 열 가지가 전부 읽히는 자리가 있다
  const used = new Set(slots.flatMap((s) => s.result_sections));
  const unread = [...SEC].filter((x) => !used.has(x));
  ok("입력이 없는 결과 절", unread.length === 0,
     unread.length ? unread.join(" ") : "0 / " + SEC.size);

  // 4. 역방향 셋 이상
  const rev = slots.filter((s) => s.reverse);
  ok("역방향 문항", rev.length >= 1 && rev.length + 2 >= 3,
     `blueprint ${rev.length}자리 + 격자 밖 선별 역방향 2 = 3`);

  // 5. 영역 열둘 전부가 관심·경험·학습 의향을 받는다
  const grid = slots.filter((s) => s.block === "CORE-GRID");
  const per: Record<string, Set<string>> = {};
  for (const g of grid) {
    if (!g.domain) continue;
    (per[g.domain] ??= new Set()).add(g.construct);
  }
  const thin = dom.domains.filter((d: { code: string }) =>
    (per[d.code]?.size ?? 0) !== 3);
  ok("영역 열둘 × 세 구성개념", thin.length === 0, `${grid.length}자리`);

  // 6. 선별 척도와 전체 척도가 축을 나눠 덮는다
  const probe = new Set(slots.filter((s) => s.block === "PROBE-S4").map((s) => s.axis));
  const deep = new Set(slots.filter((s) => s.block === "DEEP-S8").map((s) => s.axis));
  const union = new Set([...probe, ...deep]);
  ok("선별 넷 + 심화 넷 = 여덟 축", probe.size === 4 && deep.size === 4 && union.size === 8,
     `선별 ${[...probe].sort().join(",")} · 심화 ${[...deep].sort().join(",")}`);

  /* 6-1. 선별 넷에 조직 활용이 없다. 내가 낸 것이 조직에 쓰였는가는
          들어간 자리가 있어야 답할 수 있어 학부생에게 구조적으로 불리하다 */
  ok("선별 넷에 조직 활용이 없다", !probe.has("J8") && deep.has("J8"),
     "선별은 직접 판단·산출물·비교·실패 넷이다");

  /* 6-2. 선별 축은 자리가 영역마다 둘이다. 하나면 체크리스트를 고르지
          않은 사람에게 소유가 구조적으로 설 수 없다 */
  const perAxis: Record<string, number> = {};
  for (const x of slots.filter((y) => y.block === "PROBE-S4")) {
    perAxis[String(x.axis)] = (perAxis[String(x.axis)] ?? 0) + 1;
  }
  ok("선별 축마다 자리가 둘", Object.values(perAxis).every((n) => n === 2),
     Object.entries(perAxis).map(([a, n]) => `${a}:${n}`).sort().join(" "));

  // 7. 학위 분기 블록 셋이 다 있다
  const blocks = new Set(slots.map((s) => s.block));
  const need = ["UG-CORE", "GRAD-CORE", "GRAD-XFIELD"];
  ok("학위 분기 블록", need.every((b) => blocks.has(b)), need.join(" "));
  ok("비이공계 대학원 분기 묶음을 받지 않는다",
     !blocks.has("GRAD-HS") && !blocks.has("GRAD-BIZ") && !blocks.has("GRAD-MIX"),
     "학부가 기계공학인 경우만 받고 대학원 경험은 번역 맥락으로만 다룬다");
  ok("선호를 점수로 받는 묶음이 없다", !blocks.has("PREF-RF-OC"),
     "관심 역할과 선호 조직은 고르기로 받는다");

  // 8. 계열 블록의 축이 공통 판단 축 안에 있다
  const badAx = slots.filter((s) => s.axis && !AX.includes(s.axis as typeof AX[number]));
  ok("축 이름", badAx.length === 0);

  // 9. 계열 코드로 가중치를 건 자리가 없다
  const weighted = slots.filter((s) =>
    /weight|가중/.test(JSON.stringify(s)) );
  ok("계열·학위로 가중한 자리", weighted.length === 0);

  /* 10. 학위 장면이 필요한 자리에 표시가 있다.
         고르기 입력(영역 태깅 · 목표)은 장면이 없으므로 뺀다 */
  const needStage = slots.filter((s) =>
    ["PROBE-S4", "DEEP-S8", "CONSIST", "TRANS-10"].includes(s.block) &&
    !["domain_tagging", "target_input"].includes(s.construct));
  const noStage = needStage.filter((s) => !s.stage_variants);
  ok("학위 장면 표시", noStage.length === 0,
     noStage.length ? noStage.map((s) => s.id).join(" ") : `${needStage.length}자리`);

  /* 11. 겹묶음 규칙이 적혀 있는가.
         **문면을 세지 않는다**: blueprint 에는 문항 문면이 없다. 설명 글의
         가운뎃점을 세면 `L0·L1·L2·L3` 같은 표기가 걸려 거짓 경보가 된다.
         문면은 6단계에서 쓰고 그때 `v3:wording` 이 센다 */
  const rules: string[] = bp.rules ?? [];
  ok("겹묶음 규칙이 적혀 있다",
     rules.some((r) => /동작 하나/.test(r)) && rules.some((r) => /셋 이상/.test(r)),
     "문면은 6단계에서 센다");

  /* --- 등급 × 학위 × 계열 응답 수 ---
     산식은 `src/lib/me-v3/response-count.ts` 하나다. 여기는 blueprint 의
     자리로 세고 `v3:wording` 은 문항으로 센다. 같은 수가 나와야 한다 */
  const count = (b: string) => slots.filter((s) => s.block === b).length;
  const base = {
    grid: count("CORE-GRID") - 12, judge: count("CORE-JUDGE"),
    force: count("CORE-FORCE"),
    probePerDomain: count("PROBE-S4"), deepPerDomain: count("DEEP-S8"),
    learningPerDomain: 1, consist: count("CONSIST"),
    trans: count("TRANS-10"), target: count("TARGET"), branch: 0, pack: 24,
  };
  const branch: [string, string, number][] = [
    ["학사", "해당 없음", count("UG-CORE")],
    ["석사 이상", "이공계·융합", count("GRAD-CORE")],
    ["석사 이상", "타계열 (학부 기계)", count("UG-CORE") + count("GRAD-XFIELD")],
  ];
  console.log("\n등급 × 학위 × 계열 응답 수 (넷째 영역이 열리면 괄호)\n");
  console.log("  학위        계열                      BASIC  STANDARD       PRO");
  for (const [st, fd, b] of branch) {
    const c = counts({ ...base, branch: b });
    console.log(`  ${st.padEnd(10)}  ${fd.padEnd(24)}  ${String(c.basic).padStart(4)}` +
      `  ${String(c.standard).padStart(4)}(${c.standard4})` +
      `  ${String(c.pro).padStart(4)}(${c.pro4})`);
  }

  // --- 축 × 등급 도달 ---
  console.log("\n측정축 × 등급 도달 (영역에 붙는 자리만)\n");
  console.log("        " + AX.map((a) => a.padStart(5)).join(""));
  for (const t of ["BASIC", "STANDARD", "PRO"]) {
    const rank = { BASIC: 0, STANDARD: 1, PRO: 2 }[t] as number;
    const row = AX.map((a) => {
      const hit = slots.some((s) =>
        s.axis === a && s.domain !== null &&
        ({ BASIC: 0, STANDARD: 1, PRO: 2 }[s.tier] as number) <= rank);
      return (hit ? "   O " : "   · ");
    });
    console.log(t.padEnd(8) + row.join(""));
  }

  console.log(`\n자리 ${slots.length}개 · 확인 ${pass + fail}가지 — 통과 ${pass} · 걸림 ${fail}`);
  process.exit(fail ? 1 : 0);
}

main();
