/**
 * **Track D · 기관 관리자 (서버 레벨).** 담당자 화면이 부르는 서버 액션
 * (`src/app/org/v3/students/actions.ts`)과 집계(`campusV3`) · 명단 · 내려받기
 * 를 그대로 부르고, DB 를 따로 세어 맞춘다.
 *
 * 학교가 둘이다: 배재대(PCU)와 확인용 학교(ZZTEST, 운영 등록부에 없는
 * fixture). **A 학교 담당자가 B 학교 학생을 건드리지 못하는가**가 이 검사의
 * 중심이다. 로그인 세션만 바꿔 끼우고 역할 확인은 실제 `requireRole` 과
 * 같은 규칙으로 한다(전역 역할이 허용 목록에 없으면 `/` 로 보낸다).
 *
 *   DATABASE_URL=postgres:///cm_dev V3_PREVIEW_OPEN='*' \
 *     V3_CAMPUS_FIXTURE=scripts/fixtures/campus-zztest.json \
 *     OUT=docs/metri/review/tracks/D npx tsx scripts/lab/trackD-admin.ts
 *
 * **운영 DB 에 대고 돌리지 않는다.** 로컬 개발 DB 가 아니면 멈춘다.
 * 만든 시험 계정은 `zztd-` 로 시작하고 끝에서 응시와 소속을 치운다.
 */
import { loadEnv, makeStudent } from "../_loop-fixture";
loadEnv();
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const URL_ = process.env.DATABASE_URL ?? "";
if (!/^postgres(ql)?:\/\/\/(cm_dev|cm_gm_iso)\b/.test(URL_)) {
  console.error(`로컬 개발 DB 가 아니다: ${URL_}`); process.exit(2);
}
if (!process.env.V3_CAMPUS_FIXTURE) {
  console.error("V3_CAMPUS_FIXTURE 가 없다: 확인용 학교(ZZTEST)가 등록부에 서지 않는다"); process.exit(2);
}

/* ── 세션 바꿔 끼우기 · next/cache 비우기 ─────────────────────────── */
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
const CSV = require("../../src/app/org/v3/export/students.csv/route") as { GET: (r: Request) => Promise<Response> };
const { answerAll, PEOPLE } = require("../_v3-answer") as typeof import("../_v3-answer");

const OUT = process.env.OUT ?? "docs/metri/review/tracks/D";
const rows: string[] = []; let pass = 0; const bad: string[] = [];
const ok = (what: string, cond: boolean, got = ""): void => {
  rows.push(`| ${cond ? "PASS" : "**FAIL**"} | ${what} | ${got.replace(/\|/g, "/")} |`);
  if (cond) pass++; else bad.push(what);
  console.log(`  ${cond ? "통과" : "걸림"}  ${what}${got ? " — " + got : ""}`);
};
const head = (t: string): void => { rows.push(`| | **${t}** | |`); console.log(`\n── ${t}`); };
const n = async (sql: string, p: unknown[] = []): Promise<number> =>
  Number((await queryOne<{ n: string }>(sql, p))?.n ?? 0);
const fd = (o: Record<string, string>): FormData => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

async function orgId(code: string, name: string): Promise<string> {
  const had = await queryOne<{ id: string }>(`SELECT id::text FROM organizations WHERE code=$1`, [code]);
  if (had) return had.id;
  const r = await queryOne<{ id: string }>(
    `INSERT INTO organizations (code, name, org_type, status, country) VALUES ($1,$2,'university','active','KR') RETURNING id::text`, [code, name]);
  return r!.id;
}
async function staff(login: string, org: string, role: "org_admin" | "instructor"): Promise<Who> {
  const u = await makeStudent(login);
  await query(`DELETE FROM memberships WHERE user_id=$1`, [u.id]);
  await query(`INSERT INTO memberships (user_id, org_id, role) VALUES ($1,$2,$3)`, [u.id, org, role]);
  return { id: u.id, name: login, locale: "ko", mustResetPw: false, role, memberships: [{ orgId: org, role }] };
}

async function main(): Promise<void> {
  const pcuOrg = await orgId("PCU", "배재대학교");
  const zzOrg = await orgId("ZZTEST", "확인용 학교");
  const pcuAdmin = await staff("zztd-pcu-admin", pcuOrg, "org_admin");
  const pcuInst = await staff("zztd-pcu-inst", pcuOrg, "instructor");
  const zzAdmin = await staff("zztd-zz-admin", zzOrg, "org_admin");
  const plain = await makeStudent("zztd-plain");
  const student: Who = { id: plain.id, name: "학생", locale: "ko", mustResetPw: false, role: "student", memberships: [] };

  /* 지난 회차의 같은 학번을 치운다(시험 계정만) */
  const old = await query<{ id: string }>(`SELECT u.id::text id FROM users u JOIN campus_students cs ON cs.user_id=u.id WHERE cs.student_id LIKE 'ZZTD%'`);
  for (const o of old) {
    for (const t of ["v3_attempts", "entitlements", "memberships", "campus_students"]) await query(`DELETE FROM ${t} WHERE user_id=$1`, [o.id]).catch(() => undefined);
    await query(`DELETE FROM users WHERE id=$1`, [o.id]).catch(() => undefined);
  }

  head("D1 학생 추가 · 비밀번호는 한 번만");
  WHO = pcuAdmin;
  const add1 = await ACT.addAction({}, fd({ student_id: "ZZTD0001", name: "시험학생일", department_code: "PCU26_BIZ" }));
  const p1 = add1.issued?.[0];
  const u1 = await queryOne<{ id: string; ph: string }>(`SELECT id::text, password_hash ph FROM users WHERE login_id=$1`, [p1?.login_id ?? "-"]);
  ok("PCU 담당자가 학생을 추가하면 계정과 소속이 선다", !!u1 && await n(`SELECT count(*)::text n FROM campus_students WHERE user_id=$1 AND university_code='PCU' AND department_code='PCU26_BIZ'`, [u1?.id]) === 1, add1.ok ?? add1.err ?? "");
  ok("비밀번호는 해시로만 남는다(평문이 DB 에 없다)", !!p1?.password && !!u1?.ph && u1.ph !== p1.password && !(u1.ph.includes(p1.password)));
  const add1b = await ACT.addAction({}, fd({ student_id: "ZZTD0001", name: "시험학생일", department_code: "PCU26_BIZ" }));
  ok("같은 학생을 다시 추가하면 비밀번호를 다시 내지 않는다", !add1b.issued && !!add1b.ok, add1b.ok ?? add1b.err ?? "");
  const bad1 = await ACT.addAction({}, fd({ student_id: "ZZTD0009", name: "x", department_code: "ZZ26_ME" }));
  ok("남의 학교 학과 코드로는 추가되지 않는다", !!bad1.err && !bad1.issued, bad1.err ?? "");
  const aud = await n(`SELECT count(*)::text n FROM audit_logs WHERE target_id=$1 AND action LIKE 'campus.student.%'`, [u1?.id]);
  const audLeak = await n(`SELECT count(*)::text n FROM audit_logs WHERE target_id=$1 AND detail::text LIKE $2`, [u1?.id, `%${p1?.password ?? "@@"}%`]);
  ok("감사 기록이 남고 비밀번호는 적히지 않는다", aud >= 1 && audLeak === 0, `기록 ${aud} · 평문 ${audLeak}`);

  head("D2 학교 간 격리 (A 학교 담당자 → B 학교 학생)");
  WHO = zzAdmin;
  const zzAdd = await ACT.addAction({}, fd({ student_id: "ZZTD1001", name: "확인학생일", department_code: "ZZ26_ME" }));
  const zzU = await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id=$1`, [zzAdd.issued?.[0]?.login_id ?? "-"]);
  ok("ZZTEST 담당자는 자기 학교 학생을 추가한다", !!zzU, zzAdd.ok ?? zzAdd.err ?? "");
  const xRot = await ACT.rotateAction({}, fd({ user_id: u1!.id }));
  ok("ZZTEST 담당자가 PCU 학생 비밀번호를 다시 낼 수 없다", !!xRot.err && !xRot.issued, xRot.err ?? "");
  const xSt = await ACT.setStatusAction({}, fd({ user_id: u1!.id, on: "0" }));
  ok("ZZTEST 담당자가 PCU 학생 계정을 멈출 수 없다", !!xSt.err && (await queryOne<{ s: string }>(`SELECT status s FROM users WHERE id=$1`, [u1!.id]))?.s === "active", xSt.err ?? "");
  WHO = pcuAdmin;
  const xRet = await ACT.retakeAction({}, fd({ user_id: zzU!.id }));
  ok("PCU 담당자가 ZZTEST 학생 재응시를 열 수 없다", !!xRet.err, xRet.err ?? "");
  const pcuList = await M.listStudents({ universityCode: "PCU", state: "all", limit: 5000 } as never);
  const zzList = await M.listStudents({ universityCode: "ZZTEST", state: "all", limit: 5000 } as never);
  ok("PCU 명단에 ZZTEST 학생이 없다", !pcuList.rows.some((r) => r.user_id === zzU!.id) && pcuList.rows.some((r) => r.user_id === u1!.id), `PCU ${pcuList.total}명`);
  ok("ZZTEST 명단에 PCU 학생이 없다", !zzList.rows.some((r) => r.user_id === u1!.id), `ZZTEST ${zzList.total}명`);

  head("D3 역할 확인");
  WHO = pcuInst;
  let to = "";
  try { await ACT.rotateAction({}, fd({ user_id: u1!.id })); } catch (e) { to = (e as Redirect).to ?? String(e); }
  ok("교수(instructor)는 계정을 고치지 못한다(읽기만)", to === "/", to);
  const v = await V.campusViewer();
  ok("교수는 자기 학교 집계를 읽는다", v.uni === "PCU", String(v.uni));
  WHO = student; to = "";
  try { await V.campusViewer(); } catch (e) { to = (e as Redirect).to ?? String(e); }
  ok("학생 계정은 담당자 화면에 들어가지 못한다", to === "/", to);
  WHO = null; to = "";
  try { await ACT.addAction({}, fd({ student_id: "ZZTD0002", name: "y", department_code: "PCU26_BIZ" })); } catch (e) { to = (e as Redirect).to ?? String(e); }
  ok("로그인하지 않으면 로그인으로 보낸다", to === "/login", to);

  head("D4 계정 멈춤 · 다시 열기 · 비밀번호 재발급");
  WHO = pcuAdmin;
  const off = await ACT.setStatusAction({}, fd({ user_id: u1!.id, on: "0" }));
  const s1 = (await queryOne<{ s: string }>(`SELECT status s FROM users WHERE id=$1`, [u1!.id]))?.s;
  const on = await ACT.setStatusAction({}, fd({ user_id: u1!.id, on: "1" }));
  const s2 = (await queryOne<{ s: string }>(`SELECT status s FROM users WHERE id=$1`, [u1!.id]))?.s;
  ok("멈추면 disabled, 다시 열면 active", !!off.ok && s1 === "disabled" && !!on.ok && s2 === "active", `${s1} → ${s2}`);
  const before = (await queryOne<{ ph: string; cs: string }>(`SELECT u.password_hash ph, cs.department_code cs FROM users u JOIN campus_students cs ON cs.user_id=u.id WHERE u.id=$1`, [u1!.id]))!;
  const rot = await ACT.rotateAction({}, fd({ user_id: u1!.id }));
  const after = (await queryOne<{ ph: string; cs: string }>(`SELECT u.password_hash ph, cs.department_code cs FROM users u JOIN campus_students cs ON cs.user_id=u.id WHERE u.id=$1`, [u1!.id]))!;
  ok("재발급은 비밀번호만 바꾸고 학과는 그대로다", !!rot.issued?.[0]?.password && before.ph !== after.ph && before.cs === after.cs);

  head("D5 응시 진행 현황과 집계 (ZZTEST · 새 학교라 수를 안다)");
  const zzStudents: string[] = [zzU!.id];
  WHO = zzAdmin;
  for (let i = 2; i <= 6; i++) {
    const r = await ACT.addAction({}, fd({ student_id: `ZZTD100${i}`, name: `확인학생${i}`, department_code: "ZZ26_ME" }));
    const u = await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id=$1`, [r.issued?.[0]?.login_id ?? "-"]);
    zzStudents.push(u!.id);
  }
  /* 다섯이 끝내고 하나는 중간에 멈춘다 */
  for (const [i, uid] of zzStudents.entries()) {
    const ctx = (await ST.campusStudentContext(uid))!.ctx;
    const a = await S.openAttempt({ userId: uid, tier: "BASIC", stage: "bachelor", gradField: null, campus: ctx });
    if (i === 0) ok("학교 응시는 받은 등급과 무관하게 PRO 로 열린다", a.tier === "PRO", a.tier);
    if (i < 5) { await answerAll(a.core_code, a, uid, PEOPLE[1]); await S.submit((await S.attemptOf(a.id, uid))!); }
    else await S.saveAnswer(a.id, "G_TD01_INT", { kind: "scale5", value: 3 });
  }
  const agg = await C.campusV3({ orgIds: [Number(zzOrg)], universityCode: "ZZTEST" });
  const sqlStarted = await n(`SELECT count(DISTINCT a.user_id)::text n FROM v3_attempts a JOIN users u ON u.id=a.user_id WHERE a.university_code='ZZTEST' AND NOT u.is_demo`);
  const sqlScored = await n(`SELECT count(DISTINCT a.user_id)::text n FROM v3_attempts a JOIN users u ON u.id=a.user_id WHERE a.university_code='ZZTEST' AND a.status='scored' AND NOT u.is_demo`);
  const sqlRoster = await n(`SELECT count(*)::text n FROM campus_students cs JOIN users u ON u.id=cs.user_id WHERE cs.university_code='ZZTEST' AND NOT u.is_demo`);
  ok("시작한 사람 수가 따로 센 SQL 과 같다", agg.started === sqlStarted, `${agg.started} / SQL ${sqlStarted}`);
  ok("끝낸 사람 수가 따로 센 SQL 과 같다", agg.scored === sqlScored && agg.scored === 5, `${agg.scored} / SQL ${sqlScored}`);
  ok("대상자 = 명단(모두 명단에서 들어왔다)", agg.target === sqlRoster && agg.roster === sqlRoster, `대상 ${agg.target} · 명단 ${agg.roster} / SQL ${sqlRoster}`);
  ok("완료 ≤ 시작 ≤ 대상자", agg.scored <= agg.started && agg.started <= agg.target);
  ok("완료율 = 끝낸 수 / 대상자", agg.completion !== null && Math.abs(agg.completion - Math.round((100 * agg.scored) / agg.target)) <= 1, `${agg.completion}%`);
  const dept = agg.by_department.find((d) => d.key === "ZZ26_ME");
  ok("학과 칸이 다섯 이상이면 수가 선다", dept?.n === sqlStarted || dept?.n === sqlScored, JSON.stringify(dept ?? null));

  head("D6 5명 규칙 (좁히면 가린다)");
  const narrow = await C.campusV3({ orgIds: [Number(zzOrg)], universityCode: "ZZTEST", from: "2999-01-01" } as never);
  ok("좁혀서 다섯이 안 되면 아래 칸을 세지 않는다", narrow.started < MIN_CELL && narrow.by_department.every((d) => d.n === null) && narrow.too_few === true,
    `시작 ${narrow.started} · 칸 ${narrow.by_department.length}`);
  const pcuAgg = await C.campusV3({ orgIds: [Number(pcuOrg)], universityCode: "PCU" });
  const leak = pcuAgg.by_department.filter((d) => d.n !== null && d.n < MIN_CELL);
  ok("PCU 집계에 다섯 미만 칸이 수로 서지 않는다", leak.length === 0, `칸 ${pcuAgg.by_department.length} · 드러난 작은 칸 ${leak.length}`);
  const pcuSql = await n(`SELECT count(DISTINCT a.user_id)::text n FROM v3_attempts a JOIN users u ON u.id=a.user_id LEFT JOIN memberships m ON m.user_id=a.user_id AND m.org_id=$1 WHERE (m.org_id IS NOT NULL OR a.university_code='PCU') AND NOT u.is_demo`, [pcuOrg]);
  ok("PCU 시작 수가 따로 센 SQL 과 같다", pcuAgg.started === pcuSql, `${pcuAgg.started} / SQL ${pcuSql}`);
  ok("PCU 집계에 ZZTEST 학생이 섞이지 않는다", !pcuAgg.by_department.some((d) => d.key === "ZZ26_ME"));

  head("D7 재응시 열기");
  WHO = zzAdmin;
  const r0 = await ACT.retakeAction({}, fd({ user_id: zzStudents[5] }));
  ok("결과를 받지 않은 학생은 재응시를 열지 않는다", !!r0.err, r0.err ?? "");
  const r1 = await ACT.retakeAction({}, fd({ user_id: zzStudents[0] }));
  const r2 = await ACT.retakeAction({}, fd({ user_id: zzStudents[0] }));
  const ent = await n(`SELECT count(*)::text n FROM entitlements WHERE user_id=$1 AND product_code='CM_V3_CAMPUS_PRO' AND status='active'`, [zzStudents[0]]);
  ok("두 번 눌러도 재응시 이용권은 한 줄", !!r1.ok && !!r2.ok && ent === 1, `줄 ${ent}`);

  head("D8 학생 결과 조회 경계");
  const done0 = await queryOne<{ id: string }>(`SELECT id::text FROM v3_attempts WHERE user_id=$1 AND status='scored' LIMIT 1`, [zzStudents[0]]);
  ok("담당자는 학생 응시를 본인 것으로 열 수 없다(결과·PDF 경로가 막힌다)", (await S.attemptOf(done0!.id, zzAdmin.id)) === null);
  ok("학생 본인은 자기 응시를 연다", (await S.attemptOf(done0!.id, zzStudents[0])) !== null);

  head("D9 내려받기 (명단 CSV)");
  WHO = pcuAdmin;
  const res = await CSV.GET(new Request("http://local/org/v3/export/students.csv?state=all"));
  const body = await res.text();
  ok("PCU 담당자 CSV 에 자기 학생이 있다", res.status === 200 && body.includes("ZZTD0001"), `HTTP ${res.status} · ${body.split("\n").length}줄`);
  ok("PCU 담당자 CSV 에 다른 학교 학생이 없다", !body.includes("ZZTD100"));
  ok("CSV 에 비밀번호·응답값 칸이 없다", !/password|비밀번호|value_int|item_id/i.test(body.split("\n").slice(0, 3).join("\n")));
  WHO = zzAdmin;
  const formula = await ACT.addAction({}, fd({ student_id: "ZZTD1099", name: "=HYPERLINK(\"x\")", department_code: "ZZ26_ME" }));
  const zcsv = await (await CSV.GET(new Request("http://local/org/v3/export/students.csv?state=all"))).text();
  ok("수식으로 읽히는 이름은 작은따옴표로 막힌다", !!formula.ok && zcsv.includes("'=HYPERLINK") && !/(^|,)=HYPERLINK/m.test(zcsv));

  head("D10 CSV 등록 (미리 보기는 쓰지 않는다)");
  const csvText = "student_id,name,department_code\nZZTD2001,등록일,ZZ26_ME\nZZTD2002,등록이,NOPE\n";
  const usersBefore = await n(`SELECT count(*)::text n FROM users`);
  const pv = await ACT.previewAction({}, fd({ csv: csvText }));
  const usersMid = await n(`SELECT count(*)::text n FROM users`);
  ok("미리 보기는 한 줄도 쓰지 않는다", usersMid === usersBefore && (pv.preview?.rows.length ?? 0) === 2, `${usersBefore} → ${usersMid}`);
  const ap = await ACT.applyAction({}, fd({ text: csvText }));
  ok("적용은 정상 줄만 쓰고 오류 줄은 까닭과 함께 돌려준다", ap.done?.created === 1 && ap.done?.rejected.length === 1, JSON.stringify(ap.done ? { c: ap.done.created, r: ap.done.rejected.length } : ap.err));

  /* 치운다: 시험 학교 응시와 시험 계정 */
  const mine = await query<{ id: string }>(`SELECT u.id::text id FROM users u JOIN campus_students cs ON cs.user_id=u.id WHERE cs.student_id LIKE 'ZZTD%'`);
  for (const o of mine) {
    for (const t of ["v3_attempts", "entitlements", "memberships", "campus_students"]) await query(`DELETE FROM ${t} WHERE user_id=$1`, [o.id]).catch(() => undefined);
    await query(`DELETE FROM users WHERE id=$1`, [o.id]).catch(() => undefined);
  }

  const total = pass + bad.length;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, "ADMIN.md"), [
    "# Track D · 기관 관리자 (서버 레벨)", "",
    `- 실행: ${new Date().toISOString().slice(0, 16)}Z · DB \`${URL_}\` (로컬 개발 DB · 운영 아님)`,
    "- 담당자 화면이 부르는 서버 액션 · 집계 · 명단 · CSV 내려받기를 그대로 부른다. 로그인 세션만 바꿔 끼우고 역할 규칙은 실제 `requireRole` 과 같다.",
    "- 학교 둘: PCU(배재대) · ZZTEST(fixture, 운영 등록부에 없음). 집계는 따로 쓴 SQL 과 대조했다.",
    "- **브라우저 검증이 아니다**: 화면 · 다운로드 단추 · 운영 요약 PDF 는 NOT VERIFIED.", "",
    `**통과 ${pass} · 걸림 ${bad.length} / ${total}**`, "",
    "| 판정 | 확인 | 값 |", "|---|---|---|", ...rows, "",
  ].join("\n"));
  console.log(`\n확인 ${total}가지 — 통과 ${pass} · 걸림 ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
