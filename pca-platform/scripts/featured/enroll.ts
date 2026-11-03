/**
 * **프로그램 참여자를 기수에 넣는다**(중점 기업 카드가 서는 자리).
 *
 *   PROGRAM=KUS26_VISIONSEMI_TOUR FILE=<저장소 밖의 CSV> npx tsx scripts/featured/enroll.ts          # 미리 보기
 *   PROGRAM=KUS26_VISIONSEMI_TOUR FILE=<저장소 밖의 CSV> APPLY=1 npx tsx scripts/featured/enroll.ts  # 실제로 넣기
 *
 * CSV 는 계정 일괄 발급에 쓴 명단을 그대로 써도 된다. 머리글에서 `아이디` · `학번` ·
 * `login_id` · `student_id` 칸 하나를 찾아 읽고 나머지 칸(이름 · 연락처)은 읽지 않는다.
 * 찾는 범위는 프로그램의 기관(`org_code`)에 속한 계정뿐이다.
 *
 * **화면과 로그에 개인정보를 적지 않는다.** 찾은 수 · 넣은 수 · 못 찾은 줄 번호만 낸다.
 * 명단 파일은 저장소에 두지 않는다(저장소 안 경로면 멈춘다).
 */
import { loadEnv } from "../_loop-fixture";
loadEnv();
import { readFileSync } from "node:fs";
import path from "node:path";
import { query, queryOne } from "../../src/lib/db";
import { programByCode } from "../../src/lib/featured";

async function main() {
  const prog = programByCode(process.env.PROGRAM ?? "");
  if (!prog) throw new Error(`PROGRAM 을 featured-programs.v1.json 의 code 로 적으십시오`);
  const file = process.env.FILE ?? "";
  if (!file) throw new Error("FILE 에 명단 CSV 를 적으십시오");
  if (path.resolve(file).startsWith(path.resolve("."))) throw new Error("명단은 저장소 밖에 두십시오(개인정보)");
  const apply = process.env.APPLY === "1";

  const rows = readFileSync(file, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim())
    .map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
  const head = rows[0].map((h) => h.toLowerCase().replace(/\s/g, ""));
  const col = head.findIndex((h) => ["아이디", "login_id", "loginid", "id"].includes(h));
  const scol = head.findIndex((h) => ["학번", "student_id", "studentid", "참여자번호"].includes(h));
  if (col < 0 && scol < 0) throw new Error("머리글에서 아이디 · 학번 칸을 찾지 못했습니다");

  const org = await queryOne<{ id: string }>(`SELECT id::text FROM organizations WHERE code = $1`, [prog.org_code]);
  if (!org) throw new Error(`${prog.org_code} 기관 줄이 없습니다`);

  const found: string[] = []; const miss: number[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const login = col >= 0 ? rows[i][col] : "";
    const sid = scol >= 0 ? rows[i][scol] : "";
    const u = await queryOne<{ id: string }>(
      `SELECT u.id::text FROM users u JOIN memberships m ON m.user_id = u.id AND m.org_id = $1::bigint
        LEFT JOIN campus_students cs ON cs.user_id = u.id
        WHERE ($2 <> '' AND u.login_id = $2) OR ($3 <> '' AND cs.student_id = $3) LIMIT 1`,
      [org.id, login, sid]);
    if (u) found.push(u.id); else miss.push(i + 1);
  }
  console.log(`${prog.title}: 명단 ${rows.length - 1}줄 · 계정을 찾은 줄 ${found.length} · 못 찾은 줄 ${miss.length}${miss.length ? ` (줄 번호 ${miss.join(", ")})` : ""}`);
  if (!apply) { console.log("미리 보기입니다. 넣으려면 APPLY=1"); return; }

  let c = await queryOne<{ id: string }>(
    `SELECT id::text FROM cohorts WHERE org_id = $1::bigint AND (program_code = $2 OR name = $3) ORDER BY id LIMIT 1`,
    [org.id, prog.code, prog.cohort_name]);
  if (!c) {
    c = await queryOne<{ id: string }>(
      `INSERT INTO cohorts (org_id, name, description, program_code) VALUES ($1::bigint, $2, $3, $4) RETURNING id::text`,
      [org.id, prog.cohort_name, prog.title, prog.code]);
  } else {
    await query(`UPDATE cohorts SET program_code = $2 WHERE id = $1::bigint AND program_code IS NULL`, [c.id, prog.code]);
  }
  let added = 0;
  for (const uid of [...new Set(found)]) {
    const r = await query(`INSERT INTO cohort_members (cohort_id, user_id) VALUES ($1::bigint, $2::bigint) ON CONFLICT DO NOTHING RETURNING user_id`, [c!.id, uid]);
    added += r.length;
  }
  console.log(`기수에 넣었습니다: 새로 ${added}명 · 이미 있던 ${new Set(found).size - added}명`);
}
main().then(() => process.exit(0), (e) => { console.error(String(e)); process.exit(1); });
