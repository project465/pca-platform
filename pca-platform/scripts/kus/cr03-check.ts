/**
 * KUS-CR-03(Core 없는 학과 학생의 계정 발급) 검사. **공통 파일을 고치지 않는다.**
 *
 * 같은 스크립트를 두 나무에서 돌린다: 지금 HEAD(변경 전)와, 제안 patch
 * (`docs/kus/cr/CR-03-unsupported-accounts.patch`)를 얹은 나무(변경 후).
 * `MODE=before|after` 로 기대값을 가른다. 등록부 전체(배재 · 전주대 fixture ·
 * KUS fixture)의 명단 판정을 JSON 으로 남겨 두 벌을 견주고, 바뀐 자리가
 * **KUS 의 Core 없는 자리뿐**인지 센다.
 *
 *   APP_ENV=dev V3_CAMPUS_FIXTURE=<KUS+JJU 합본> APPLY=yes MODE=after \
 *     OUT=docs/kus/cr npx tsx scripts/kus/cr03-check.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { query, queryOne } from "../../src/lib/db";
import * as reg from "../../src/lib/campus/registry";
import { checkStudent, campusStudentContext } from "../../src/lib/campus/students";
import { campusV3 } from "../../src/lib/me-v3/campus";
import { openAttempt } from "../../src/lib/me-v3/runtime/session";
import { examUnavailable, kusStudentOf } from "../../src/lib/kus/access";
import { kusWorkspace } from "../../src/lib/kus/workspace";
import { kusTodos } from "../../src/lib/kus/home";
import { addVisit, checkVisit, visitOf, visitPrograms } from "../../src/lib/kus/visits";
import { admin, guard, kusOrgSetup, org, outsider, student } from "./demo-setup";

const MODE = (process.env.MODE ?? "after") as "before" | "after";
const OUT = process.env.OUT ?? "docs/kus/cr";
let pass = 0; const bad: string[] = []; const log: string[] = [];
const say = (s: string) => { console.log(s); log.push(s); };
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass++; say(`  PASS  ${w}${saw ? " — " + saw : ""}`); }
  else { bad.push(w); say(`  FAIL  ${w}${saw ? " — " + saw : ""}`); }
};
type Ctx = reg.CampusContext & { unsupported?: true };
const blocked = (c: Ctx) => c.unsupported === true;

async function main() {
  guard();
  mkdirSync(OUT, { recursive: true });
  say(`── CR-03 검사 (${MODE === "after" ? "변경 후 · patch 적용" : "변경 전 · 지금 HEAD"})`);

  /* 1. 등록부 전체의 명단 판정을 한 벌로 */
  const verdicts: Record<string, string> = {};
  for (const u of reg.universities()) {
    for (const r of reg.allLeaves(u)) {
      const c = checkStudent(u.university_code, { student_id: "X1", name: "x", department_code: r.leaf.code });
      verdicts[`${u.university_code}:${r.leaf.code}`] = c.ok
        ? `ok core=${c.value.ctx.core_code || "-"}${blocked(c.value.ctx as Ctx) ? " unsupported" : ""}`
        : "reject";
    }
  }
  writeFileSync(`${OUT}/cr03-verdicts.${MODE}.json`, JSON.stringify(verdicts, null, 1));
  const n = (pre: string, f: (v: string) => boolean) => Object.entries(verdicts).filter(([k, v]) => k.startsWith(pre) && f(v)).length;
  say(`  판정: PCU 발급 ${n("PCU:", (v) => v.startsWith("ok"))} · 거절 ${n("PCU:", (v) => v === "reject")} | JJU 발급 ${n("JJU:", (v) => v.startsWith("ok"))} · 거절 ${n("JJU:", (v) => v === "reject")} | KUS 발급 ${n("KUS:", (v) => v.startsWith("ok"))} · 거절 ${n("KUS:", (v) => v === "reject")}`);

  const kus = reg.university("KUS")!;
  const emc = reg.findLeaf(kus, "KUS26_EMC")!;
  const e = checkStudent("KUS", { student_id: "X1", name: "x", department_code: "KUS26_EMC" });
  if (MODE === "before") {
    ok("변경 전: Core 없는 KUS 자리는 계정을 거절한다", !e.ok, e.ok ? "" : e.why);
  } else {
    ok("변경 후: Core 없는 KUS 자리도 계정을 받는다", e.ok);
    if (e.ok) {
      const c = e.value.ctx as Ctx;
      ok("그 맥락은 Core 를 비우고 `검사 불가` 표시를 든다", c.core_code === "" && blocked(c));
      ok("그 학생에게 전공을 고르게 하지 않는다(다른 Core 를 임의로 잇지 않는다)", !reg.pickRequired(c));
      ok("그 자리는 학생에게 `준비 중` 이다", reg.statusOf(kus, emc) === "PREPARING");
    }
    const free = checkStudent("KUS", { student_id: "X1", name: "x", department_code: "KUS26_FREE_ST" });
    ok("자율전공 자리는 전과 같이 전공을 고르는 자리다", free.ok && reg.pickRequired(free.value.ctx) && !blocked(free.value.ctx as Ctx));
    const biz = checkStudent("KUS", { student_id: "X1", name: "x", department_code: "KUS26_CBIZ_GM" });
    ok("Core 가 있는 자리는 전과 같다", biz.ok && biz.value.ctx.core_code === "BIZ_CORE_V1" && !blocked(biz.value.ctx as Ctx));
  }
  /* 배재 · 전주대는 플래그를 켜지 않았다 → 판정이 한 줄도 달라지지 않아야 한다(두 벌 대조는 cr03-diff) */
  const pcuNoCore = reg.allLeaves(reg.university("PCU")!).find((r) => !r.leaf.core_code && !r.leaf.routing_only);
  if (pcuNoCore) {
    const p = checkStudent("PCU", { student_id: "X1", name: "x", department_code: pcuNoCore.leaf.code });
    ok("배재(플래그 꺼짐)의 Core 없는 자리는 변경 전후 모두 거절", !p.ok, pcuNoCore.leaf.code);
  }

  /* 2. 실제 DB: 발급 · 로그인 주체 · 응시 막기 · 격리 */
  if (MODE === "after") {
    const { orgId } = await kusOrgSetup();
    const pcuOrg = await org("PCU", "[테스트] 배재대학교");
    const sjOrg = await org("SJ_QA", "[테스트] 진흥원 대역 기관", "agency");
    await admin("qa-kus-admin", orgId, "unused");
    const s = await student("KUS", orgId, "QA26U01", "[테스트] KUS 미지원전공", "KUS26_EMC");
    ok("Core 없는 학과 학생 계정이 발급되고 학교 맥락이 선다", (s.ctx as Ctx).unsupported === true, s.dept);
    ok("그 학생은 KUS 학생 화면에 들어간다(로그인 · 탐방 기록)", Boolean(await kusStudentOf(s.userId)));
    let threw = "";
    try { await openAttempt({ userId: s.userId, tier: "PRO", stage: "bachelor", gradField: null, campus: s.ctx }); }
    catch (x) { threw = String((x as Error).message); }
    ok("그 학생에게는 응시가 열리지 않는다(기본 전공으로 새지 않는다)", threw.includes("Core 없음"), threw);
    const at = await queryOne<{ n: string }>(`SELECT count(*)::text n FROM v3_attempts WHERE user_id = $1::bigint`, [s.userId]);
    ok("응시 줄이 하나도 생기지 않는다", at?.n === "0", at?.n);
    const kv = await campusV3({ orgIds: [Number(orgId)], universityCode: "KUS", withDemo: true });
    ok("KUS 담당자 집계의 대상자에 그 학생이 잡힌다", kv.roster >= 1, `명단 ${kv.roster}`);
    const pv = await campusV3({ orgIds: [Number(pcuOrg)], universityCode: "PCU", withDemo: true });
    const pcuHas = await queryOne<{ n: string }>(`SELECT count(*)::text n FROM campus_students WHERE university_code = 'PCU' AND user_id = $1::bigint`, [s.userId]);
    ok("배재 집계 · 명단에 그 학생이 없다", pcuHas?.n === "0", `PCU 명단 ${pv.roster}`);
    /* KUS 화면: 검사 이용 불가를 알리고 탐방 기록은 받는다 (공통 파일을 고치지 않은 KUS 쪽 준비) */
    const me = (await kusStudentOf(s.userId))!;
    ok("KUS 화면이 그 학생을 `검사 이용 불가` 로 읽는다", examUnavailable(me));
    const w = await kusWorkspace({ id: s.userId, name: "x" } as never, me);
    ok("홈 상태가 미지원 학생으로 선다", w.unsupported === true && w.mode === "PREPARING");
    const todos = kusTodos({ mode: w.mode, st: w.st, analysis: null, visits: w.visits, programs: w.programs, unsupported: true });
    ok("첫 할 일이 탐방 기록이고 검사 시작을 띄우지 않는다",
      todos[0]?.href === "/kus/visits/new" && !todos.some((t) => t.href.includes("/start")), todos.map((t) => t.title).join(" / "));
    const cv = checkVisit({ company_name: "[테스트] 가상기업 A", role_text: "공정기술 엔지니어", activities: ["SITE_TOUR"],
      role_codes: ["R1"], td_codes: ["TD01"] }, { roles: [], tds: [], programs: await visitPrograms() });
    ok("사전이 없으면 직무·영역 코드를 받지 않고 적은 말만 받는다", cv.ok && !cv.value.role_codes.length && !cv.value.td_codes.length);
    if (cv.ok) {
      const vid = await addVisit(s.userId, null, cv.value);
      const v = await visitOf(s.userId, vid);
      ok("탐방 기록이 Core 없이 저장된다", Boolean(v) && v!.core_code === null, `기록 ${vid}`);
    }
    const sj = await outsider("qa-sj-seeker", sjOrg);
    ok("진흥원 대역 사용자는 여전히 학교 맥락이 없다", (await campusStudentContext(sj)) === null);
    ok("진흥원 대역 사용자는 KUS 학생이 아니다", (await kusStudentOf(sj)) === null);
    void query;
  }

  writeFileSync(`${OUT}/cr03-check.${MODE}.log`, log.join("\n") + `\n\nPASS ${pass} · FAIL ${bad.length}\n`);
  say(`\n  PASS ${pass} · FAIL ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((x) => { console.error(x); process.exit(1); });
