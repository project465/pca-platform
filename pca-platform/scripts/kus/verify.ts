/**
 * KUS 학생 흐름을 **제품과 같은 함수로** 끝까지 밟는다(서버 쪽 E2E).
 *
 * 계정 발급(`provisionStudent`) → KUS 학생인가(`kusStudentOf`) → 응시 열기
 * (`openAttempt`) → 저장(`saveAnswer`) → 닫고 다시 열기(이어하기) → 제출 두 번
 * 동시에(`submit`) → 결과 다시 읽기 → 기업탐방 저장(`checkVisit` · `addVisit`)
 * → 직접 해 본 활동을 공통 경험으로(`addExperience` · `linkExperience`) →
 * KUS 분석 · 리포트 HTML · PDF → 학생 사이 · 기관 사이 격리 → 담당자 권한.
 *
 * **채점을 거치지 않은 값을 쓰지 않는다.** 세 학생(RICH · POOR · CONTRA)은
 * 같은 학과(융합경영학부 글로벌경영전공 · 경영 Core)에서 **답만 다르게** 하고,
 * 결과는 공통 엔진이 낸 굳은 결과를 그대로 읽는다.
 *
 * **테스트 자료만 쓴다.** 학생 이름이 `[테스트]` 로 시작하고 탐방 기업은
 * `[테스트] 가상기업 A` 다. 진흥원 자리는 테스트 대역 기관(`SJ_QA`)이고 실제
 * 진흥원 표·자료에 닿지 않는다.
 *
 *   APP_ENV=dev V3_CAMPUS_FIXTURE=scripts/fixtures/campus-kus.json APPLY=yes \
 *   OUT=docs/kus/r1/qa npx tsx scripts/kus/verify.ts
 */
import { mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { query, queryOne } from "../../src/lib/db";
import { campusV3 } from "../../src/lib/me-v3/campus";
import { canInOrg, canReadParticipantReport } from "../../src/lib/rbac";
import { packs } from "../../src/lib/me-v3/core-registry";
import { controlOf } from "../../src/lib/me-v3/runtime/menus";
import {
  answersOf, attemptOf, checklistFor, choosePack, currentAttempt, itemOf, menuContextOf,
  moveTo, openAttempt, roleChoices, saveAnswer, savePicks, submit, viewOf, type V3Attempt,
} from "../../src/lib/me-v3/runtime/session";
import { addExperience } from "../../src/lib/me-v3/platform";
import type { Answer } from "../../src/lib/me-v3/scoring/types";
import { KUS_CODE, deptMode, kusDepartments } from "../../src/lib/kus/program";
import { isKusAdmin, kusStudentOf } from "../../src/lib/kus/access";
import {
  addVisit, checkVisit, linkExperience, visitCounts, visitOf, visitPrograms, visitsOf,
} from "../../src/lib/kus/visits";
import { kusBundle } from "../../src/lib/kus/load";
import { kusReportFor, kusReportPdf } from "../../src/lib/kus/report-pdf";
import {
  admin, guard, kusOrgSetup, org, outsider, student, testProgram,
} from "./demo-setup";

const OUT = process.env.OUT ?? "docs/kus/r1/qa";
const DEPT = "KUS26_CBIZ_GM";
const CORE = "BIZ_CORE_V1";

let pass = 0; const bad: string[] = []; const log: string[] = [];
const say = (s: string) => { console.log(s); log.push(s); };
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass++; say(`  PASS  ${w}${saw ? " — " + saw : ""}`); }
  else { bad.push(w); say(`  FAIL  ${w}${saw ? " — " + saw : ""}`); }
};

/* ── 사람 셋. 같은 학과, 다른 답 ─────────────────────────────────── */
type Persona = {
  id: "RICH" | "POOR" | "CONTRA"; label: string;
  grid: (td: string) => [number, number, number];
  level: (td: string | null, axis: string | null, module: string) => number;
  picks: (td: string, slot: string) => number;
  choice: number;
};
const STRONG = ["TD01", "TD02", "TD08", "TD11"];
const PERSONAS: Persona[] = [
  {
    id: "RICH", label: "경험·근거가 많은 학생(전략·마케팅·데이터·글로벌 쪽에서 직접 정해 본 일이 많다)",
    grid: (td) => STRONG.includes(td) ? [5, 2, 5] : [3, 1, 4],
    level: (td, axis, module) => {
      if (module === "INDUSTRY" || module === "ROLE") return 2;
      if (td && STRONG.includes(td)) return axis === "J8" ? 2 : 3;
      return 1;
    },
    picks: (td, slot) => STRONG.includes(td) ? (slot === "VERIFY" ? 2 : 3) : 1,
    choice: 0,
  },
  {
    id: "POOR", label: "경험이 거의 없는 학생(관심은 보통 · 해 본 일 없음)",
    grid: () => [3, 0, 3],
    level: () => 0,
    picks: () => 0,
    choice: 1,
  },
  {
    id: "CONTRA", label: "응답이 어긋나는 학생(모든 영역 관심 최고 · 해 본 적 없음인데 직접 정했다고 답함 · 근거 0)",
    grid: () => [5, 0, 5],
    level: (_td, _axis, module) => (module === "INDUSTRY" || module === "ROLE" ? 0 : 9),
    picks: () => 0,
    choice: 2,
  },
];

function firstPack(core: string, kind: "industry" | "role"): string | null {
  try { return packs<{ packs: { code: string }[] }>(core, kind).packs[0]?.code ?? null; }
  catch { return null; }
}

/** 응시 화면을 차례대로 밟는다. `stopAfter` 화면에서 멈추면 이어하기를 잰다 */
async function walk(core: string, a0: V3Attempt, userId: string, p: Persona, stopAfter: number | null, seen: string[]) {
  const ind = firstPack(core, "industry");
  const role = firstPack(core, "role");
  let a = (await attemptOf(a0.id, userId)) as V3Attempt;
  let want: string | null = a.current_screen ?? null;
  for (let n = 0; ; n += 1) {
    if (n > 400) throw new Error("화면이 끝나지 않는다");
    if (stopAfter !== null && n >= stopAfter) return { done: false, a };
    const v = await viewOf(a, want);
    seen.push(`${v.screen.kind}${v.screen.domain ? ":" + v.screen.domain : ""}`);
    const ctx = await menuContextOf(a);
    for (const id of v.screen.items) {
      if (v.answers[id]) continue;
      const it = itemOf(core, id);
      if (!it) continue;
      const control = controlOf(it, ctx);
      const td = it.technical_domain ?? null;
      let ans: Answer | null = null;
      if (it.module === "CORE-GRID" && td) {
        const [i, e, l] = p.grid(td);
        ans = it.measurement_axis === "exposure" ? { kind: "exposure", value: e }
          : { kind: "scale5", value: it.measurement_axis === "interest" ? i : l };
      } else if (control.kind === "level") {
        ans = { kind: "level", index: Math.min(p.level(td, it.evidence_axis ?? null, it.module), control.options.length - 1) };
      } else if (control.kind === "scale5") {
        ans = { kind: "scale5", value: td ? p.grid(td)[0] : 3 };
      } else if (control.kind === "exposure") {
        ans = { kind: "exposure", value: td ? p.grid(td)[1] : 0 };
      } else if (control.kind === "steps") {
        const opts = control.options.filter((o) => o.value !== null);
        const g = td ? p.grid(td) : [3, 1, 3];
        const want5 = it.measurement_axis === "learning_intent" ? g[2] : g[0];
        const pick = control.answer === "exposure"
          ? opts[Math.min(g[1], opts.length - 1)] : opts[Math.min(want5 - 1, opts.length - 1)];
        ans = control.answer === "exposure"
          ? { kind: "exposure", value: pick.value as number }
          : { kind: "scale5", value: pick.value as number };
      } else if (control.kind === "choice" && control.options.length) {
        ans = { kind: "choice", value: control.options[Math.min(p.choice, control.options.length - 1)].value };
      }
      if (ans) await saveAnswer(a.id, id, ans);
    }
    if (v.screen.kind === "checklist" && v.screen.domain) {
      for (const g of checklistFor(core, v.screen.domain)) {
        await savePicks(a.id, v.screen.domain, g.slot, g.items.slice(0, p.picks(v.screen.domain, g.slot)));
      }
    }
    if (v.screen.kind === "pick-industry" && ind) await choosePack(core, a.id, "industry", ind);
    if (v.screen.kind === "pick-role" && role) await choosePack(core, a.id, "role", role);
    if (!v.nextId) { await moveTo(a.id, v.screen.id); return { done: true, a }; }
    await moveTo(a.id, v.nextId);
    want = v.nextId;
    a = (await attemptOf(a.id, userId)) as V3Attempt;
  }
}

/** 학생 화면이 개인 결과를 부르는 길을 담당자 화면이 갖지 않는가(소스로 센다) */
function adminSourceClean(): { ok: boolean; saw: string } {
  const dir = "src/app/kus/admin";
  const files: string[] = [];
  const walkDir = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walkDir(p); else files.push(p);
    }
  };
  try { walkDir(dir); } catch { return { ok: false, saw: "담당자 화면이 없다" }; }
  const banned = ["kusBundle", "latestResult", "v3_snapshots", "result_model", "visitsOf", "kusReportFor", "answersOf"];
  const hits = files.flatMap((f) => banned.filter((b) => readFileSync(f, "utf8").includes(b)).map((b) => `${f}:${b}`));
  return { ok: hits.length === 0, saw: hits.join(", ") || `${files.length}개 파일에 개인 결과 호출 0` };
}

async function main() {
  guard();
  mkdirSync(OUT, { recursive: true });
  mkdirSync(`${OUT}/pdf`, { recursive: true });

  say("── 1. 학교 등록부와 학과 상태");
  const depts = kusDepartments();
  const live = depts.filter((d) => d.mode === "LIVE").map((d) => d.code);
  const demo = depts.filter((d) => d.mode === "DEMO").map((d) => d.code);
  ok("KUS 등록부가 fixture 로 선다", depts.length > 0, `자리 ${depts.length}`);
  ok("운영 규칙으로 열린 자리는 융합경영 두 전공뿐", JSON.stringify(live) === JSON.stringify(["KUS26_CBIZ_GM", "KUS26_CBIZ_DM"]), live.join(","));
  ok("CS·EE 는 미리보기로만 열린다(시연 표시)", process.env.V3_PREVIEW_OPEN ? demo.includes("KUS26_CSW") && demo.includes("KUS26_EIE") : demo.length === 0, demo.join(",") || "(미리보기 없음)");
  ok("Core 가 없는 자리(교육과정 미확인)는 준비 중", deptMode("KUS26_EMC") === "PREPARING", deptMode("KUS26_EMC"));
  /* B 등급(근거가 얇아 보완 후 사용)은 Core 를 잇되 운영 규칙으로 열지 않는다. 미리보기 문이 열린 Core 면 시연 전용으로만 선다 */
  ok("B 등급 자리는 운영 규칙으로 열리지 않는다", ["KUS26_AICS", "KUS26_FOODBIO", "KUS26_CCRE_MEDIA", "KUS26_GOVADM"].every((c) => !live.includes(c)),
    ["KUS26_AICS", "KUS26_FOODBIO", "KUS26_CCRE_MEDIA"].map((c) => `${c}=${deptMode(c)}`).join(" "));
  ok("자유전공학부는 Core 를 들지 않는다", depts.filter((d) => d.code.startsWith("KUS26_FREE")).every((d) => d.mode === "PREPARING" && !d.core_code));

  say("\n── 2. 기관 · 담당자 · 학생 (테스트)");
  const { orgId: kusOrg } = await kusOrgSetup();
  const pcuOrg = await org("PCU", "[테스트] 배재대학교");
  const sjOrg = await org("SJ_QA", "[테스트] 진흥원 대역 기관", "agency");
  const kusAdmin = await admin("qa-kus-admin", kusOrg, "unused-in-server-check");
  const pcuAdmin = await admin("qa-pcu-admin", pcuOrg, "unused-in-server-check");
  const sjAdmin = await admin("qa-sj-admin", sjOrg, "unused-in-server-check");
  const prog = await testProgram();
  const S = await Promise.all(PERSONAS.map((p, i) => student(KUS_CODE, kusOrg, `QA26${String(i + 1).padStart(3, "0")}`, `[테스트] KUS ${p.id}`, DEPT)));
  const P = await student("PCU", pcuOrg, "QAP1", "[테스트] 배재 학생", "PCU26_BIZ");
  const sjUser = await outsider("qa-sj-seeker", sjOrg);
  /* 화면 확인용: 검사를 푸는 중에 멈춘 학생 하나(홈의 `이어하기` 상태) */
  const MID = await student(KUS_CODE, kusOrg, "QA26004", "[테스트] KUS 진행중", "KUS26_CBIZ_DM");
  ok("KUS 학생 셋이 같은 학과 맥락을 든다", S.every((s) => s.ctx.department_code === DEPT && s.ctx.core_code === CORE), S.map((s) => s.ctx.specialization).join(","));
  ok("KUS 학생은 kusStudentOf 를 지난다", (await Promise.all(S.map((s) => kusStudentOf(s.userId)))).every(Boolean));
  ok("배재 학생은 KUS 학생이 아니다", (await kusStudentOf(P.userId)) === null);
  ok("진흥원 대역 사용자는 KUS 학생이 아니다", (await kusStudentOf(sjUser)) === null);

  say("\n── 3. 검사: 열기 · 중간 저장 · 이어하기 · 제출 · 중복 제출");
  const att: Record<string, string> = {};
  const counts: Record<string, number> = {};
  for (let i = 0; i < PERSONAS.length; i += 1) {
    const p = PERSONAS[i]; const s = S[i];
    const a0 = await openAttempt({ userId: s.userId, tier: "BASIC", stage: "bachelor", gradField: null, campus: s.ctx });
    ok(`${p.id} 응시가 KUS 학교 맥락 · PRO 로 열린다(BASIC 을 넘겨도)`, a0.tier === "PRO" && a0.university_code === KUS_CODE && a0.department_code === DEPT && a0.core_code === CORE, `${a0.tier} ${a0.core_code} ${a0.specialization_code}`);
    const seen: string[] = [];
    let a = a0;
    if (p.id === "RICH") {
      const half = await walk(CORE, a0, s.userId, p, 10, seen);
      const before = Object.keys(await answersOf(a0.id)).length;
      const screen = half.a.current_screen;
      const again = await currentAttempt(s.userId);
      const reopen = await openAttempt({ userId: s.userId, tier: "PRO", stage: "bachelor", gradField: null, campus: s.ctx });
      const after = Object.keys(await answersOf(a0.id)).length;
      ok("이어하기: 같은 응시로 돌아온다", again?.id === a0.id && reopen.id === a0.id, `응시 ${a0.id}`);
      ok("이어하기: 중간 저장한 답이 그대로다", before > 0 && before === after, `답 ${before}개 · 화면 ${screen}`);
      ok("이어하기: 멈춘 화면에서 다시 선다", again?.current_screen === screen, String(again?.current_screen));
      const n = await queryOne<{ n: string }>(`SELECT count(*)::text n FROM v3_attempts WHERE user_id=$1::bigint`, [s.userId]);
      ok("이어하기: 응시가 하나다", n?.n === "1", n?.n);
      a = reopen;
    }
    const w = await walk(CORE, a, s.userId, p, null, seen);
    ok(`${p.id} 끝까지 간다`, w.done, `화면 ${seen.length}`);
    counts[p.id] = Object.keys(await answersOf(a0.id)).length;
    const fin = (await attemptOf(a0.id, s.userId)) as V3Attempt;
    const [r1, r2] = await Promise.all([submit(fin), submit(fin)]);
    const snaps = await queryOne<{ n: string }>(`SELECT count(*)::text n FROM v3_snapshots WHERE attempt_id=$1`, [a0.id]);
    ok(`${p.id} 동시 제출 둘에도 결과가 한 벌`, snaps?.n === "1" && r1.id === r2.id, `스냅샷 ${snaps?.n} · 답 ${counts[p.id]}`);
    await submit((await attemptOf(a0.id, s.userId)) as V3Attempt);
    const snaps2 = await queryOne<{ n: string }>(`SELECT count(*)::text n FROM v3_snapshots WHERE attempt_id=$1`, [a0.id]);
    ok(`${p.id} 끝난 뒤 다시 제출해도 늘지 않는다`, snaps2?.n === "1");
    att[p.id] = a0.id;
  }
  {
    const a0 = await openAttempt({ userId: P.userId, tier: "PRO", stage: "bachelor", gradField: null, campus: P.ctx });
    await walk("BIZ_CORE_V1", a0, P.userId, PERSONAS[0], null, []);
    await submit((await attemptOf(a0.id, P.userId)) as V3Attempt);
    att.PCU = a0.id;
    ok("배재 학생 응시는 PCU 로 적힌다", a0.university_code === "PCU");
  }

  {
    const a0 = await openAttempt({ userId: MID.userId, tier: "PRO", stage: "bachelor", gradField: null, campus: MID.ctx });
    await walk(CORE, a0, MID.userId, PERSONAS[1], 8, []);
    const n = Object.keys(await answersOf(a0.id)).length;
    ok("진행중 학생은 중간에 멈춘 응시 하나를 든다", a0.status === "in_progress" && n > 0, `답 ${n}개`);
  }

  say("\n── 4. 기업탐방 기록");
  const programs = await visitPrograms();
  ok("담당자가 등록한 탐방(테스트) 하나가 보인다", programs.some((x) => x.id === prog && x.is_test), programs.map((x) => x.company_name).join(","));
  const roles = roleChoices(CORE).map((r) => r.code);
  const tds = ["TD01", "TD02", "TD03", "TD04", "TD05", "TD06", "TD07", "TD08", "TD09", "TD10", "TD11", "TD12"];
  const allowed = { roles, tds, programs };
  const refused = checkVisit({ program_id: prog, activities: [] }, allowed);
  ok("직무도 활동도 없는 기록은 거절한다", !refused.ok, refused.ok ? "" : refused.why);
  const forged = checkVisit({ program_id: "999999", role_codes: [roles[0]], activities: ["QNA"] }, allowed);
  ok("등록되지 않은 탐방 번호는 거절한다", !forged.ok);
  const sneaky = checkVisit({ program_id: prog, role_codes: [roles[0], "ROLE_FAKE"], td_codes: ["TD01", "TD99"], activities: ["QNA", "HACK"] }, allowed);
  ok("사전에 없는 직무·영역·활동 코드는 기록에 서지 않는다", sneaky.ok && sneaky.value.role_codes.length === 1 && sneaky.value.td_codes.join() === "TD01" && sneaky.value.activities.join() === "QNA");

  const visitPlan: Record<string, Parameters<typeof checkVisit>[0] | null> = {
    RICH: { program_id: prog, visited_on: "2026-11-12", role_codes: [roles[0], roles[1]],
      understood: "제품 기획에서 출시까지 시장 조사 자료로 우선순위를 정하는 과정", activities: ["BRIEFING", "QNA", "TASK", "PRESENT"],
      activity_text: "신제품 출시 국가를 두 곳 가운데 하나로 고르는 과제를 팀으로 풀고 발표했다",
      learned: "해외 진출 판단에서 환율보다 현지 유통 구조를 먼저 본다는 것", td_codes: ["TD01", "TD11"] },
    POOR: { program_id: prog, visited_on: "2026-11-12", role_codes: [roles[2] ?? roles[0]],
      understood: null, activities: ["BRIEFING", "SITE_TOUR"], learned: "회사에 다양한 부서가 있다는 것", td_codes: [] },
    CONTRA: { company_name: "[테스트] 학생이 적은 기업", visited_on: "2026-11-20", role_codes: [], role_text: "해외영업",
      understood: "수출 계약 과정", activities: ["MENTOR"], learned: null, td_codes: ["TD03"] },
  };
  const visitIds: Record<string, string> = {};
  for (let i = 0; i < PERSONAS.length; i += 1) {
    const p = PERSONAS[i]; const s = S[i];
    const plan = visitPlan[p.id];
    if (!plan) continue;
    const c = checkVisit(plan, allowed);
    ok(`${p.id} 탐방 기록이 검사를 지난다`, c.ok, c.ok ? "" : c.why);
    if (!c.ok) continue;
    visitIds[p.id] = await addVisit(s.userId, s.ctx.core_code, c.value);
    const back = await visitOf(s.userId, visitIds[p.id]);
    ok(`${p.id} 저장한 탐방을 다시 읽는다`, back?.company_name === c.value.company_name && back.core_code === CORE, `${back?.company_name} · ${back?.confirmed ? "등록 탐방" : "확인 전"}`);
  }
  /* RICH 는 직접 해 본 활동을 공통 경험으로 옮긴다 */
  {
    const s = S[0];
    const eid = await addExperience(s.userId, {
      kind: "project", title: "[테스트] 기업탐방 과제: 출시 국가 고르기", td_codes: ["TD11"], axis_codes: [],
      note_text: null,
    });
    ok("직접 해 본 활동을 공통 경험으로 옮긴다", Boolean(eid) && await linkExperience(s.userId, visitIds.RICH, eid), `경험 ${eid}`);
    ok("남의 경험 번호는 탐방에 잇지 못한다", !(await linkExperience(S[1].userId, visitIds.POOR, eid)));
  }
  const before = await queryOne<{ m: string }>(`SELECT result_model::text m FROM v3_snapshots WHERE attempt_id=$1`, [att.POOR]);
  ok("탐방 기록이 굳은 결과를 바꾸지 않는다", Boolean(before?.m) && !before!.m.includes("가상기업"));

  say("\n── 5. 개인별 결과 · 리포트 · PDF (RICH / POOR / CONTRA)");
  const read: Record<string, unknown> = {};
  const html: Record<string, string> = {};
  for (let i = 0; i < PERSONAS.length; i += 1) {
    const p = PERSONAS[i]; const s = S[i];
    const b = await kusBundle(s.userId, att[p.id]);
    ok(`${p.id} KUS 분석 묶음이 선다`, b.ok, b.ok ? "" : b.why);
    if (!b.ok) continue;
    const A = b.value.analysis;
    read[p.id] = {
      label: p.label, attempt: att[p.id], answered: counts[p.id], tier: A.tier,
      badge: A.status.badge, coreBadge: A.status.coreBadge, title: A.status.title, quality: A.status.quality,
      reliability: A.reliability,
      counts: A.status.counts,
      zones: A.major.rows.map((r) => `${r.name}:${r.zoneKo}`),
      evidence_ready: A.evidence.ready.map((g) => g.domain), evidence_partial: A.evidence.partial.map((g) => g.domain),
      roles: A.interests.roles.map((r) => `${r.name}(${r.from})`), industries: A.interests.industries.map((r) => `${r.name}(${r.from})`),
      link_role: A.link.role, link: A.link.rows.map((r) => `${r.domain} ${r.hit}/${r.all}`),
      gaps: A.gaps.map((g) => `${g.domains} · ${g.title}`), actions: A.actions.slice(0, 3).map((x) => x.do),
      visits: A.visits.map((v) => ({ company: v.company, did: v.did.length, linked: v.linked, observeOnly: v.draft.observeOnly, letter: v.draft.letter })),
      plan: A.plan, test: b.value.test,
    };
    const r = await kusReportFor(att[p.id], s.userId);
    ok(`${p.id} 리포트 HTML 이 선다`, r.ok);
    if (!r.ok) continue;
    html[p.id] = r.html;
    writeFileSync(`${OUT}/pdf/kus-report-${p.id}.html`, r.html);
    ok(`${p.id} 리포트에 테스트 띠가 선다`, r.html.includes("테스트 데이터"));
    ok(`${p.id} 리포트에 여덟 장이 다 있다`, ["개인 현황", "전공·역량 분석", "경험·Evidence", "관심 산업·직무", "직무 요구사항과 Gap", "탐방 경험과 직무 연결", "자기소개서·면접 활용", "30·60·90일 실행 계획"].every((t) => r.html.includes(t)));
    if (process.env.SKIP_PDF !== "1") {
      try {
        const pdf = await kusReportPdf(r.html);
        writeFileSync(`${OUT}/pdf/kus-report-${p.id}.pdf`, pdf);
        ok(`${p.id} PDF 가 뽑힌다`, pdf.length > 20000 && pdf.subarray(0, 4).toString() === "%PDF", `${pdf.length}바이트`);
      } catch (e) { ok(`${p.id} PDF 가 뽑힌다`, false, String((e as Error).message).split("\n")[0]); }
    }
  }
  const strip = (h: string) => h.replace(/\[테스트\] KUS (RICH|POOR|CONTRA)/g, "NAME").replace(/응시 \d+/g, "").replace(/\d{4}-\d{2}-\d{2}/g, "");
  ok("이름을 지우고 견줘도 세 리포트가 서로 다르다", new Set(Object.values(html).map(strip)).size === 3);
  const R = read as Record<string, { badge: string; coreBadge: string; reliability: { basis: string; caution: string | null }; counts: { confirmed: number; evidence: number; ready_domains: number }; quality: { flag: string }; evidence_ready: string[]; gaps: string[] }>;
  ok("RICH 는 POOR 보다 확인된 판단이 많다", R.RICH.counts.confirmed > R.POOR.counts.confirmed, `${R.RICH.counts.confirmed} > ${R.POOR.counts.confirmed}`);
  ok("RICH 는 근거가 선 영역이 있고 POOR 는 없다", R.RICH.counts.ready_domains > 0 && R.POOR.counts.ready_domains === 0, `${R.RICH.counts.ready_domains} · ${R.POOR.counts.ready_domains}`);
  ok("CONTRA 는 근거 없이 높게 답해도 근거가 서지 않는다", R.CONTRA.counts.ready_domains === 0 && R.CONTRA.counts.evidence === 0, JSON.stringify(R.CONTRA.counts));
  ok("CONTRA 는 응답 품질에 표시가 선다", R.CONTRA.quality.flag !== "OK", R.CONTRA.quality.flag);
  ok("CONTRA 는 `응답만으로 선 결과` 로 읽히고 머리 상태를 낮춰 적는다(판정은 그대로)",
    R.CONTRA.reliability.basis === "SELF_REPORT_ONLY" && R.CONTRA.badge === "근거 확인 전" && Boolean(R.CONTRA.reliability.caution),
    `${R.CONTRA.reliability.basis} · ${R.CONTRA.badge}`);
  ok("CONTRA 의 공통 상태 이름을 감추지 않는다", R.CONTRA.coreBadge.length > 0 && R.CONTRA.coreBadge !== R.CONTRA.badge, R.CONTRA.coreBadge);
  ok("RICH 는 근거가 받치는 결과다", R.RICH.reliability.basis !== "SELF_REPORT_ONLY" && R.RICH.badge === R.RICH.coreBadge, R.RICH.reliability.basis);
  ok("세 학생의 머리 상태가 모두 같지는 않다", new Set(PERSONAS.map((p) => R[p.id].badge)).size > 1, PERSONAS.map((p) => R[p.id].badge).join(" | "));
  writeFileSync(`${OUT}/rich-poor-contra.json`, JSON.stringify(read, null, 1));

  say("\n── 6. 학생 사이 격리");
  ok("POOR 는 RICH 의 탐방 기록을 열 수 없다", (await visitOf(S[1].userId, visitIds.RICH)) === null);
  ok("POOR 의 기록 목록에 RICH 의 기록이 없다", (await visitsOf(S[1].userId)).every((v) => v.id !== visitIds.RICH));
  const cross = await kusBundle(S[1].userId, att.RICH);
  ok("POOR 는 RICH 의 응시 번호로 결과·리포트를 열 수 없다", !cross.ok && cross.why === "NOT_FOUND", cross.ok ? "" : cross.why);
  const crossR = await kusReportFor(att.RICH, S[2].userId);
  ok("CONTRA 는 RICH 의 PDF 를 받을 수 없다", !crossR.ok);

  say("\n── 7. 기관 사이 격리 (KUS · 배재 · 진흥원 대역)");
  const pcuOwn = await kusBundle(P.userId, att.PCU);
  ok("배재 학생의 응시를 KUS 리포트로 그리지 않는다", !pcuOwn.ok && pcuOwn.why === "NOT_KUS", pcuOwn.ok ? "" : pcuOwn.why);
  ok("진흥원 대역 사용자는 KUS 응시를 열 수 없다", !(await kusBundle(sjUser, att.RICH)).ok);
  const kv = await campusV3({ orgIds: [Number(kusOrg)], universityCode: KUS_CODE, withDemo: true });
  const kdb = await queryOne<{ n: string }>(`SELECT count(DISTINCT user_id)::text n FROM v3_attempts WHERE university_code='KUS'`);
  ok("KUS 집계 시작 수에 배재 학생이 없다", kv.started === Number(kdb?.n ?? -1), `KUS 시작 ${kv.started} · 완료 ${kv.scored}`);
  ok("KUS 집계의 학과 칸에 다른 학교 코드가 없다", !kv.by_department.some((c) => !c.key.startsWith("KUS")), kv.by_department.map((c) => c.key).join(",") || "(5명 미만이라 칸 없음)");
  const pv = await campusV3({ orgIds: [Number(pcuOrg)], universityCode: "PCU", withDemo: true });
  ok("배재 집계에 KUS 학생이 없다", !pv.by_department.some((c) => c.key.startsWith("KUS")), `PCU 시작 ${pv.started}`);
  /* 다른 학교 학생의 줄이 이 표에 섞여 들어와도(손으로 넣은 줄) 집계는 KUS 학생만 센다 */
  await query(`INSERT INTO kus_company_visits (user_id, company_name, activities) VALUES ($1::bigint, '[테스트] 섞여 든 줄', '{QNA}')`, [P.userId]);
  const vc = await visitCounts();
  const want = await queryOne<{ s: string; v: string }>(
    `SELECT count(DISTINCT v.user_id)::text s, count(*)::text v FROM kus_company_visits v
       JOIN campus_students c ON c.user_id = v.user_id AND c.university_code = 'KUS'`);
  ok("탐방 집계가 KUS 학생만 센다(배재 학생 줄은 빠진다)", vc.students === Number(want?.s) && vc.visits === Number(want?.v), `${JSON.stringify(vc)} · KUS 학생 줄 ${want?.v}`);
  await query(`DELETE FROM kus_company_visits WHERE user_id = $1::bigint`, [P.userId]);

  say("\n── 8. 담당자 권한");
  ok("KUS 담당자는 KUS 담당자다", await isKusAdmin(kusAdmin));
  ok("배재 담당자는 KUS 담당자가 아니다", !(await isKusAdmin(pcuAdmin)));
  ok("진흥원 대역 담당자는 KUS 담당자가 아니다", !(await isKusAdmin(sjAdmin)));
  ok("KUS 학생은 KUS 담당자가 아니다", !(await isKusAdmin(S[0].userId)));
  const actor = { userId: Number(kusAdmin), role: "org_admin" as const, orgIds: [Number(kusOrg)] };
  ok("KUS 담당자는 배재 기관 자료를 만질 수 없다", !canInOrg(actor, "org.analytics.read", Number(pcuOrg)));
  ok("KUS 담당자는 진흥원 대역 기관 자료를 만질 수 없다", !canInOrg(actor, "org.analytics.read", Number(sjOrg)));
  const rep = canReadParticipantReport({ actor, orgId: Number(kusOrg), contractAllowsIndividualAccess: false, participantConsented: false });
  ok("KUS 담당자도 계약·동의 없이 개인 결과를 열 수 없다(공통 규칙)", !rep.ok, rep.reason ?? "");
  const src = adminSourceClean();
  ok("KUS 담당자 화면에 개인 결과를 부르는 길이 없다(소스)", src.ok, src.saw);

  writeFileSync(`${OUT}/verify.log`, log.join("\n") + `\n\nPASS ${pass} · FAIL ${bad.length}\n`);
  say(`\n  PASS ${pass} · FAIL ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
