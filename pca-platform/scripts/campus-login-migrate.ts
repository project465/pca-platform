/**
 * **이미 발급한 학생 · 참여자 계정을 새 아이디 방식으로 옮긴다**(2026-11-02 대표 결정: 아이디 = 학번 · 휴대전화 번호,
 * 처음 비밀번호도 같은 값, 첫 로그인 때 반드시 바꿈).
 *
 * 기본은 **읽기만 한다**: 기관마다 아이디가 학번(전화번호)과 다른 계정, 학번 칸이 전화번호 꼴이 아닌 기관 계정을 적는다.
 * `APPLY=1` 일 때만 바꾼다(운영 DB 변경: 대표 승인 문장 뒤에 배포 설정 세션이 돌린다).
 *
 *   UNI=JJU npm run campus:login-migrate              읽기만(한 기관)
 *   npm run campus:login-migrate                      읽기만(전부)
 *   APPLY=1 IDS=12,34 UNI=JJU npm run campus:login-migrate   고른 계정만 바꿈
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
if (apply && !ids.size) { console.error("APPLY=1 에는 IDS=… 로 바꿀 계정을 적어야 합니다"); process.exit(2); }

async function main(): Promise<void> {
let n = 0, changed = 0, skipped = 0;
for (const u of universities()) {
  if (want && u.university_code !== want) continue;
  const mode = loginModeOf(u), prefix = loginPrefixOf(u);
  const rows = await query<{ id: string; login_id: string | null; sid: string; name: string }>(
    `SELECT u.id::text, u.login_id, cs.student_id AS sid, u.display_name AS name
       FROM campus_students cs JOIN users u ON u.id = cs.user_id
      WHERE cs.university_code = $1 AND u.status <> 'erased' ORDER BY cs.student_id`, [u.university_code]);
  for (const r of rows) {
    const sid = normalizeLoginValue(mode, r.sid);
    const badPhone = mode === "phone" && !/^01\d{8,9}$/.test(sid);
    const expect = `${prefix}${sid}`;
    if (r.login_id === expect && !badPhone) continue;
    n += 1;
    console.log(`${u.university_code}\t#${r.id}\t${r.name}\t학번칸 ${r.sid}\t아이디 ${r.login_id ?? "—"}\t→ ${expect}${badPhone ? "\t(전화번호 꼴이 아님: 학번 칸에 휴대전화 번호를 먼저 적어야 함)" : ""}`);
    if (!apply || !ids.has(r.id) || badPhone) continue;
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
