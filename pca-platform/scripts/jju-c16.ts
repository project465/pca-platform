/**
 * C16 을 독립적으로 다시 잰다: 이미 있는 아이디로 계정을 만들거나 고치는 공통
 * 진입점이 **그 아이디의 주인을 보지 않고** 그 줄을 바꾸는가.
 *
 * R2 의 `jju-access.ts` 4절은 배재대 QA 학생 한 명에게 한 방향만 해 봤다.
 * 여기서는 피해자를 진입점마다 **새로 만들고**(qa-c16-*), 바꾸기 전과 뒤의
 * 줄을 통째로 떠서 견주고, 끝나면 그 사람들을 지운다. 운영 자료와 기존 QA
 * 계정을 건드리지 않는다. `rotate` 경로도 여기서는 돌린다: 피해자가 합성이라
 * 해시가 바뀌어도 되돌릴 일이 없다.
 *
 * **공통 코드를 고치지 않는다.** 걸리는 줄이 곧 C16 의 재현이고, 판정은 공통
 * 담당이 고친 뒤에 같은 스크립트로 다시 본다(통과해야 한다).
 *
 *   APPLY=yes V3_CAMPUS_FIXTURE=scripts/fixtures/campus-jju.json \
 *   npx tsx scripts/jju-c16.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { query, queryOne } from "../src/lib/db";
import { appEnv } from "../src/lib/env";
import { addStudentAccount, applyImport, rotateStudentPassword } from "../src/lib/campus/manage";
import { checkStudent, provisionStudent } from "../src/lib/campus/students";

const OUT = process.env.OUT ?? "docs/jju/r3/security/C16";
let pass = 0; const bad: string[] = []; const log: string[] = [];
const ok = (w: string, c: boolean, saw = "") => {
  if (c) pass++; else bad.push(w);
  const s = `  ${c ? "통과" : "걸림"}  ${w}${saw ? " — " + saw : ""}`; console.log(s); log.push(s);
};
const say = (s: string) => { console.log(s); log.push(s); };

type Snap = { user: unknown; cs: unknown; mem: unknown };
async function snap(login: string): Promise<Snap> {
  const user = await queryOne(`SELECT id::text, login_id, display_name, email, status, password_hash FROM users WHERE login_id=$1`, [login]);
  const id = (user as { id?: string } | null)?.id ?? null;
  const cs = id ? await queryOne(`SELECT university_code, student_id, college_code, department_code, specialization FROM campus_students WHERE user_id=$1::bigint`, [id]) : null;
  const mem = id ? (await query(`SELECT org_id::text, role FROM memberships WHERE user_id=$1::bigint ORDER BY 1,2`, [id])) : [];
  return { user, cs, mem };
}
const same = (a: Snap, b: Snap) => JSON.stringify(a) === JSON.stringify(b);
/** 무엇이 바뀌었는지만 적는다. 해시 값은 적지 않는다 */
function diff(a: Snap, b: Snap): string {
  const out: string[] = [];
  const ua = a.user as Record<string, unknown> | null, ub = b.user as Record<string, unknown> | null;
  if (ua && ub) for (const k of Object.keys(ua)) if (ua[k] !== ub[k]) out.push(k === "password_hash" ? "password_hash(바뀜)" : `${k}: ${ua[k]} → ${ub[k]}`);
  if (JSON.stringify(a.cs) !== JSON.stringify(b.cs)) out.push(`campus_students: ${JSON.stringify(a.cs)} → ${JSON.stringify(b.cs)}`);
  if (JSON.stringify(a.mem) !== JSON.stringify(b.mem)) out.push(`memberships: ${JSON.stringify(a.mem)} → ${JSON.stringify(b.mem)}`);
  return out.join(" · ") || "변화 없음";
}

const made: string[] = [];
async function student(uni: string, orgId: string, login: string, dept: string) {
  const c = checkStudent(uni, { student_id: login.toUpperCase(), name: `피해자 ${login}`, login_id: login, department_code: dept });
  if (!c.ok) throw new Error(c.why);
  await provisionStudent(orgId, c.value, { rotate: true });
  made.push(login);
}
async function plainUser(login: string, staffOrg: string | null) {
  const u = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, display_name, password_hash, status, locale, must_reset_pw)
     VALUES ($1, $1, 'c16-fixed-hash', 'active', 'ko', FALSE) RETURNING id::text`, [login]);
  if (staffOrg) await query(`INSERT INTO memberships (user_id, org_id, role) VALUES ($1::bigint,$2::bigint,'org_admin')`, [u!.id, staffOrg]);
  made.push(login);
}

async function main() {
  if (appEnv() === "production") throw new Error("운영에서 돌지 않는다");
  if ((process.env.APPLY ?? "") !== "yes") throw new Error("APPLY=yes (합성 피해자를 만들고 지운다)");
  const org = async (c: string) => (await queryOne<{ id: string }>(`SELECT id::text FROM organizations WHERE code=$1`, [c]))?.id;
  const uid = async (l: string) => (await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id=$1`, [l]))?.id;
  const jjuOrg = await org("JJU"), pcuOrg = await org("PCU");
  const JA = await uid("qa-jju-admin"), PA = await uid("qa-pcu-admin");
  if (!jjuOrg || !pcuOrg || !JA || !PA) throw new Error("scripts/jju-verify.ts 를 먼저 돌린다");
  const jActor = { userId: JA, role: "org_admin", orgId: Number(jjuOrg) };
  const pActor = { userId: PA, role: "org_admin", orgId: Number(pcuOrg) };
  await query(`DELETE FROM users WHERE login_id LIKE 'qa-c16-%'`);

  try {
    say("── 1. 단건 추가 (addStudentAccount · 담당자 화면 `학생 추가`)");
    await student("PCU", pcuOrg, "qa-c16-p1", "PCU26_BIZ");
    let b = await snap("qa-c16-p1");
    let r = await addStudentAccount("JJU", jjuOrg, { student_id: "C16A", name: "교차", login_id: "qa-c16-p1", department_code: "JJU26_AI" }, jActor);
    let a = await snap("qa-c16-p1");
    ok("JJU → PCU 학생 아이디: 거절되고 줄이 그대로다", !r.ok && same(b, a), `${r.ok ? "성공 응답" : "거절"} · ${diff(b, a)}`);

    await student("JJU", jjuOrg, "qa-c16-j1", "JJU26_AI");
    b = await snap("qa-c16-j1");
    r = await addStudentAccount("PCU", pcuOrg, { student_id: "C16B", name: "교차", login_id: "qa-c16-j1", department_code: "PCU26_BIZ" }, pActor);
    a = await snap("qa-c16-j1");
    ok("PCU → JJU 학생 아이디(반대 방향): 거절되고 줄이 그대로다", !r.ok && same(b, a), `${r.ok ? "성공 응답" : "거절"} · ${diff(b, a)}`);

    await plainUser("qa-c16-staff", pcuOrg);
    b = await snap("qa-c16-staff");
    r = await addStudentAccount("JJU", jjuOrg, { student_id: "C16C", name: "교차", login_id: "qa-c16-staff", department_code: "JJU26_AI" }, jActor);
    a = await snap("qa-c16-staff");
    ok("JJU → 다른 기관 담당자 아이디: 거절되고 줄이 그대로다", !r.ok && same(b, a), `${r.ok ? "성공 응답" : "거절"} · ${diff(b, a)}`);

    await plainUser("qa-c16-b2c", null);
    b = await snap("qa-c16-b2c");
    r = await addStudentAccount("JJU", jjuOrg, { student_id: "C16D", name: "교차", login_id: "qa-c16-b2c", department_code: "JJU26_AI" }, jActor);
    a = await snap("qa-c16-b2c");
    ok("JJU → 개인 회원(B2C) 아이디: 거절되고 줄이 그대로다", !r.ok && same(b, a), `${r.ok ? "성공 응답" : "거절"} · ${diff(b, a)}`);

    say("\n── 2. CSV 일괄 등록 (applyImport)");
    await student("PCU", pcuOrg, "qa-c16-p2", "PCU26_BIZ");
    b = await snap("qa-c16-p2");
    const imp = await applyImport("JJU", jjuOrg, "student_id,name,department_code,login_id\nC16E,교차,JJU26_AI,qa-c16-p2\n", jActor);
    a = await snap("qa-c16-p2");
    ok("CSV 에 PCU 학생 아이디: 그 줄이 거절되고 피해자 줄이 그대로다", imp.rejected.length === 1 && same(b, a),
      `만듦 ${imp.created.length} · 고침 ${imp.updated} · 거절 ${imp.rejected.length} · ${diff(b, a)}`);

    say("\n── 3. rotate 경로 (pcu-students · staging-bootstrap 가 쓰는 provisionStudent(..., {rotate:true}))");
    await student("PCU", pcuOrg, "qa-c16-p3", "PCU26_BIZ");
    b = await snap("qa-c16-p3");
    const c = checkStudent("JJU", { student_id: "C16F", name: "교차", login_id: "qa-c16-p3", department_code: "JJU26_AI" });
    let threw = "";
    if (c.ok) { try { await provisionStudent(jjuOrg, c.value, { rotate: true }); } catch (e) { threw = (e as Error).message; } }
    a = await snap("qa-c16-p3");
    ok("rotate 로 PCU 학생 아이디: 거절되고 열쇠·학교·소속이 그대로다", !!threw && same(b, a), `${threw ? "거절" : "통과됨"} · ${diff(b, a)}`);

    say("\n── 4. 비밀번호 재발급 (rotateStudentPassword · 소유 확인이 있는 경로)");
    b = await snap("qa-c16-p1");
    const rp = await rotateStudentPassword("JJU", (await uid("qa-c16-p1"))!, jActor);
    a = await snap("qa-c16-p1");
    ok("JJU 담당자가 PCU 학생 비밀번호 재발급: 거절되고 해시가 그대로다", !rp.ok && same(b, a), `${rp.ok ? "성공" : rp.why} · ${diff(b, a)}`);

    say("\n── 5. 같은 새 아이디를 두 학교가 같은 순간에 만든다 (경쟁)");
    const cj = checkStudent("JJU", { student_id: "C16G", name: "경쟁", login_id: "qa-c16-race", department_code: "JJU26_AI" });
    const cp = checkStudent("PCU", { student_id: "C16G", name: "경쟁", login_id: "qa-c16-race", department_code: "PCU26_BIZ" });
    made.push("qa-c16-race");
    if (!cj.ok || !cp.ok) throw new Error("경쟁 입력이 등록부에 맞지 않는다");
    const res = await Promise.allSettled([provisionStudent(jjuOrg, cj.value), provisionStudent(pcuOrg, cp.value)]);
    const fin = await snap("qa-c16-race");
    const mem = fin.mem as { org_id: string }[];
    const okN = res.filter((x) => x.status === "fulfilled").length;
    ok("경쟁: 한쪽만 성공하고 계정이 한 학교에만 묶인다", okN === 1 && mem.length === 1,
      `성공 ${okN} · 실패 ${res.length - okN} · 소속 ${JSON.stringify(mem)} · campus_students ${JSON.stringify(fin.cs)}`);
  } finally {
    await query(`DELETE FROM users WHERE login_id LIKE 'qa-c16-%'`);
    const left = await queryOne<{ n: string }>(`SELECT count(*)::text n FROM users WHERE login_id LIKE 'qa-c16-%'`);
    say(`\n  정리  합성 피해자 ${made.length}명을 지웠다 (남은 줄 ${left?.n})`);
  }

  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/c16-repro.log`, log.join("\n") + `\n\n통과 ${pass} · 걸림 ${bad.length}\n${bad.map((x) => "- " + x).join("\n")}\n`);
  say(`\n  통과 ${pass} · 걸림 ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
