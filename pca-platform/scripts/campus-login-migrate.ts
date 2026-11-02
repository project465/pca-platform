/**
 * **이미 발급한 학생 · 참여자 계정을 새 아이디 방식으로 옮긴다**(2026-11-02 대표 결정: 아이디 = 학번 · 휴대전화 번호,
 * 처음 비밀번호도 같은 값, 첫 로그인 때 반드시 바꿈).
 *
 * 기본은 **읽기만 한다**: 기관마다 아이디가 학번(전화번호)과 다른 계정, 학번 칸이 전화번호 꼴이 아닌 기관 계정을 적는다.
 * `APPLY=1` 일 때만 바꾼다(운영 DB 변경: 대표 승인 문장 뒤에 배포 설정 세션이 돌린다).
 *
 *   UNI=JJU npm run campus:login-migrate              읽기만(한 기관)
 *   npm run campus:login-migrate                      읽기만(전부)
 *   APPLY=1 IDS=12,34 UNI=JJU npm run campus:login-migrate   고른 계정만 바꿈(내부 번호)
 *   LOGINS=test_jju_user,20141114 npm run campus:login-migrate          지금 아이디로 고른 계정만 보기
 *   LOGINS=sj-old SIDS=sj-old:01000000001 APPLY=1 npm run campus:login-migrate
 *                                                     새 학번 · 전화번호를 정해 주고 바꿈(지금 학번 칸이 그 꼴이 아닐 때)
 *
 *   AUDIT=1 npm run campus:login-migrate      읽기만: 기관마다 학번 꼴이 아닌 계정 수 · 아이디 ≠ 머리+학번 계정 수(이름 없이 수만)
 *   운영 이미지: node ops/campus-login-migrate.cjs (같은 환경 변수)
 *
 * **LOGINS 로 고를 때는 학번 칸을 믿지 않는다**(2026-11-02 운영 시험: 시험 계정의 학번 칸이 아이디와 바뀌어 있거나 학번 꼴이
 * 아니었다). 고른 계정마다 SIDS 로 새 학번 · 전화번호를 **반드시** 적어야 하고, 없으면 건너뛴다.
 *
 * 바꾸는 것(계정마다): 학번 칸을 그 기관 꼴로(전화번호는 숫자만) · 아이디 = 머리 + 학번 · 비밀번호 = 학번 · must_reset_pw = TRUE.
 * 다른 계정이 이미 그 아이디를 쓰면 건너뛰고 적는다. **IDS 없이 APPLY=1 을 주면 멈춘다**(전부를 한꺼번에 바꾸지 않는다).
 */
import { query, queryOne } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { universities } from "../src/lib/campus/registry";
import { loginModeOf, loginPrefixOf, normalizeLoginValue } from "../src/lib/campus/students";

const want = (process.env.UNI ?? "").toUpperCase();
const apply = process.env.APPLY === "1";
const ids = new Set((process.env.IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean));
/* 지금 아이디로 고른다(운영 내부 번호를 몰라도 된다). 테스트 계정만 옮길 때 쓴다(2026-11-02 대표 결정 "테스트 계정만") */
const logins = new Set((process.env.LOGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean));
/* 지금 학번 칸이 학번 · 전화번호 꼴이 아닐 때 새 값을 정해 준다: "지금아이디:새값,…" */
const sids = new Map((process.env.SIDS ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  .map((kv) => [kv.slice(0, kv.lastIndexOf(":")), kv.slice(kv.lastIndexOf(":") + 1)] as [string, string]));
if (apply && !ids.size && !logins.size) { console.error("APPLY=1 에는 IDS=… 나 LOGINS=… 로 바꿀 계정을 적어야 합니다"); process.exit(2); }

async function main(): Promise<void> {
let n = 0, changed = 0, skipped = 0;
if (process.env.AUDIT === "1") {
  /* 이름 · 아이디는 적지 않는다. 수만 센다 */
  for (const u of universities()) {
    if (want && u.university_code !== want) continue;
    const mode = loginModeOf(u), prefix = loginPrefixOf(u);
    const rows = await query<{ login_id: string | null; sid: string }>(
      `SELECT u.login_id, cs.student_id AS sid FROM campus_students cs JOIN users u ON u.id = cs.user_id
        WHERE cs.university_code = $1 AND u.status <> 'erased'`, [u.university_code]);
    const shapeBad = rows.filter((r) => mode === "phone" ? !/^01\d{8,9}$/.test(normalizeLoginValue(mode, r.sid)) : !/^\d{8,10}$/.test(r.sid.trim())).length;
    const idBad = rows.filter((r) => r.login_id !== `${prefix}${normalizeLoginValue(mode, r.sid)}`).length;
    console.log(`${u.university_code}\t계정 ${rows.length}\t${mode === "phone" ? "전화번호" : "학번"} 꼴이 아님 ${shapeBad}\t아이디 ≠ 머리+${mode === "phone" ? "전화번호" : "학번"} ${idBad}`);
  }
  return;
}
for (const u of universities()) {
  if (want && u.university_code !== want) continue;
  const mode = loginModeOf(u), prefix = loginPrefixOf(u);
  const rows = await query<{ id: string; login_id: string | null; sid: string; name: string }>(
    `SELECT u.id::text, u.login_id, cs.student_id AS sid, u.display_name AS name
       FROM campus_students cs JOIN users u ON u.id = cs.user_id
      WHERE cs.university_code = $1 AND u.status <> 'erased' ORDER BY cs.student_id`, [u.university_code]);
  for (const r of rows) {
    if (logins.size && !logins.has(r.login_id ?? "")) continue;
    if (logins.size && !sids.has(r.login_id ?? "")) {
      n += 1; skipped += 1;
      console.log(`${u.university_code}\t#${r.id}\t${r.name}\t아이디 ${r.login_id}\t건너뜀: SIDS 에 새 ${mode === "phone" ? "전화번호" : "학번"}을 적지 않았습니다(학번 칸을 그대로 믿지 않음)`);
      continue;
    }
    const sid = normalizeLoginValue(mode, sids.get(r.login_id ?? "") ?? r.sid);
    const badPhone = mode === "phone" && !/^01\d{8,9}$/.test(sid);
    const expect = `${prefix}${sid}`;
    if (r.login_id === expect && !badPhone && !logins.size) continue;
    n += 1;
    console.log(`${u.university_code}\t#${r.id}\t${r.name}\t학번칸 ${r.sid}\t아이디 ${r.login_id ?? "—"}\t→ ${expect}${badPhone ? "\t(전화번호 꼴이 아님: 학번 칸에 휴대전화 번호를 먼저 적어야 함)" : ""}`);
    if (!apply || !(ids.has(r.id) || logins.has(r.login_id ?? "")) || badPhone) continue;
    const taken = await queryOne<{ id: string }>(`SELECT id::text FROM users WHERE login_id = $1 AND id <> $2::bigint`, [expect, r.id]);
    if (taken) { skipped += 1; console.log(`  건너뜀  #${r.id}: 아이디 ${expect} 를 다른 계정(#${taken.id})이 씁니다`); continue; }
    await query(`UPDATE campus_students SET student_id = $2 WHERE user_id = $1::bigint`, [r.id, sid]);
    await query(`UPDATE users SET login_id = $2, password_hash = $3, must_reset_pw = TRUE WHERE id = $1::bigint`,
      [r.id, expect, await hashPassword(sid)]);
    changed += 1;
    console.log(`  바꿈  #${r.id}: 아이디 ${expect} · 처음 비밀번호 = ${mode === "phone" ? "휴대전화 번호" : "학번"} · 다음 로그인 때 변경`);
  }
}
console.log(`옮길 계정 ${n} · 바꿈 ${changed} · 건너뜀 ${skipped}${apply ? "" : " (읽기만 했습니다)"}`);
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
