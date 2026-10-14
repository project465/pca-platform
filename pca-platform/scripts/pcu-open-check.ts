/**
 * **지금 학생에게 열린 자리가 어디인가.** 읽기만 한다.
 *
 *   npm run pcu:open
 *
 * 운영 공개를 한 자리씩 넓히는 동안 **변경 전과 후에 같은 자로 재는 자리**다.
 * 여는 칸이 둘이라 눈으로는 답이 안 나온다: Core 의 `open_to_students` 는
 * 그 Core 를 팔 수 있는가를 정하고, 학교 등록부의 `student_open` 은 이 학교의
 * 어느 자리에서 그것을 열 것인가를 정한다. 경영 Core 하나가 배재대 자리
 * 스물넷을 가리키므로 **Core 만 보고는 몇 자리가 열렸는지 알 수 없다.**
 *
 * **`{ preview: false }` 로 묻는다.** 미리보기를 거쳐 물으면 이 보고가
 * 아무것도 말하지 않는다: 열어 둔 서버에서는 늘 `검사 가능` 이 나온다.
 */
import {
  university, allLeaves, statusOf, readinessOf, leafOpen, mappingStatusOf,
  campusRegistry,
} from "../src/lib/campus/registry";
import { registry as coreRegistry, sellableCores } from "../src/lib/me-v3/core-registry";

const UNI = process.env.UNI ?? "PCU";
const SHUT = { preview: false } as const;

let pass = 0; const bad: string[] = [];
const ok = (w: string, c: boolean, saw = ""): void => {
  if (c) { pass += 1; console.log(`  통과  ${w}${saw ? ` — ${saw}` : ""}`); }
  else { bad.push(w); console.log(`  걸림  ${w}${saw ? ` — ${saw}` : ""}`); }
};
/** 세지 않고 적어만 두는 줄. 통과 수에 들어가지 않는다 */
const say = (w: string, saw: string): void =>
  console.log(`  적어둠  ${w} — ${saw}`);

function main(): void {
  const u = university(UNI);
  if (!u) throw new Error(`등록부에 ${UNI} 가 없습니다`);
  console.log(`\n── ${u.university_name} 학생 공개 상태 (읽기만)\n`);

  /**
   * ── Core 쪽 ──────────────────────────────────────────────
   *
   * **`open_to_students === true` 만 세면 적게 센다.** 그 칸이 **없는**
   * Core 도 팔 수 있다(`sellableCores` 가 `!== false` 로 본다). 처음에는
   * `true` 만 세어 `열린 Core 1벌` 로 적었는데, 실제로 열려 있던 것은
   * `ME_CORE_V3` 와 `BIZ_CORE_V1` **둘**이었다. 그 수에 매달려 있는 자리가
   * 따로 있어서(갓 가입한 사람의 작업공간) 적게 세면 그 쪽의 판단까지
   * 틀리게 읽는다.
   */
  const sellable = sellableCores(u.market_code, undefined, SHUT).map((c) => c.code);
  const byFlag = coreRegistry().cores
    .filter((c) => c.open_to_students === true).map((c) => c.code);
  const noFlag = sellable.filter((c) => !byFlag.includes(c));
  console.log(`  팔 수 있는 Core  ${sellable.length ? sellable.join(" · ") : "없다"}`);
  console.log(`    칸을 올려 연 것   ${byFlag.length ? byFlag.join(" · ") : "없다"}`);
  console.log(`    칸이 없어 열린 것 ${noFlag.length ? noFlag.join(" · ") : "없다"}`);

  /* ── 자리 쪽 ────────────────────────────────────────────── */
  const rows = allLeaves(u);
  const ready = rows.filter((r) => statusOf(u, r, undefined, SHUT) === "READY");
  const prep = rows.filter((r) => statusOf(u, r, undefined, SHUT) === "PREPARING");
  /**
   * **열린 자리는 `ASSESSMENT_READY` 에서 빠진다.**
   *
   * `readinessOf` 는 열린 자리를 `RESULT_READY` 로 올려 적는다. 그래서 한
   * 자리를 열면 `ASSESSMENT_READY` 가 115 에서 114 로 줄어드는데, 그것을
   * 그대로 적으면 **자료가 하나 무너진 것으로 읽힌다.** 둘을 더해서 적는다
   */
  const assess = rows.filter((r) =>
    readinessOf(u, r, undefined, SHUT) === "ASSESSMENT_READY");
  const resultReady = rows.filter((r) =>
    readinessOf(u, r, undefined, SHUT) === "RESULT_READY");
  const routing = rows.filter((r) => r.leaf.routing_only === true);
  const unmapped = rows.filter((r) =>
    !r.leaf.routing_only && mappingStatusOf(r.leaf) !== "EXACT");

  const mode = u.student_open?.mode ?? "CORE";
  console.log(`  여는 방식  ${mode}`
    + (mode === "LEAF" ? ` (자리 ${(u.student_open?.leaves ?? []).length}개)` : ""));
  console.log(`\n  고르는 자리        ${rows.length}`);
  console.log(`  자료가 다 선 자리   ${assess.length + resultReady.length}`
    + `  (Assessment Ready ${assess.length} + 열린 자리 ${resultReady.length})`);
  console.log(`  전공 탐색          ${routing.length}`);
  console.log(`  미매핑             ${unmapped.length}`);
  console.log(`  검사 가능          ${ready.length}`);
  for (const r of ready) {
    console.log(`      ${r.catalog.catalog_code}  ${r.college.name}`
      + `  ${r.leaf.name}  ${r.leaf.code}  ${r.leaf.core_code ?? "-"}`);
  }
  console.log(`  준비 중            ${prep.length}\n`);

  /* ── 두 칸이 서로 맞는가 ────────────────────────────────── */
  ok("검사 가능한 자리의 Core 가 전부 열려 있다",
    ready.every((r) => sellable.includes(r.leaf.core_code ?? "")),
    `${ready.length}자리`);
  ok("검사 가능한 자리가 전부 여는 목록 안이다",
    ready.every((r) => leafOpen(u, r.leaf)), `방식 ${mode}`);
  if (mode === "LEAF") {
    const listed = u.student_open?.leaves ?? [];
    const codes = new Set(rows.map((r) => r.leaf.code));
    const ghost = listed.filter((c) => !codes.has(c));
    ok("여는 목록의 자리가 등록부에 있다", ghost.length === 0, ghost.join(" "));
    /* **열렸다고 적어 둔 자리가 실제로 열렸는지 거꾸로도 센다.** 목록에만
       있고 매핑이 안 선 자리는 학생 화면에서 `준비 중` 으로 서는데, 적어 둔
       쪽만 보면 열린 줄 안다 */
    const shut = listed.filter((c) => !ready.some((r) => r.leaf.code === c));
    ok("여는 목록의 자리가 실제로 검사 가능하다", shut.length === 0,
      shut.length ? `${shut.join(" ")} 가 준비 중이다` : `${listed.length}자리`);
  }
  /* **이 수에 매달린 자리가 따로 있다.** 갓 가입한 사람은 응시도 지금
     값도 없어서, 팔 수 있는 Core 가 하나일 때만 짐작이 선다. 하나가
     아니면 작업공간이 전공 목록으로 보낸다(`activeCoreOrPick`) */
  say("팔 수 있는 Core 수", `${sellable.length}벌 — `
    + (sellable.length === 1
      ? "갓 가입한 사람도 바로 작업공간으로 간다"
      : "갓 가입한 사람은 전공 목록에서 고르고 들어간다"));
  ok("준비 중인 자리가 하나도 열려 있지 않다",
    prep.every((r) => statusOf(u, r, undefined, SHUT) !== "READY"),
    `${prep.length}자리`);
  /* 다른 학교까지 조용히 열리지 않았는가 */
  const others = campusRegistry().universities
    .filter((x) => x.university_code !== UNI);
  ok("다른 학교의 자리가 열리지 않았다",
    others.every((x) => allLeaves(x)
      .every((r) => statusOf(x, r, undefined, SHUT) !== "READY")),
    others.length ? others.map((x) => x.university_code).join(" ") : "다른 학교 없음");

  console.log(`\n확인 ${pass + bad.length}가지 — 통과 ${pass} · 걸림 ${bad.length}\n`);
  if (bad.length) process.exit(1);
}

main();
