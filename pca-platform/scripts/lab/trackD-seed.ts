/**
 * **Track D 2차 · 격리 DB 의 배재대 시드로 담당자 기능을 잰다.**
 *
 * 1차는 개발 DB 에 PCU 의 실제(비시연) 응시가 0건이라 PCU 집계 대조가
 * `0 = 0` 이었다. 그래서 따로 띄운 클러스터(포트 5433 · `cm_pcu_seed`)에
 * **학과 열 곳 · 학생 마흔여섯**을 담당자 화면이 부르는 서버 액션으로
 * 발급하고, 제품과 같은 길(학교 맥락 → `openAttempt` → 답 → `submit`)로
 * 응시를 쌓은 뒤 화면이 읽는 함수와 따로 쓴 SQL 을 견준다.
 *
 *   PGPORT=5433 DATABASE_URL=postgres:///cm_pcu_seed V3_PREVIEW_OPEN='*' \
 *     V3_CAMPUS_FIXTURE=scripts/fixtures/campus-zztest.json \
 *     OUT=docs/metri/review/tracks-r2/D npx tsx scripts/lab/trackD-seed.ts
 *
 * 이름과 학번은 **지어낸 것**이다(실제 학생이 아니다). 학과 코드는 등록부의
 * 배재대 2026 편제 그대로다. 학과마다 사람 수를 일부러 다섯 이상과 미만으로
 * 섞었다: 5명 규칙이 실제 숫자 위에서 가려지는지 보려는 것이다.
 *
 * **운영 · 개발 DB 에 대고 돌리지 않는다.** 5433 · `cm_pcu_seed` 가 아니면 멈춘다.
 */
import { loadEnv, makeStudent } from "../_loop-fixture";
loadEnv();
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const URL_ = process.env.DATABASE_URL ?? "";
if (process.env.PGPORT !== "5433" || !/^postgres(ql)?:\/\/\/cm_pcu_seed\b/.test(URL_)) {
  console.error(`격리 시드 DB(5433 · cm_pcu_seed)가 아니다: ${URL_} · PGPORT=${process.env.PGPORT}`); process.exit(2);
}
if (!process.env.V3_CAMPUS_FIXTURE) { console.error("V3_CAMPUS_FIXTURE 가 없다"); process.exit(2); }

type Who = { id: string; name: string; locale: string; mustResetPw: boolean; role: string; memberships: { orgId: string; role: string }[] };
let WHO: Who | null = null;
class Redirect extends Error { constructor(public to: string) { super(`redirect ${to}`); } }
const fake = (file: string, exports: Record<string, unknown>): void => {
  const id = require.resolve(path.resolve(file));
  require.cache[id] = { id, filename: id, loaded: true, exports } as unknown as NodeModule;
};
fake("src/lib/session.ts", {
  currentUser: async () => WHO,
  requireUser: async () => { if (!WHO) throw new Redirect("/login"); return WHO; },
  requireRole: async (allowed: string[]) => {
    if (!WHO) throw new Redirect("/login");
    if (!allowed.includes(WHO.role)) throw new Redirect("/");
    return WHO;
  },
  roleInOrg: () => null,
});
const Module = require("node:module") as { _load: (r: string, ...a: unknown[]) => unknown };
const load0 = Module._load;
Module._load = function (req: string, ...rest: unknown[]) {
  if (req === "next/cache") return { revalidatePath() {}, revalidateTag() {} };
  return load0.call(this, req, ...rest);
};

/* eslint-disable @typescript-eslint/no-require-imports */
const { query, queryOne } = require("../../src/lib/db") as typeof import("../../src/lib/db");
const S = require("../../src/lib/me-v3/runtime/session") as typeof import("../../src/lib/me-v3/runtime/session");
const ACT = require("../../src/app/org/v3/students/actions") as typeof import("../../src/app/org/v3/students/actions");
const M = require("../../src/lib/campus/manage") as typeof import("../../src/lib/campus/manage");
const C = require("../../src/lib/me-v3/campus") as typeof import("../../src/lib/me-v3/campus");
const ST = require("../../src/lib/campus/students") as typeof import("../../src/lib/campus/students");
const V = require("../../src/lib/campus/viewer") as typeof import("../../src/lib/campus/viewer");
const { MIN_CELL } = require("../../src/lib/org") as typeof import("../../src/lib/org");
const CSV_ST = require("../../src/app/org/v3/export/students.csv/route") as { GET: (r: Request) => Promise<Response> };
const CSV_DEPT = require("../../src/app/org/v3/export/departments.csv/route") as { GET: (r: Request) => Promise<Response> };
const { answerAll, PEOPLE } = require("../_v3-answer") as typeof import("../_v3-answer");

const OUT = process.env.OUT ?? "docs/metri/review/tracks-r2/D";
const rows: string[] = []; let pass = 0; const bad: string[] = [];
const ok = (what: string, cond: boolean, got = ""): void => {
  rows.push(`| ${cond ? "PASS" : "**FAIL**"} | ${what} | ${got.replace(/\|/g, "/")} |`);
  if (cond) pass++; else bad.push(what);
  console.log(`  ${cond ? "통과" : "걸림"}  ${what}${got ? " — " + got : ""}`);
};
const head = (t: string): void => { rows.push(`| | **${t}** | |`); console.log(`\n── ${t}`); };
const n = async (sql: string, p: unknown[] = []): Promise<number> => Number((await queryOne<{ n: string }>(sql, p))?.n ?? 0);
const fd = (o: Record<string, string>): FormData => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

/**
 * 학과마다 [발급 · 끝냄 · 푸는 중]. 나머지는 발급만 받고 아직 시작하지 않았다.
 * 다섯 이상인 학과와 미만인 학과를 섞었다.
 */
const PLAN: [string, number, number, number][] = [
  ["PCU26_BIZ", 9, 7, 1],
  ["PCU26_MIS", 6, 5, 0],
  ["PCU26_EE", 7, 5, 1],
  ["PCU26_NURSING", 5, 5, 0],
  ["PCU26_TOURISM", 5, 2, 2],
  ["PCU26_PSY", 4, 3, 0],
  ["PCU26_MEDIACONTENT", 3, 2, 1],
  ["PCU26_BT", 2, 1, 0],
  ["PCU26_ARCH", 1, 1, 0],
  ["PCU26_SELFDESIGN", 2, 0, 0],
];
const FAMILY = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황"];
const GIVEN = ["민준", "서연", "도윤", "하은", "지호", "수아", "예준", "지유", "시우", "채원", "주원", "다은", "건우", "윤서", "현우", "소윤", "은우", "지민"];

async function orgId(code: string, name: string): Promise<string> {
  const had = await queryOne<{ id: string }>(`SELECT id::text FROM organizations WHERE code=$1`, [code]);
  if (had) return had.id;
  const r = await queryOne<{ id: string }>(
    `INSERT INTO organizations (code, name, org_type, status, country) VALUES ($1,$2,'university','active','KR') RETURNING id::text`, [code, name]);
  return r!.id;
}
/** 다시 돌려도 같은 계정을 쓴다(감사 기록이 그 계정을 가리켜 지울 수 없다) */
async function person(login: string): Promise<{ id: string }> {
  const had = await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id=$1`, [login]);
  return had ?? await makeStudent(login);
}
async function staff(login: string, org: string, role: "org_admin" | "instructor"): Promise<Who> {
  const u = await person(login);
  await query(`UPDATE users SET is_demo=FALSE WHERE id=$1`, [u.id]);
  await query(`DELETE FROM memberships WHERE user_id=$1`, [u.id]);
  await query(`INSERT INTO memberships (user_id, org_id, role) VALUES ($1,$2,$3)`, [u.id, org, role]);
  return { id: u.id, name: login, locale: "ko", mustResetPw: false, role, memberships: [{ orgId: org, role }] };
}

async function main(): Promise<void> {
  /* 격리 DB 라 배재대 쪽을 비우고 시작한다(운영 · 개발 DB 에서는 이 줄에 닿지 않는다) */
  const oldIds = await query<{ id: string }>(
    `SELECT DISTINCT user_id::text id FROM (
       SELECT user_id FROM campus_students WHERE university_code='PCU'
       UNION SELECT user_id FROM v3_attempts WHERE university_code='PCU'
       UNION SELECT id FROM users WHERE login_id ~ '^2026[0-9]{4}$') t`);
  for (const o of oldIds) {
    for (const t of ["v3_attempts", "entitlements", "memberships", "campus_students", "career_profiles", "career_events",
                     "v3_experiences", "v3_actions", "analytics_events", "outbox"]) await query(`DELETE FROM ${t} WHERE user_id=$1`, [o.id]).catch(() => undefined);
    await query(`DELETE FROM audit_logs WHERE target_id=$1 OR actor_id=$1::bigint`, [o.id]).catch(() => undefined);
    await query(`DELETE FROM users WHERE id=$1`, [o.id]);
  }
  const pcuOrg = await orgId("PCU", "배재대학교");
  const zzOrg = await orgId("ZZTEST", "확인용 학교");
  const pcuAdmin = await staff("seed-pcu-admin", pcuOrg, "org_admin");
  const pcuInst = await staff("seed-pcu-inst", pcuOrg, "instructor");
  const zzAdmin = await staff("seed-zz-admin", zzOrg, "org_admin");
  const outsider = await person("seed-outsider");
  await query(`DELETE FROM memberships WHERE user_id=$1 AND org_id IS NOT NULL`, [outsider.id]);
  await query(`UPDATE users SET is_demo=FALSE WHERE id=$1`, [outsider.id]);

  head("S1 시드: 담당자 화면이 부르는 추가 동작으로 발급한다");
  WHO = pcuAdmin;
  type Seeded = { uid: string; sid: string; name: string; dept: string; plan: "scored" | "open" | "none" };
  const seeded: Seeded[] = [];
  let k = 0; let issueErr = 0;
  for (const [dept, total, done, open] of PLAN) {
    for (let i = 0; i < total; i++) {
      const sid = `2026${String(1001 + k).padStart(4, "0")}`;
      const name = FAMILY[k % FAMILY.length] + GIVEN[(k * 7) % GIVEN.length];
      k++;
      const r = await ACT.addAction({}, fd({ student_id: sid, name, department_code: dept }));
      const login = r.issued?.[0]?.login_id;
      const u = login ? await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id=$1`, [login]) : null;
      if (!u) { issueErr++; console.log(`   발급 실패 ${sid} ${dept}: ${r.err}`); continue; }
      seeded.push({ uid: u.id, sid, name, dept, plan: i < done ? "scored" : i < done + open ? "open" : "none" });
    }
  }
  const total = PLAN.reduce((s, p) => s + p[1], 0);
  ok("학생이 계획한 수만큼 발급됐다", seeded.length === total && issueErr === 0, `${seeded.length} / ${total}`);
  ok("발급된 계정은 시연으로 표시되지 않는다", await n(`SELECT count(*)::text n FROM users u JOIN campus_students cs ON cs.user_id=u.id WHERE cs.university_code='PCU' AND u.is_demo`) === 0);

  head("S2 응시: 제품과 같은 길(학교 맥락 → 응시 → 답 → 제출)");
  let opened = 0; let submitted = 0; let refused = 0;
  for (const [i, s] of seeded.entries()) {
    if (s.plan === "none") continue;
    const sc = await ST.campusStudentContext(s.uid);
    if (!sc?.ctx || !sc.ctx.core_code) { refused++; continue; }
    const a = await S.openAttempt({ userId: s.uid, tier: "BASIC", stage: "bachelor", gradField: null, campus: sc.ctx });
    opened++;
    if (s.plan === "scored") {
      await answerAll(a.core_code, a, s.uid, PEOPLE[i % PEOPLE.length]);
      await S.submit((await S.attemptOf(a.id, s.uid))!);
      submitted++;
    } else {
      const g = (await S.content(a.core_code)).domains.domains[0].code;
      await S.saveAnswer(a.id, `G_${g}_INT`, { kind: "scale5", value: 3 });
    }
  }
  const planScored = seeded.filter((s) => s.plan === "scored").length;
  const planOpen = seeded.filter((s) => s.plan === "open").length;
  ok("계획한 응시가 전부 열렸다", opened === planScored + planOpen, `열림 ${opened} · 계획 ${planScored + planOpen}`);
  ok("계획한 응시가 전부 제출됐다", submitted === planScored, `${submitted} / ${planScored}`);
  ok("학교 응시는 모두 PRO 로 열렸다", await n(`SELECT count(*)::text n FROM v3_attempts WHERE university_code='PCU' AND tier<>'PRO'`) === 0);
  ok("학과 코드가 응시 줄에 그대로 적혔다(맥락이 학과를 바꾸지 않는다)",
    await n(`SELECT count(*)::text n FROM v3_attempts a JOIN campus_students cs ON cs.user_id=a.user_id WHERE a.university_code='PCU' AND a.department_code<>cs.department_code`) === 0);

  head("S3 학과별 집계 = 따로 쓴 SQL (5명 규칙 포함)");
  const agg = await C.campusV3({ orgIds: [Number(pcuOrg)], universityCode: "PCU" });
  const sqlStarted = await n(`SELECT count(DISTINCT a.user_id)::text n FROM v3_attempts a JOIN users u ON u.id=a.user_id WHERE a.university_code='PCU' AND NOT u.is_demo`);
  const sqlScored = await n(`SELECT count(DISTINCT a.user_id)::text n FROM v3_attempts a JOIN users u ON u.id=a.user_id WHERE a.university_code='PCU' AND a.status='scored' AND NOT u.is_demo`);
  const sqlRoster = await n(`SELECT count(*)::text n FROM campus_students cs JOIN users u ON u.id=cs.user_id WHERE cs.university_code='PCU' AND NOT u.is_demo`);
  ok("명단 수 = SQL", agg.roster === sqlRoster && sqlRoster === total, `${agg.roster} / SQL ${sqlRoster}`);
  ok("시작한 사람 = SQL", agg.started === sqlStarted, `${agg.started} / SQL ${sqlStarted}`);
  ok("끝낸 사람 = SQL", agg.scored === sqlScored && sqlScored === planScored, `${agg.scored} / SQL ${sqlScored}`);
  ok("완료 ≤ 시작 ≤ 대상자", agg.scored <= agg.started && agg.started <= agg.target, `${agg.scored} ≤ ${agg.started} ≤ ${agg.target}`);
  ok("완료율 = 끝낸 수 / 대상자 (100 을 넘지 않는다 · clamp 없음)", agg.completion === Math.round((100 * agg.scored) / agg.target), `${agg.completion}%`);
  const deptTable: string[] = ["| 학과 | 발급 | 시작(SQL) | 끝냄(SQL) | 화면 칸 | 판정 |", "|---|---|---|---|---|---|"];
  let deptOk = 0; let deptChecked = 0;
  for (const [dept, issued] of PLAN) {
    const st = await n(`SELECT count(DISTINCT a.user_id)::text n FROM v3_attempts a JOIN users u ON u.id=a.user_id WHERE a.university_code='PCU' AND a.department_code=$1 AND NOT u.is_demo`, [dept]);
    const sc = await n(`SELECT count(DISTINCT a.user_id)::text n FROM v3_attempts a JOIN users u ON u.id=a.user_id WHERE a.university_code='PCU' AND a.department_code=$1 AND a.status='scored' AND NOT u.is_demo`, [dept]);
    const cellv = agg.by_department.find((d) => d.key === dept);
    const want = st === 0 ? undefined : st < MIN_CELL ? null : st;
    const got = cellv === undefined ? undefined : cellv.n;
    const good = st === 0 ? cellv === undefined : got === want;
    deptChecked++; if (good) deptOk++;
    deptTable.push(`| ${dept} | ${issued} | ${st} | ${sc} | ${got === undefined ? "(줄 없음)" : got === null ? "가림(5명 미만)" : got} | ${good ? "PASS" : "**FAIL**"} |`);
  }
  ok("학과마다 화면 칸 = SQL, 다섯 미만은 수를 내지 않는다", deptOk === deptChecked, `${deptOk} / ${deptChecked}`);
  ok("다섯 미만 칸이 수로 새지 않는다", agg.by_department.every((d) => d.n === null || d.n >= MIN_CELL));
  const colSql = await n(`SELECT count(DISTINCT a.user_id)::text n FROM v3_attempts a WHERE a.university_code='PCU' AND a.college_code='BUSINESS'`);
  const colRow = agg.college_rows.find((r) => r.code === "BUSINESS");
  ok("단과대학(경영대학) 시작 = SQL", colRow?.started === colSql, `${colRow?.started} / SQL ${colSql}`);
  const attention = agg.attention.map((a) => `${a.code}:${a.open}`).join(" ");
  ok("주의 학과는 시작 다섯 이상이고 미완료가 있는 학과뿐", agg.attention.every((a) => a.started >= MIN_CELL && a.open > 0), attention || "(없음)");
  const narrow = await C.campusV3({ orgIds: [Number(pcuOrg)], universityCode: "PCU", department: "PCU26_PSY" });
  ok("학과 하나로 좁혀 다섯 미만이면 아래 칸을 세지 않는다", narrow.too_few === true && narrow.by_department.every((d) => d.n === null), `심리상담 시작 ${narrow.started}`);

  head("S4 개인 조회와 명단");
  const list = await M.listStudents({ universityCode: "PCU", state: "all" } as never);
  ok("명단 총원 = 발급 수", list.total === total, `${list.total}`);
  const one = seeded.find((s) => s.plan === "scored")!;
  const byQ = await M.listStudents({ universityCode: "PCU", q: one.sid, state: "all" } as never);
  ok("학번으로 한 사람을 찾는다 · 상태가 맞다", byQ.rows.length === 1 && byQ.rows[0].attempt === "scored" && !!byQ.rows[0].completed_at, `${byQ.rows[0]?.name} · ${byQ.rows[0]?.attempt}`);
  const none = await M.listStudents({ universityCode: "PCU", state: "none" } as never);
  ok("미응시 목록 = 시작하지 않은 학생", none.total === total - planScored - planOpen, `${none.total}`);
  const deptList = await M.listStudents({ universityCode: "PCU", department: "PCU26_BIZ", state: "all" } as never);
  ok("학과로 좁힌 명단이 그 학과만 든다", deptList.total === 9 && deptList.rows.every((r) => r.department_code === "PCU26_BIZ"));

  head("S5 접근 거부");
  WHO = zzAdmin;
  const zzView = await V.campusViewer();
  ok("다른 학교 담당자의 범위는 그 학교다", zzView.uni === "ZZTEST", String(zzView.uni));
  const zzAgg = await C.campusV3({ orgIds: zzView.orgIds, universityCode: zzView.uni });
  ok("다른 학교 담당자 집계에 PCU 학생이 0 명", !zzAgg.by_department.some((d) => d.key.startsWith("PCU")) && zzAgg.roster === await n(`SELECT count(*)::text n FROM campus_students WHERE university_code='ZZTEST'`), `ZZTEST 명단 ${zzAgg.roster}`);
  const xr = await ACT.rotateAction({}, fd({ user_id: one.uid }));
  ok("다른 학교 담당자는 PCU 학생 비밀번호를 다시 낼 수 없다", !!xr.err && !xr.issued, xr.err ?? "");
  const zcsv = await (await CSV_ST.GET(new Request("http://local/org/v3/export/students.csv?state=all"))).text();
  ok("다른 학교 담당자 CSV 에 PCU 학번이 없다", !seeded.some((s) => zcsv.includes(s.sid)));
  WHO = pcuInst;
  let to = "";
  try { await ACT.addAction({}, fd({ student_id: "20269999", name: "x", department_code: "PCU26_BIZ" })); } catch (e) { to = (e as Redirect).to; }
  ok("교수 계정은 학생을 추가하지 못한다", to === "/", to);
  WHO = { id: outsider.id, name: "학생", locale: "ko", mustResetPw: false, role: "student", memberships: [] };
  to = "";
  try { await V.campusViewer(); } catch (e) { to = (e as Redirect).to; }
  ok("학생 계정은 담당자 화면에 들어가지 못한다", to === "/", to);
  const done1 = await queryOne<{ id: string }>(`SELECT id::text FROM v3_attempts WHERE user_id=$1 AND status='scored'`, [one.uid]);
  ok("담당자는 학생 응시를 본인 것으로 열 수 없다", (await S.attemptOf(done1!.id, pcuAdmin.id)) === null);
  ok("다른 학생도 그 응시를 열 수 없다", (await S.attemptOf(done1!.id, seeded[1].uid)) === null);

  head("S6 내려받기 (명단 CSV · 학과 CSV)");
  WHO = pcuAdmin;
  const sres = await CSV_ST.GET(new Request("http://local/org/v3/export/students.csv?state=all"));
  const sbody = await sres.text();
  const slines = sbody.trim().split("\n");
  mkdirSync(path.join(OUT, "exports"), { recursive: true });
  writeFileSync(path.join(OUT, "exports", "students.csv"), sbody);
  ok("명단 CSV 는 200 이고 발급한 학생이 전부 있다", sres.status === 200 && seeded.every((s) => sbody.includes(s.sid)), `HTTP ${sres.status} · ${slines.length}줄`);
  ok("명단 CSV 에 비밀번호·문항·응답값 칸이 없다", !/password|비밀번호|value_int|item_id|G_TD/i.test(sbody));
  const dres = await CSV_DEPT.GET(new Request("http://local/org/v3/export/departments.csv"));
  const dbody = await dres.text();
  writeFileSync(path.join(OUT, "exports", "departments.csv"), dbody);
  const small = PLAN.filter(([d]) => { const r = agg.by_department.find((x) => x.key === d); return r && r.n === null; }).map(([d]) => d);
  ok("학과 CSV 는 200 이다", dres.status === 200, `HTTP ${dres.status} · ${dbody.trim().split("\n").length}줄`);
  const bizLine = dbody.split("\n").find((l) => l.includes("경영학과")) ?? "";
  const bizStarted = agg.by_department.find((d) => d.key === "PCU26_BIZ")?.n;
  ok("학과 CSV 의 경영학과 수 = 화면 칸", !!bizLine && bizStarted !== null && bizStarted !== undefined && bizLine.includes(String(bizStarted)), bizLine.slice(0, 80));
  const psyLine = dbody.split("\n").find((l) => l.includes("심리상담")) ?? "";
  ok("학과 CSV 에서 다섯 미만 학과는 수가 서지 않는다", small.length > 0 && !/,\s*[1-4]\s*(,|$)/.test(psyLine), psyLine.slice(0, 80) || "(줄 없음)");

  head("S7 운영 요약 PDF");
  /* 통과로 세지 않는다: 재지 못한 것을 PASS 로 적으면 둘 다 쓸모가 없어진다 */
  rows.push("| NOT VERIFIED | 요약 PDF(`/org/v3/report.pdf`)는 Next 서버가 띄운 `/org/v3/report` 를 머리 없는 브라우저로 연다 — 이 환경은 Next 를 빌드할 수 없다 | 같은 수를 읽는 `campusV3` 는 S3 에서 SQL 과 대조했다 |");
  console.log("  재지 못함  요약 PDF (Next 빌드 불가)");

  /* 표본 넷: 학과 하나에 세 사람(끝냄 · 푸는 중 · 시작 전)과 다섯 미만 학과 하나 */
  const sample = [
    seeded.find((s) => s.dept === "PCU26_BIZ" && s.plan === "scored"),
    seeded.find((s) => s.dept === "PCU26_BIZ" && s.plan === "open"),
    seeded.find((s) => s.dept === "PCU26_BIZ" && s.plan === "none"),
    seeded.find((s) => s.dept === "PCU26_PSY" && s.plan === "scored"),
  ].filter(Boolean) as Seeded[];
  const sampleRows: string[] = ["| 학번 | 이름(가명) | 학과 | 계획 | 명단 화면 상태 | 응시 줄 |", "|---|---|---|---|---|---|"];
  for (const s of sample) {
    const r = (await M.listStudents({ universityCode: "PCU", q: s.sid, state: "all" } as never)).rows[0];
    const a = await queryOne<{ s: string; t: string; c: string }>(`SELECT status s, tier t, core_code c FROM v3_attempts WHERE user_id=$1 ORDER BY id DESC LIMIT 1`, [s.uid]);
    sampleRows.push(`| ${s.sid} | ${s.name} | ${s.dept} | ${s.plan} | ${r?.attempt ?? "-"} | ${a ? `${a.s} · ${a.t} · ${a.c}` : "(없음)"} |`);
  }

  const tot = pass + bad.length;
  writeFileSync(path.join(OUT, "SEED.md"), [
    "# Track D 2차 · 격리 DB 배재대 시드 검증", "",
    `- 실행: ${new Date().toISOString().slice(0, 16)}Z · DB \`${URL_}\` (격리 클러스터 5433 · 운영도 개발 DB 도 아니다)`,
    `- 드라이버: ${process.env.RT_REAL_PG === "1" ? "실제 node-postgres 8.16.3" : "대체 드라이버(psycopg 다리)"}`,
    "- 학생 이름과 학번은 **지어낸 것**이다. 학과 코드는 등록부 배재대 2026 편제 그대로다.",
    "- 발급은 담당자 화면이 부르는 `addAction`, 응시는 제품과 같은 길(학교 맥락 → `openAttempt` → 답 → `submit`).",
    "- **브라우저 검증이 아니다**: 권한별 메뉴 · 다운로드 단추 · 숫자 화면 스크린샷 · 요약 PDF 는 NOT VERIFIED (Next 빌드 불가).", "",
    `**통과 ${pass} · 걸림 ${bad.length} / ${tot}**`, "",
    "## 학과별 대조", "", ...deptTable, "",
    "## 대표 학생", "", ...sampleRows, "",
    "## 전체 확인", "", "| 판정 | 확인 | 값 |", "|---|---|---|", ...rows, "",
    ...(bad.length ? ["## 걸린 것", "", ...bad.map((b) => `- ${b}`), ""] : []),
    "내려받은 파일: `exports/students.csv` · `exports/departments.csv` (가명 · 시드 자료)", "",
  ].join("\n"));
  console.log(`\n확인 ${tot}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
