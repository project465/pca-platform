/**
 * 전주대학교 부트캠프 시연을 **제품과 같은 함수로** 끝까지 밟는다.
 *
 * 화면 대신 서버 함수를 부른다: 계정 발급(`provisionStudent`) → 학교 맥락
 * (`campusStudentContext`) → 응시 열기(`openAttempt`) → 저장(`saveAnswer`)
 * → 닫고 다시 열기(이어하기) → 제출 두 번 동시에(`submit`) → 결과 다시
 * 읽기(`latestResult`) → 담당자 집계(`campusV3` · `listStudents`)와 기관
 * 사이 격리(`canInOrg` · `canReadParticipantReport`).
 *
 * **채점을 거치지 않은 값을 쓰지 않는다.** 세 학생은 같은 트랙(JJU1_AI ·
 * 컴퓨터·소프트웨어 검사의 인공지능·데이터 갈래)에서 **답만 다르게** 하고,
 * 결과는 공통 엔진이 낸 굳은 결과를 그대로 읽는다. 결과를 하드코딩하지
 * 않는다.
 *
 * **합성 QA 계정만 쓴다.** 다른 학교의 학생 자료를 쓰지 않고, 배재대 쪽도
 * 이 스크립트가 만든 합성 학생 한 명으로만 격리를 잰다.
 *
 * **운영에서 돌지 않는다.** `APP_ENV=production` 이거나 DB 가 이 기계가
 * 아니면 한 줄도 쓰지 않고 멈춘다.
 *
 *   APP_ENV=dev V3_CAMPUS_FIXTURE=scripts/fixtures/campus-jju.json \
 *   V3_PREVIEW_OPEN=CS_CORE_V1,EE_CORE_V1,BIZ_CORE_V1 APPLY=yes \
 *   OUT=docs/jju/qa npx tsx scripts/jju-verify.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { query, queryOne } from "../src/lib/db";
import { appEnv } from "../src/lib/env";
import { checkStudent, provisionStudent, campusStudentContext } from "../src/lib/campus/students";
import { assertLoginFree } from "../src/lib/jju/login-guard";
import { listStudents, studentCounts } from "../src/lib/campus/manage";
import { campusV3 } from "../src/lib/me-v3/campus";
import { canInOrg, canReadParticipantReport } from "../src/lib/rbac";
import { packs } from "../src/lib/me-v3/core-registry";
import { controlOf } from "../src/lib/me-v3/runtime/menus";
import {
  answersOf, attemptOf, checklistFor, choosePack, content, currentAttempt, domainName,
  itemOf, latestResult, menuContextOf, moveTo, openAttempt, rolesFromDomains,
  industriesFromDomains, industryChoices, roleName, saveAnswer, savePicks, submit, viewOf,
  type V3Attempt,
} from "../src/lib/me-v3/runtime/session";
import type { Answer } from "../src/lib/me-v3/scoring/types";
import type { ResultModel } from "../src/lib/me-v3/result/model";
import { actionKo, gapKo, headlineKo, headlineBadgeKo } from "../src/lib/me-v3/result/text.ko";
import { JJU_CODE, jjuUniversity, tracksOf } from "../src/lib/jju/program";

const OUT = process.env.OUT ?? "docs/jju/qa";
const TRACK = "JJU1_AI";

let pass = 0; const bad: string[] = []; const log: string[] = [];
const say = (s: string) => { console.log(s); log.push(s); };
const ok = (w: string, c: boolean, saw = "") => {
  if (c) { pass++; say(`  통과  ${w}${saw ? " — " + saw : ""}`); }
  else { bad.push(w); say(`  걸림  ${w}${saw ? " — " + saw : ""}`); }
};

/* ── 사람 셋. 같은 트랙, 다른 답 ─────────────────────────────── */
type Persona = {
  id: string; label: string;
  grid: (td: string) => [number, number, number];
  level: (td: string | null, axis: string | null, module: string) => number;
  picks: (td: string, slot: string) => number;
  choice: number;
};
const AI = ["TD09"];
const AI_NEAR = ["TD02", "TD04"];
const BUILD = ["TD01", "TD03", "TD05", "TD10"];
const BASE = ["TD02", "TD06", "TD07"];

const PERSONAS: Persona[] = [
  {
    id: "A", label: "AI 기초는 강하고 실무 경험이 적은 학생",
    grid: (td) => AI.includes(td) ? [5, 1, 5] : AI_NEAR.includes(td) ? [4, 1, 4] : [3, 0, 3],
    level: (td, axis, module) => {
      if (module === "INDUSTRY" || module === "ROLE") return 0;
      if (td && AI.includes(td)) return axis === "J4" || axis === "J1" ? 2 : 1;
      if (td && AI_NEAR.includes(td)) return 1;
      return 0;
    },
    picks: (td, slot) => AI.includes(td) && slot !== "ARTIFACT" && slot !== "VERIFY" ? 2 : 0,
    choice: 0,
  },
  {
    id: "B", label: "프로그래밍·프로젝트 경험은 많고 직무 이해가 약한 학생",
    grid: (td) => BUILD.includes(td) ? [4, 2, 4] : AI.includes(td) ? [3, 1, 3] : [3, 1, 2],
    level: (td, axis, module) => {
      if (module === "INDUSTRY" || module === "ROLE") return 0;
      if (td && BUILD.includes(td)) return axis === "J3" || axis === "J5" ? 3 : 2;
      if (td && AI.includes(td)) return 1;
      return 1;
    },
    picks: (td, slot) => BUILD.includes(td) ? (slot === "VERIFY" ? 1 : 2) : 0,
    choice: 0,
  },
  {
    id: "C", label: "전공 기초는 있고 AI 지식·근거가 부족한 학생",
    grid: (td) => AI.includes(td) ? [3, 0, 4] : BASE.includes(td) ? [3, 2, 3] : [3, 1, 3],
    level: (td, axis, module) => {
      if (module === "INDUSTRY" || module === "ROLE") return 1;
      if (td && AI.includes(td)) return 0;
      if (td && BASE.includes(td)) return axis === "J6" ? 2 : 1;
      return 1;
    },
    picks: (td, slot) => BASE.includes(td) && slot !== "ARTIFACT" && slot !== "VERIFY" ? 1 : 0,
    choice: 1,
  },
];

function firstPack(core: string, kind: "industry" | "role"): string | null {
  try { return packs<{ packs: { code: string }[] }>(core, kind).packs[0]?.code ?? null; }
  catch { return null; }
}

/** 응시 화면을 차례대로 밟는다. `stopAfter` 화면에서 멈추면 이어하기를 잰다 */
async function walk(
  core: string, a0: V3Attempt, userId: string, p: Persona,
  stopAfter: number | null, seen: string[],
): Promise<{ done: boolean; a: V3Attempt }> {
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

/* ── 결과를 사람이 읽는 말로. 결과지 화면이 부르는 함수 그대로 ──── */
function readOut(core: string, m: ResultModel) {
  const nm = (td: string) => domainName(core, td);
  const h = headlineKo(m, nm);
  const ready = [...new Set(m.evidence.ready.map((g) => g.domain))];
  const partial = [...new Set(m.evidence.partial.map((g) => g.domain))];
  const confirmed = m.domains.filter((d) => d.axes.some((x) => x.state === "CONFIRMED" || x.state === "OWNED")).map((d) => d.code);
  const ind = new Map(industryChoices(core).map((x) => [x.code, x.name]));
  return {
    badge: headlineBadgeKo(m),
    headline: h.title, lead: h.lead,
    focus: m.overview.focus.map(nm),
    zones: Object.fromEntries(m.domains.filter((d) => d.zone !== "NOT_EXPLORED").map((d) => [nm(d.code), d.zone])),
    counts: m.overview.counts,
    evidence_ready: ready.map(nm),
    evidence_partial: partial.map(nm),
    gaps: m.gaps.slice(0, 4).map((g) => gapKo(g, nm(g.domain)).title),
    actions: m.actions.slice(0, 3).map((a) => actionKo(a, a.domain ? nm(a.domain) : "", m.stage)),
    roles: rolesFromDomains(core, confirmed.length ? confirmed : m.overview.focus).slice(0, 3)
      .map((r) => `${roleName(core, r.code)} ← ${[...r.core_domains, ...r.seen_domains].map(nm).join("·")}`),
    industries: industriesFromDomains(core, confirmed.length ? confirmed : m.overview.focus).slice(0, 3).map((r) => ind.get(r.code) ?? r.code),
    quality: m.response_quality.flag,
  };
}

async function org(code: string, name: string): Promise<string> {
  const r = await queryOne<{ id: string }>(
    `INSERT INTO organizations (code, country, org_type, status, name, language, is_demo)
     VALUES ($1, 'KR', 'university', 'active', $2, 'ko', FALSE)
     ON CONFLICT (code) DO UPDATE SET status='active', name=EXCLUDED.name
     RETURNING id::text`, [code, name]);
  return r?.id as string;
}
async function admin(login: string, orgId: string): Promise<string> {
  const r = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, display_name, password_hash, status, locale, must_reset_pw)
     VALUES ($1, $1, 'x', 'active', 'ko', FALSE)
     ON CONFLICT (login_id) DO UPDATE SET status='active' RETURNING id::text`, [login]);
  await query(`INSERT INTO memberships (user_id, org_id, role) VALUES ($1::bigint,$2::bigint,'org_admin')
               ON CONFLICT (user_id, org_id, role) DO NOTHING`, [r?.id, orgId]);
  return r?.id as string;
}

async function student(uni: string, orgId: string, sid: string, name: string, dept: string) {
  const c = checkStudent(uni, { student_id: sid, name, login_id: `qa-${uni.toLowerCase()}-${sid.toLowerCase()}`, department_code: dept });
  if (!c.ok) throw new Error(`${sid}: ${c.why}`);
  await assertLoginFree(c.value.loginId, uni);
  const got = await provisionStudent(orgId, c.value, { rotate: true });
  /* 같은 계정으로 다시 돌릴 때 앞 응시를 치운다: 이 계정은 QA 전용이다 */
  await query(`DELETE FROM v3_snapshots WHERE attempt_id IN (SELECT id FROM v3_attempts WHERE user_id=$1::bigint)`, [got.userId]);
  await query(`DELETE FROM v3_attempts WHERE user_id=$1::bigint`, [got.userId]);
  const mine = await campusStudentContext(got.userId);
  if (!mine) throw new Error(`${sid}: 학교 맥락이 서지 않는다`);
  return { userId: got.userId, ctx: mine.ctx, dept: mine.department_name };
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (appEnv() === "production") { console.error("운영에서 돌지 않는다"); process.exit(2); }
  const host = (() => { try { return new URL(url).hostname; } catch { return ""; } })();
  if (!["127.0.0.1", "localhost", ""].includes(host)) { console.error("이 기계의 DB 가 아니다"); process.exit(2); }
  if ((process.env.APPLY ?? "") !== "yes") { console.error("APPLY=yes 를 주십시오(합성 QA 계정을 만든다)"); process.exit(2); }
  const u = jjuUniversity();
  if (!u) throw new Error("V3_CAMPUS_FIXTURE 가 없다(전주대는 시연 fixture 로만 선다)");
  mkdirSync(OUT, { recursive: true });

  say("── 1. 트랙과 검사 연결");
  const t = tracksOf(u).find((x) => x.code === TRACK)!;
  ok("JJU1_AI 가 컴퓨터·소프트웨어 검사로 이어진다", t.core_code === "CS_CORE_V1", `${t.core_code} · ${t.spec_name} · ${t.mode}`);
  ok("JJU1_AI 는 운영에서 열리지 않는다(시연 전용)", t.mode === "DEMO", t.mode);

  say("\n── 2. 기관·담당자·학생 (합성)");
  const jjuOrg = await org(JJU_CODE, "전주대학교 (QA)");
  const pcuOrg = await org("PCU", "배재대학교 (QA)");
  const jjuAdmin = await admin("qa-jju-admin", jjuOrg);
  const pcuAdmin = await admin("qa-pcu-admin", pcuOrg);
  const S = await Promise.all(PERSONAS.map((p) => student(JJU_CODE, jjuOrg, `QA${p.id}`, `QA 학생 ${p.id}`, TRACK)));
  const P = await student("PCU", pcuOrg, "QAP1", "QA 배재 학생", "PCU26_BIZ");
  ok("JJU 학생 셋이 같은 트랙 맥락을 든다", S.every((s) => s.ctx.department_code === TRACK && s.ctx.core_code === "CS_CORE_V1"), S.map((s) => s.ctx.specialization).join(","));
  ok("PCU 학생은 PCU 경영학과 맥락을 든다", P.ctx.university_code === "PCU" && P.ctx.core_code === "BIZ_CORE_V1", `${P.ctx.department_code}`);

  say("\n── 3. 응시 열기 · 이어하기 · 제출 · 다시 읽기");
  const results: Record<string, { model: ResultModel; attempt: string; out: ReturnType<typeof readOut>; screens: string[] }> = {};
  for (let i = 0; i < PERSONAS.length; i += 1) {
    const p = PERSONAS[i]; const s = S[i];
    const a0 = await openAttempt({ userId: s.userId, tier: "BASIC", stage: "bachelor", gradField: null, campus: s.ctx });
    ok(`${p.id} 응시가 학교 맥락·PRO 로 열린다(BASIC 을 넘겨도)`, a0.tier === "PRO" && a0.university_code === JJU_CODE && a0.department_code === TRACK && a0.core_code === "CS_CORE_V1", `${a0.tier} ${a0.core_code} ${a0.specialization_code}`);
    const seen: string[] = [];
    let a = a0;
    if (p.id === "A") {
      const half = await walk("CS_CORE_V1", a0, s.userId, p, 12, seen);
      const before = Object.keys(await answersOf(a0.id)).length;
      const screen = half.a.current_screen;
      /* 브라우저를 닫았다가 다시 들어온 것: 들고 있던 것이 없다 */
      const again = await currentAttempt(s.userId);
      const reopen = await openAttempt({ userId: s.userId, tier: "PRO", stage: "bachelor", gradField: null, campus: s.ctx });
      const after = Object.keys(await answersOf(a0.id)).length;
      ok("A 이어하기: 같은 응시로 돌아온다", again?.id === a0.id && reopen.id === a0.id, `응시 ${a0.id}`);
      ok("A 이어하기: 저장한 답이 그대로다", before > 0 && before === after, `답 ${before}개 · 화면 ${screen}`);
      ok("A 이어하기: 멈춘 화면에서 다시 선다", again?.current_screen === screen, String(again?.current_screen));
      const n = await queryOne<{ n: string }>(`SELECT count(*)::text n FROM v3_attempts WHERE user_id=$1::bigint`, [s.userId]);
      ok("A 이어하기: 응시가 하나다", n?.n === "1", n?.n);
      a = reopen;
    }
    const w = await walk("CS_CORE_V1", a, s.userId, p, null, seen);
    ok(`${p.id} 끝까지 간다`, w.done, `화면 ${seen.length}`);
    const answered = Object.keys(await answersOf(a0.id)).length;
    const fin = (await attemptOf(a0.id, s.userId)) as V3Attempt;
    const [r1, r2] = await Promise.all([submit(fin), submit(fin)]);
    const snaps = await queryOne<{ n: string }>(`SELECT count(*)::text n FROM v3_snapshots WHERE attempt_id=$1`, [a0.id]);
    ok(`${p.id} 동시 제출 둘에도 결과가 한 벌이다`, snaps?.n === "1" && r1.id === r2.id, `스냅샷 ${snaps?.n} · 답 ${answered}`);
    const again = await submit((await attemptOf(a0.id, s.userId)) as V3Attempt);
    const snaps2 = await queryOne<{ n: string }>(`SELECT count(*)::text n FROM v3_snapshots WHERE attempt_id=$1`, [a0.id]);
    ok(`${p.id} 끝난 뒤 다시 제출해도 늘지 않는다`, snaps2?.n === "1" && again.id === r1.id);
    const m1 = await latestResult(a0.id); const m2 = await latestResult(a0.id);
    ok(`${p.id} 결과를 다시 읽어도 같다`, !!m1 && JSON.stringify(m1) === JSON.stringify(m2));
    results[p.id] = { model: m1 as ResultModel, attempt: a0.id, out: readOut("CS_CORE_V1", m1 as ResultModel), screens: seen };
  }
  {
    const a0 = await openAttempt({ userId: P.userId, tier: "PRO", stage: "bachelor", gradField: null, campus: P.ctx });
    await walk("BIZ_CORE_V1", a0, P.userId, PERSONAS[1], null, []);
    await submit((await attemptOf(a0.id, P.userId)) as V3Attempt);
    ok("PCU 학생 응시가 PCU 로 적힌다", a0.university_code === "PCU", `${a0.core_code}`);
  }

  say("\n── 4. 세 학생이 서로 다른 결과를 받는가 (공통 엔진)");
  const keys = ["headline", "lead", "focus", "evidence_ready", "gaps", "actions", "roles"] as const;
  for (const k of keys) {
    const vals = PERSONAS.map((p) => JSON.stringify(results[p.id].out[k]));
    ok(`${k} 가 셋 모두 같지는 않다`, new Set(vals).size > 1, `${new Set(vals).size}가지`);
  }
  const fp = PERSONAS.map((p) => JSON.stringify({ d: results[p.id].model.domains, g: results[p.id].model.gaps }));
  ok("판정(영역·빈자리)이 셋 모두 다르다", new Set(fp).size === 3);

  say("\n── 5. 담당자 집계와 기관 격리");
  const jv = await campusV3({ orgIds: [Number(jjuOrg)], universityCode: JJU_CODE, withDemo: true });
  const pv = await campusV3({ orgIds: [Number(pcuOrg)], universityCode: "PCU", withDemo: true });
  const jDept = jv.by_department.map((c) => c.key);
  /* 기대값을 3 으로 못 박지 않는다: 다른 검사가 남긴 전주대 응시가 있으면 멀쩡한 집계가 걸린다.
     재는 것은 PCU 응시가 섞이지 않았는가다 */
  const jdb = await queryOne<{ n: string }>(`SELECT count(DISTINCT user_id)::text n FROM v3_attempts WHERE university_code='JJU'`);
  ok("JJU 집계의 시작 수에 PCU 학생이 없다", jv.started === Number(jdb?.n ?? -1), `JJU 시작 ${jv.started} · DB 의 전주대 응시자 ${jdb?.n} · 완료 ${jv.scored}`);
  ok("JJU 집계의 학과 칸에 PCU 코드가 없다", !jDept.some((k) => k.startsWith("PCU")), jDept.join(",") || "(5명 미만이라 칸 없음)");
  ok("PCU 집계에 JJU 학생이 없다", pv.started >= 1 && !pv.by_department.some((c) => c.key.startsWith("JJU")), `PCU 시작 ${pv.started}`);
  const jl = await listStudents({ universityCode: JJU_CODE, withDemo: true, limit: 500 });
  ok("JJU 명단에 PCU 학생이 없다", jl.rows.every((r) => r.department_code.startsWith("JJU")) && !jl.rows.some((r) => r.login_id === "qa-pcu-qap1"), `${jl.total}명`);
  const jc = await studentCounts({ universityCode: JJU_CODE, withDemo: true, department: TRACK });
  ok("JJU1_AI 트랙 상태 수가 맞다", jc.all >= 3 && jc.scored >= 3, JSON.stringify(jc));
  const actor = { userId: Number(jjuAdmin), role: "org_admin" as const, orgIds: [Number(jjuOrg)] };
  ok("JJU 담당자는 PCU 기관 자료를 만질 수 없다", !canInOrg(actor, "org.analytics.read", Number(pcuOrg)));
  ok("JJU 담당자는 자기 기관 자료는 만질 수 있다", canInOrg(actor, "org.analytics.read", Number(jjuOrg)));
  const rep = canReadParticipantReport({ actor, orgId: Number(jjuOrg), contractAllowsIndividualAccess: false, participantConsented: false });
  ok("JJU 담당자도 계약·동의 없이 개인 결과를 열 수 없다(공통 규칙)", !rep.ok, rep.reason ?? "");
  const rep2 = canReadParticipantReport({ actor, orgId: Number(pcuOrg), contractAllowsIndividualAccess: true, participantConsented: true });
  ok("JJU 담당자는 PCU 학생 결과를 계약·동의가 있어도 열 수 없다", !rep2.ok, rep2.reason ?? "");
  const memb = await query<{ code: string }>(`SELECT o.code FROM memberships m JOIN organizations o ON o.id=m.org_id WHERE m.user_id=$1::bigint`, [jjuAdmin]);
  ok("JJU 담당자의 소속이 JJU 하나다(화면의 학교 범위는 여기서 정해진다)", memb.length === 1 && memb[0].code === JJU_CODE, memb.map((x) => x.code).join(","));
  void pcuAdmin;

  /* ── 남기기 ─────────────────────────────────────────── */
  const dump = Object.fromEntries(PERSONAS.map((p) => [p.id, {
    label: p.label, attempt: results[p.id].attempt,
    versions: results[p.id].model.provenance.module_versions,
    read: results[p.id].out, screens: results[p.id].screens,
  }]));
  writeFileSync(`${OUT}/abc-results.json`, JSON.stringify({ track: TRACK, dump, isolation: { jju: { started: jv.started, scored: jv.scored, roster: jv.roster }, pcu: { started: pv.started } } }, null, 1));
  writeFileSync(`${OUT}/jju-verify.log`, log.join("\n") + `\n\n통과 ${pass} · 걸림 ${bad.length}\n`);
  say(`\n  통과 ${pass} · 걸림 ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
