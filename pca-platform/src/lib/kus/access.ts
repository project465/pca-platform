/**
 * KUS 화면에 **누가 들어오는가.** 묻는 자리를 하나로 둔다.
 *
 * 학생 쪽은 공통 자(`campusStudentOf`)를 그대로 쓴다: 그 학교가 발급한
 * 학생 줄(`campus_students.university_code = 'KUS'`)이 있고 등록부와
 * 맞아야 한다. 개인 회원 · 다른 학교 학생 · 다른 기관(진흥원 등) 사용자는
 * 로그인해 있어도 KUS 학생 화면을 받지 않는다.
 *
 * 담당자 쪽은 **KUS 기관 줄의 `org_admin` 소속** 하나다. 세션에 실린
 * 소속을 믿지 않고 DB 를 다시 본다: 소속을 거둔 날 세션이 남아 있으면
 * 그 사람이 계속 들어온다.
 *
 * **담당자에게 개인별 결과를 열지 않는다.** 계약과 동의 범위가 정해지기
 * 전이라, 담당자 화면이 받는 것은 공통 집계(5명 규칙을 지나는 것)와
 * 탐방 등록뿐이다. 그 경계는 이 파일이 아니라 담당자 화면이 **개인 결과를
 * 부르는 쿼리를 아예 갖지 않는 것**으로 지킨다.
 */
import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { currentUser, type SessionUser } from "@/lib/session";
import { campusStudentOf } from "@/lib/campus/students";
import { KUS_CODE, KUS_ORG_CODE } from "./program";

export type KusStudent = NonNullable<Awaited<ReturnType<typeof campusStudentOf>>>;

const LOGIN = `/campus/${KUS_CODE.toLowerCase()}/login?next=${encodeURIComponent("/kus")}`;

/** 그 사람이 KUS 학생이면 학교 맥락, 아니면 `null` */
export async function kusStudentOf(userId: string): Promise<KusStudent | null> {
  return campusStudentOf(userId, KUS_CODE);
}

/**
 * KUS 학생 화면의 문. 로그인하지 않았거나 KUS 학생이 아니면 KUS 로그인으로
 * 보낸다. 거기가 **앞사람의 세션을 학교 계정으로 바꾸는 자리**다.
 */
export async function requireKusStudent(): Promise<{ user: SessionUser; me: KusStudent }> {
  const user = await currentUser();
  if (!user) redirect(LOGIN);
  if (user.mustResetPw) redirect("/password/change");
  const me = await kusStudentOf(user.id);
  if (!me) redirect(`${LOGIN}&e=not-kus`);
  return { user, me };
}

/** KUS 기관 줄의 번호. 없으면 `null`(시연 DB 를 아직 세우지 않았다) */
export async function kusOrgId(): Promise<string | null> {
  const r = await queryOne<{ id: string }>(
    `SELECT id::text FROM organizations WHERE code = $1`, [KUS_ORG_CODE]);
  return r?.id ?? null;
}

/** 그 사람이 KUS 기관의 담당자인가. **DB 를 다시 본다** */
export async function isKusAdmin(userId: string): Promise<boolean> {
  const r = await queryOne<{ ok: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM memberships m JOIN organizations o ON o.id = m.org_id
        WHERE m.user_id = $1::bigint AND o.code = $2 AND m.role = 'org_admin'
          AND o.status = 'active') AS ok`, [userId, KUS_ORG_CODE]);
  return r?.ok === true;
}

export async function requireKusAdmin(): Promise<{ user: SessionUser; orgId: string }> {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/kus/admin")}`);
  if (user.mustResetPw) redirect("/password/change");
  const orgId = await kusOrgId();
  if (!orgId || !(await isKusAdmin(user.id))) redirect("/kus/denied");
  return { user, orgId };
}
