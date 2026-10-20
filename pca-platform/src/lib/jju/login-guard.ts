/**
 * 전주대 쪽 스크립트가 계정을 만들기 전에 그 아이디가 남의 것인지 본다.
 *
 * 공통 `provisionStudent()` 는 아이디가 겹치면 그 줄을 **학교를 보지 않고**
 * 고친다(R2 Track D · 변경 요청 C16). 공통 코드는 이 세션이 고치지 않으므로,
 * 전주대가 소유한 스크립트(`jju-demo-setup` · `jju-verify`)만이라도 그 길로
 * 들어가기 전에 멈춘다. 담당자 화면의 `학생 추가` 는 공통 경로라 여기서
 * 막지 못하고, 그 자리는 C16 이 닫는다.
 *
 * 허용하는 경우는 둘이다: 그 아이디가 아직 없거나, 이미 **같은 학교의
 * 학생**이다. 개인 회원이거나 담당자이거나 다른 학교 학생이면 거절한다.
 */
import { queryOne } from "@/lib/db";

export type LoginOwner = "FREE" | "SAME_SCHOOL" | "OTHER_SCHOOL" | "NOT_STUDENT";

export async function loginOwner(loginId: string, uni: string): Promise<LoginOwner> {
  const row = await queryOne<{ uni: string | null }>(
    `SELECT cs.university_code AS uni
       FROM users u LEFT JOIN campus_students cs ON cs.user_id = u.id
      WHERE u.login_id = $1`, [loginId]);
  if (!row) return "FREE";
  if (row.uni == null) return "NOT_STUDENT";
  return row.uni === uni ? "SAME_SCHOOL" : "OTHER_SCHOOL";
}

export async function assertLoginFree(loginId: string, uni: string): Promise<void> {
  const who = await loginOwner(loginId, uni);
  if (who === "FREE" || who === "SAME_SCHOOL") return;
  throw new Error(who === "OTHER_SCHOOL"
    ? `아이디 ${loginId} 는 다른 학교 학생의 것이라 만들지 않습니다(C16)`
    : `아이디 ${loginId} 는 학생이 아닌 계정의 것이라 만들지 않습니다(C16)`);
}
