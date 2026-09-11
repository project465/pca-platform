/**
 * 학과 경로를 실제 DB 로 한 바퀴 돈다.
 *   계약 → 회차 → 명단 → 응시·채점 → 공개 승인 → 단체 리포트
 * 확인하는 것 셋 — 좌석이 모자라면 멈추는지, 공개 전에는 학생이 못 보는지,
 * 5명 미만 칸이 감춰지는지.
 */
import { query, queryOne, tx } from "../../src/lib/db";
import { hashPassword } from "../../src/lib/password";
import { createSession, enrollRoster, orgsOf, reissuePassword, releaseSession, sessionsOf } from "../../src/lib/org";
import { parseText } from "../../src/lib/roster";
import { buildCohort } from "../../src/lib/cohort";
import { buildReport } from "../../src/lib/report";
import { questionPage, saveResponse, submitAttempt, findAttempt, PAGE_SIZE } from "../../src/lib/attempts";
import { score } from "../../src/lib/scoring";

const SEATS = 8;

async function main() {
  // ---- 판 깔기 ----
  await query(`DELETE FROM attempts WHERE session_id IN
                 (SELECT id FROM test_sessions WHERE kind='org' AND name LIKE 'ORGCHK%')`);
  await query(`DELETE FROM test_sessions WHERE kind='org' AND name LIKE 'ORGCHK%'`);
  await query(`DELETE FROM contracts WHERE title LIKE 'ORGCHK%'`);
  await query(`DELETE FROM users WHERE login_id LIKE 'orgchk-%'`);

  const org = await queryOne<{ id: string }>(
    `INSERT INTO organizations (code, country, org_type) VALUES ('ORGCHK','KR','department')
     ON CONFLICT (code) DO UPDATE SET status='active' RETURNING id`);
  const pw = await hashPassword("admin-pass-1234");
  const admin = await queryOne<{ id: string }>(
    `INSERT INTO users (login_id, display_name, password_hash, must_reset_pw)
     VALUES ('orgchk-admin','담당자',$1,false)
     ON CONFLICT (login_id) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id`, [pw]);
  await query(`INSERT INTO memberships (user_id, org_id, role) VALUES ($1,$2,'org_admin')
               ON CONFLICT DO NOTHING`, [admin!.id, org!.id]);

  const contract = await tx(async (c) => {
    const r = await c.query<{ id: string }>(
      `INSERT INTO contracts (org_id, title, starts_on, ends_on, seat_count)
       VALUES ($1,'ORGCHK 계약', current_date, current_date + 365, $2) RETURNING id`,
      [org!.id, SEATS]);
    await c.query(`INSERT INTO seats (contract_id) SELECT $1 FROM generate_series(1,$2)`,
      [r.rows[0].id, SEATS]);
    return r.rows[0].id;
  });
  console.log(`계약 ${SEATS}석 생성`);

  console.log(`담당자가 보는 기관: ${(await orgsOf(admin!.id)).map(o=>o.code).join(', ')}`);

  // ---- 회차 ----
  const sid = await createSession(admin!.id, {
    contractId: contract, name: "ORGCHK 2026-1학기",
    opensAt: new Date().toISOString().slice(0,10),
    closesAt: new Date(Date.now()+30*864e5).toISOString().slice(0,10),
    instant: false,
  });
  console.log(`회차 ${sid} · 승인제`);

  // ---- 명단: 좌석 8개인데 10명을 넣어 본다 ----
  const roster = Array.from({length: 10}, (_, i) => `학생${i+1}, orgchk-s${i+1}`).join("\n");
  const r1 = await enrollRoster(admin!.id, sid, parseText(roster));
  console.log(`\n명단 10명 → 생성 ${r1.created.length} · 재사용 ${r1.reused} · 건너뜀 ${r1.skipped.length}`);
  if (r1.skipped.length) console.log(`  건너뛴 이유: ${r1.skipped[0].why}   (좌석 ${SEATS}개뿐이므로 2명이 막혀야 한다)`);

  // 같은 명단을 또 올려도 좌석을 더 먹지 않아야 한다
  const before = await queryOne<{n:number}>(`SELECT count(*)::int AS n FROM seats WHERE contract_id=$1 AND user_id IS NOT NULL`,[contract]);
  await enrollRoster(admin!.id, sid, parseText(roster));
  const after = await queryOne<{n:number}>(`SELECT count(*)::int AS n FROM seats WHERE contract_id=$1 AND user_id IS NOT NULL`,[contract]);
  console.log(`같은 명단 재업로드 → 배정 좌석 ${before!.n} → ${after!.n}   (늘면 안 된다)`);

  // ---- 응시·채점: 우선 4명만 ----
  const attempts = await query<{id:string; user_id:string}>(
    `SELECT id, user_id FROM attempts WHERE session_id=$1 ORDER BY id`, [sid]);
  async function take(attemptId: string, userId: string, seed: number) {
    const a = (await findAttempt(attemptId, userId))!;
    for (let p=1; p<=Math.ceil(a.total/PAGE_SIZE); p++) {
      for (const q of await questionPage(a, p)) {
        let v: number;
        if (q.itemKind === "attention") {
          v = (await queryOne<{e:number}>(`SELECT attention_expect AS e FROM questions WHERE id=$1`,[q.id]))!.e;
        } else v = 2 + ((q.orderNo + seed) % 4);
        await saveResponse(attemptId, userId, q.id, q.options.find(o=>o.orderNo===v)!.id, 5000);
      }
    }
    await submitAttempt(attemptId, userId);
    await score(attemptId);
  }
  for (let i=0;i<4;i++) await take(attempts[i].id, attempts[i].user_id, i);
  let cohort = (await buildCohort(sid))!;
  console.log(`\n4명 채점 → suppressed=${cohort.suppressed}   (5명 미만이라 true 여야 한다)`);

  // ---- 8명 전부 ----
  for (let i=4;i<attempts.length;i++) await take(attempts[i].id, attempts[i].user_id, i);
  cohort = (await buildCohort(sid))!;
  console.log(`${attempts.length}명 채점 → suppressed=${cohort.suppressed}`);
  console.log(`  1순위 직무 분포: ${cohort.topJobs.map(j=>`${j.label} ${j.hidden?'(감춤)':j.n+'명'}`).join(' · ')}`);
  console.log(`  분야 1위: ${cohort.areas[0].name} ${cohort.areas[0].mean}`);
  console.log(`  신뢰도: 정상 ${cohort.quality.ok} · 재확인 ${cohort.quality.check} · 무효 ${cohort.quality.invalid}`);
  console.log(`  증거 입력률 ${cohort.evidenceCoverage}%`);
  console.log(`  교육 수요 1위: ${cohort.demand[0]?.name} 요구 ${cohort.demand[0]?.required} · 충족 ${cohort.demand[0]?.metPct}% · 대상 ${cohort.demand[0]?.hidden?'감춤':cohort.demand[0]?.shortfall+'명'}`);

  // ---- 공개 승인 ----
  const before2 = await buildReport(attempts[0].id, attempts[0].user_id);
  console.log(`\n공개 전 학생이 보는 것: ${before2 === "pending" ? "pending (막힘)" : "결과지 (막혀야 하는데 열렸다)"}`);
  await releaseSession(admin!.id, sid);
  const after2 = await buildReport(attempts[0].id, attempts[0].user_id);
  console.log(`공개 후: ${after2 && after2 !== "pending" ? "결과지 열림" : "아직 막힘 (틀렸다)"}`);

  // ---- 엑셀 업로드 ----
  // 실제 xlsx 를 만들어 파일 경로로 읽힌다. 머리글이 한국어·영어·튀르키예어
  // 어느 쪽이어도 같은 명단이 나와야 한다.
  const { parseFile } = await import("../../src/lib/roster");
  const { makeXlsx } = await import("./make-xlsx");
  for (const head of [["이름","학번"], ["Student Name","Email"], ["Adı","Öğrenci No"]]) {
    const rows = [head, ["가나다", "20260001"], ["라마바", "20260002"]];
    const buf = makeXlsx(rows);
    const parsed = parseFile("명단.xlsx", buf);
    console.log(`  엑셀 머리글 [${head.join(', ')}] → 열 ${JSON.stringify(parsed.columns)} · ${parsed.lines.length}명`);
  }
  const csv = Buffer.from("이름,학번\n가나다,20260001\n라마바,20260002\n", "utf8");
  console.log(`  CSV → ${parseFile("명단.csv", csv).lines.length}명`);

  // ---- 비밀번호 재발급 ----
  const target = attempts[0];
  const before3 = await queryOne<{h:string; m:boolean}>(
    `SELECT password_hash AS h, must_reset_pw AS m FROM users WHERE id=$1`, [target.user_id]);
  const issued = await reissuePassword(admin!.id, sid, target.user_id);
  const after3 = await queryOne<{h:string; m:boolean}>(
    `SELECT password_hash AS h, must_reset_pw AS m FROM users WHERE id=$1`, [target.user_id]);
  console.log(`\n재발급 ${issued.loginId} → 해시 바뀜 ${before3!.h !== after3!.h} · 첫로그인 변경강제 ${after3!.m}`);
  const { verifyPassword } = await import("../../src/lib/password");
  console.log(`  새 비밀번호로 검증: ${await verifyPassword(issued.tempPassword, after3!.h)}`);
  try {
    await reissuePassword(admin!.id, sid, "999999");
    console.log("  명단에 없는 학생 → 통과 (막았어야 한다)");
  } catch (e) { console.log(`  명단에 없는 학생 → 거절: ${(e as Error).message}`); }

  const list = await sessionsOf([org!.id]);
  console.log(`\n담당자 목록: ${list[0].name} · 명단 ${list[0].enrolled} · 채점 ${list[0].scored} · 공개 ${list[0].releasedAt ? 'O' : 'X'}`);
  process.exit(0);
}
main().catch((e)=>{ console.error(e); process.exit(1); });
