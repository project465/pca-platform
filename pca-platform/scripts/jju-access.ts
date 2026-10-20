/**
 * R2 Track D — 전주대 역할별 접근과 기관 격리를 **제품 함수로** 센다.
 *
 * 화면이 아니라 화면이 부르는 함수를 부른다. 결과·PDF·전주대 리포트 경로는
 * 전부 `attemptOf(id, user.id)` 로 주인을 가리고, 담당자 화면과 내려받기는
 * `campusViewer()` 가 소속 기관 코드로 학교를 정하며, 담당자 조작은
 * `ownedBySchool` 로 그 학교 학생인지 본다. 여기서 그 셋을 ID 를 바꿔 가며
 * 두드린다. HTTP 층(쿠키·미들웨어·302)은 이 세션에서 띄우지 못했다.
 *
 * **고장을 숨기지 않는다.** 걸림이 나오면 그 자리의 원래 값을 되돌려 두고
 * (합성 QA 자료다) 걸림으로 적는다.
 *
 *   APP_ENV=dev V3_CAMPUS_FIXTURE=scripts/fixtures/campus-jju.json \
 *   V3_PREVIEW_OPEN=CS_CORE_V1,EE_CORE_V1,BIZ_CORE_V1 APPLY=yes npx tsx scripts/jju-access.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { query, queryOne } from "../src/lib/db";
import { appEnv } from "../src/lib/env";
import { orgsOf } from "../src/lib/org";
import { university } from "../src/lib/campus/registry";
import { addStudentAccount, allowRetake, applyImport, listStudents, rotateStudentPassword, setAccountStatus } from "../src/lib/campus/manage";
import { campusStudentContext, checkStudent, provisionStudent } from "../src/lib/campus/students";
import { campusV3 } from "../src/lib/me-v3/campus";
import { attemptOf, openAttempt, saveAnswer } from "../src/lib/me-v3/runtime/session";
import { canReadParticipantReport } from "../src/lib/rbac";
import { jjuStudentStatus } from "../src/lib/jju/student";
import { jjuReportFor } from "../src/lib/jju/report-pdf";
import { assertLoginFree, loginOwner } from "../src/lib/jju/login-guard";

const OUT = process.env.OUT ?? "docs/jju/r2/track-d";
let pass = 0; const bad: string[] = []; const log: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) pass++; else bad.push(w);
  const s = `  ${c ? "통과" : "걸림"}  ${w}${saw ? " — " + saw : ""}`; console.log(s); log.push(s);
};
const say = (s: string) => { console.log(s); log.push(s); };
const uid = async (login: string) => (await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id=$1`, [login]))?.id ?? null;

async function main() {
  if (appEnv() === "production") throw new Error("운영에서 돌지 않는다");
  if ((process.env.APPLY ?? "") !== "yes") throw new Error("APPLY=yes (합성 QA 자료를 고치고 되돌린다)");
  const A = (await uid("qa-jju-qaa"))!, B = (await uid("qa-jju-qab"))!;
  const P = (await uid("qa-pcu-qap1"))!;
  const JA = (await uid("qa-jju-admin"))!, PA = (await uid("qa-pcu-admin"))!;
  if (![A, B, P, JA, PA].every(Boolean)) throw new Error("scripts/jju-verify.ts 를 먼저 돌린다");
  const jjuOrg = (await queryOne<{ id: string }>(`SELECT id::text FROM organizations WHERE code='JJU'`))!.id;
  const att = (await queryOne<{ id: string }>(`SELECT id::text FROM v3_attempts WHERE user_id=$1::bigint AND status='scored'`, [A]))!.id;

  say("── 1. 응시·결과·PDF·전주대 리포트 주인 (attemptOf · jjuReportFor)");
  const who: [string, string, boolean][] = [["본인 A", A, true], ["같은 학교 학생 B", B, false], ["전주대 담당자", JA, false], ["배재대 학생", P, false], ["배재대 담당자", PA, false]];
  const matrix: string[] = ["| 누가 | 응시 화면·결과·결과 PDF (`attemptOf`) | 전주대 리포트·PDF (`jjuReportFor`) |", "|---|---|---|"];
  for (const [label, id, should] of who) {
    const a = await attemptOf(att, id);
    const r = await jjuReportFor(att, id);
    ok(`${label} → A 의 응시 ${should ? "열림" : "막힘"}`, (!!a) === should && r.ok === should, `${a ? "열림" : "404"} / ${r.ok ? "열림" : r.why}`);
    matrix.push(`| ${label} | ${a ? "열림" : "404"} | ${r.ok ? "열림" : `404 (${r.why})`} |`);
  }

  say("\n── 2. 담당자 화면의 학교 범위 (campusViewer 와 같은 식)");
  const scope = async (adminId: string) => {
    const orgs = await orgsOf(adminId);
    return { orgIds: orgs.map((o) => Number(o.id)), uni: orgs.map((o) => o.code).find((c) => Boolean(university(c))) ?? null };
  };
  const js = await scope(JA), ps = await scope(PA);
  ok("전주대 담당자의 학교는 JJU 다", js.uni === "JJU", String(js.uni));
  ok("배재대 담당자의 학교는 PCU 다", ps.uni === "PCU", String(ps.uni));
  const jl = await listStudents({ universityCode: js.uni!, withDemo: true, limit: 500 });
  ok("전주대 담당자 명단에 배재대 학생이 없다", !jl.rows.some((r) => r.user_id === P), `${jl.total}명`);
  const jv = await campusV3({ orgIds: js.orgIds, universityCode: js.uni, withDemo: true });
  const pv = await campusV3({ orgIds: ps.orgIds, universityCode: ps.uni, withDemo: true });
  ok("전주대 집계와 배재대 집계가 겹치지 않는다", jv.started >= 3 && pv.started >= 1 && jv.started + pv.started === Number((await queryOne<{ n: string }>(`SELECT count(DISTINCT user_id)::text n FROM v3_attempts WHERE university_code IN ('JJU','PCU')`))!.n), `JJU ${jv.started} · PCU ${pv.started}`);

  say("\n── 3. 담당자 조작에 남의 학교 학생 번호를 넣으면 (ID 교체)");
  const actor = { userId: JA, role: "org_admin", orgId: Number(jjuOrg) };
  const s1 = await setAccountStatus("JJU", P, false, actor);
  ok("계정 멈춤: 배재대 학생은 거절", !s1.ok, s1.why ?? "열림");
  const s2 = await rotateStudentPassword("JJU", P, actor);
  ok("비밀번호 재발급: 배재대 학생은 거절", !s2.ok, s2.why ?? "열림");
  const s3 = await allowRetake("JJU", P, actor);
  ok("재응시 허용: 배재대 학생은 거절", !s3.ok, s3.why ?? "열림");
  const s4 = await addStudentAccount("JJU", jjuOrg, { student_id: "QAX1", name: "교차", department_code: "PCU26_BIZ" }, actor);
  ok("학생 추가: 배재대 학과 코드는 거절", !s4.ok, s4.why ?? "열림");
  const s5 = await applyImport("JJU", jjuOrg, "학번,이름,학과코드\nQAX2,교차,PCU26_BIZ\n", actor);
  ok("CSV 등록: 배재대 학과 코드 줄은 거절", s5.created.length === 0 && s5.updated === 0, `만듦 ${s5.created.length} · 고침 ${s5.updated} · 거절 ${s5.rejected.length}`);

  say("\n── 4. 같은 아이디(학번)가 두 학교에 있을 때");
  const before = await queryOne<{ university_code: string; college_code: string; department_code: string; specialization: string | null }>(
    `SELECT university_code, college_code, department_code, specialization FROM campus_students WHERE user_id=$1::bigint`, [P]);
  const pcuLogin = (await queryOne<{ l: string }>(`SELECT login_id l FROM users WHERE id=$1::bigint`, [P]))!.l;
  const s6 = await addStudentAccount("JJU", jjuOrg, { student_id: "QAX3", name: "학번 겹침", login_id: pcuLogin, department_code: "JJU1_AI" }, actor);
  const after = await queryOne<NonNullable<typeof before>>(
    `SELECT university_code, college_code, department_code, specialization FROM campus_students WHERE user_id=$1::bigint`, [P]);
  const changed = JSON.stringify(before) !== JSON.stringify(after);
  ok("전주대 담당자가 배재대 학생과 같은 아이디로 추가해도 배재대 학생 줄이 바뀌지 않는다",
    !changed, `${s6.ok ? "추가 성공으로 응답" : "거절"} · 전 ${JSON.stringify(before)} · 후 ${JSON.stringify(after)}`);
  const mine = await campusStudentContext(P);
  ok("그 뒤에도 배재대 학생의 학교 맥락이 선다", !!mine, mine ? `${mine.ctx.university_code} ${mine.ctx.department_code}` : "맥락 없음(학과 코드가 남의 학교 것이 되어 등록부와 맞지 않는다)");
  if (changed && before) {
    await query(`UPDATE campus_students SET university_code=$2, college_code=$3, department_code=$4, specialization=$5 WHERE user_id=$1::bigint`,
      [P, before.university_code, before.college_code, before.department_code, before.specialization]);
    say("  되돌림  배재대 QA 학생 줄을 원래 값으로 돌려 두었다");
  }
  /* rotate 경로(운영 스크립트 pcu-students · staging-bootstrap 가 쓴다). C16 수정 뒤에는 실제로 돌려 본다:
     거절되면 아무 줄도 바뀌지 않는다. 바뀌면(수정이 빠지면) QA 학생의 열쇠가 바뀌므로 jju-verify 를 다시 돌린다 */
  const c = checkStudent("JJU", { student_id: "QAX4", name: "x", login_id: pcuLogin, department_code: "JJU1_AI" });
  const hashBefore = (await queryOne<{ h: string }>(`SELECT password_hash h FROM users WHERE id=$1::bigint`, [P]))?.h;
  let rot = "";
  if (c.ok) { try { await provisionStudent(jjuOrg, c.value, { rotate: true }); } catch (e) { rot = (e as Error).message; } }
  const hashAfter = (await queryOne<{ h: string }>(`SELECT password_hash h FROM users WHERE id=$1::bigint`, [P]))?.h;
  const ctxAfter = await campusStudentContext(P);
  ok("rotate 경로도 다른 학교 학생의 열쇠·학교를 덮지 않는다", !!rot && hashBefore === hashAfter && ctxAfter?.ctx.university_code === "PCU",
    `${rot || "통과됨(수정 없음)"} · 열쇠 ${hashBefore === hashAfter ? "그대로" : "바뀜"}`);
  void provisionStudent;
  /* 공통 경로는 못 고치지만 전주대가 소유한 스크립트는 들어가기 전에 멈춘다 */
  const own = await loginOwner(pcuLogin, "JJU");
  let blocked = "";
  try { await assertLoginFree(pcuLogin, "JJU"); } catch (e) { blocked = (e as Error).message; }
  ok("전주대 스크립트 가드: 배재대 학생의 아이디로는 계정을 만들지 않는다", own === "OTHER_SCHOOL" && !!blocked, `${own} · ${blocked || "통과됨"}`);
  const adminLogin = (await queryOne<{ l: string }>(`SELECT login_id l FROM users WHERE login_id='qa-jju-admin'`))?.l;
  if (adminLogin) {
    const ownA = await loginOwner(adminLogin, "JJU");
    ok("전주대 스크립트 가드: 담당자 아이디로도 학생을 만들지 않는다", ownA === "NOT_STUDENT", ownA);
  }
  ok("전주대 스크립트 가드: 새 아이디와 같은 학교 학생은 지나간다",
    (await loginOwner("qa-jju-never-made", "JJU")) === "FREE" && (await loginOwner("qa-jju-qaa", "JJU")) !== "OTHER_SCHOOL");

  say("\n── 5. 개인 결과 열람 규칙 (공통)");
  const rr = canReadParticipantReport({ actor: { userId: Number(JA), role: "org_admin", orgIds: [Number(jjuOrg)] }, orgId: Number(jjuOrg), contractAllowsIndividualAccess: false, participantConsented: false });
  ok("담당자는 계약·동의 없이 개인 결과를 못 연다", !rr.ok, rr.reason ?? "");

  say("\n── 6. 학생 홈 상태 (jjuStudentStatus)");
  const stA = await jjuStudentStatus(A);
  ok("결과를 받은 학생: 결과 보기 + 전주대 리포트 링크", stA?.state === "result" && !!stA.more.find((l) => l.href === `/jju/report/${att}`), stA?.headline ?? "null");
  const fresh = checkStudent("JJU", { student_id: "QAS1", name: "QA 새 학생", login_id: "qa-jju-qas1", department_code: "JJU1_SF" });
  const fs = fresh.ok ? await provisionStudent(jjuOrg, fresh.value, { rotate: true }) : null;
  await query(`DELETE FROM v3_snapshots WHERE attempt_id IN (SELECT id FROM v3_attempts WHERE user_id=$1::bigint)`, [fs?.userId]);
  await query(`DELETE FROM v3_attempts WHERE user_id=$1::bigint`, [fs?.userId]);
  const stN = fs ? await jjuStudentStatus(fs.userId) : null;
  ok("아직 시작 안 한 학생: 검사 시작하기", stN?.state === "start" && stN.primary?.href === "/campus/jju/start", stN?.headline ?? "null");
  if (fs) {
    const ctx = (await campusStudentContext(fs.userId))!.ctx;
    const a0 = await openAttempt({ userId: fs.userId, tier: "PRO", stage: "bachelor", gradField: null, campus: ctx });
    await saveAnswer(a0.id, "G_TD01_INT", { kind: "scale5", value: 4 });
    const stR = await jjuStudentStatus(fs.userId);
    ok("하는 중인 학생: 이어하기와 저장된 답 수", stR?.state === "resume" && stR.answered === 1 && stR.primary?.href === `/v3/${a0.id}`, stR?.headline ?? "null");
    /* 이 응시는 확인용이라 치운다. 남겨 두면 jju-verify 의 집계가 한 명을 더 센다 */
    await query(`DELETE FROM v3_attempts WHERE user_id=$1::bigint`, [fs.userId]);
  }
  ok("배재대 학생에게는 전주대 상태 덩이가 서지 않는다", (await jjuStudentStatus(P)) === null);
  ok("담당자에게는 학생 상태 덩이가 서지 않는다", (await jjuStudentStatus(JA)) === null);

  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/access-matrix.md`, ["# 결과 접근 행렬 (A 의 응시 하나를 다섯 사람이 연다)", "", ...matrix, ""].join("\n"));
  writeFileSync(`${OUT}/jju-access.log`, log.join("\n") + `\n\n통과 ${pass} · 걸림 ${bad.length}\n${bad.map((b) => "- " + b).join("\n")}\n`);
  say(`\n  통과 ${pass} · 걸림 ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
