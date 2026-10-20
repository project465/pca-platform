/**
 * 세종 화면의 출입.
 *
 * 로그인은 공통 엔진(Auth.js · `users` · `memberships`)을 그대로 쓴다.
 * 세종에서 갈리는 것은 **그 사람이 이 기관에서 무엇인가** 하나다:
 * 참여자(`sj_participants`) · 관리자 · 상담사(`sj_staff`).
 */
import { redirect } from "next/navigation";
import { currentUser, type SessionUser } from "@/lib/session";
import { queryOne, query } from "@/lib/db";

export const SEJONG_ORG_CODE = "SJEPA_DEMO";

export type SejongKind = "participant" | "admin" | "counselor";

export type SejongActor = {
  user: SessionUser;
  userId: number;
  orgId: number;
  kinds: SejongKind[];
  programCode: string | null;
  participantNo: string | null;
};

export async function sejongOrgId(): Promise<number | null> {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM organizations WHERE code = $1`, [SEJONG_ORG_CODE]);
  return row ? Number(row.id) : null;
}

export async function sejongActor(): Promise<SejongActor | null> {
  const user = await currentUser();
  if (!user) return null;
  const orgId = await sejongOrgId();
  if (!orgId) return null;
  const userId = Number(user.id);
  const kinds: SejongKind[] = [];
  const p = await queryOne<{ program_code: string; participant_no: string; status: string }>(
    `SELECT program_code, participant_no, status FROM sj_participants
      WHERE user_id = $1 AND org_id = $2`, [userId, orgId]);
  if (p && p.status === "active") kinds.push("participant");
  const staff = await query<{ kind: SejongKind }>(
    `SELECT kind FROM sj_staff WHERE user_id = $1 AND org_id = $2`, [userId, orgId]);
  for (const s of staff) kinds.push(s.kind);
  return {
    user, userId, orgId, kinds,
    programCode: p?.program_code ?? null,
    participantNo: p?.participant_no ?? null,
  };
}

/** 그 역할이 아니면 세종 로그인으로 돌려보낸다. 다른 기관 사람도 같다 */
export async function requireSejong(kind: SejongKind): Promise<SejongActor> {
  const a = await sejongActor();
  if (!a) redirect("/sejong/login");
  if (a.user.mustResetPw) redirect("/sejong/password");
  if (!a.kinds.includes(kind)) redirect("/sejong/login?denied=1");
  return a;
}

export function homeFor(kinds: SejongKind[]): string {
  if (kinds.includes("admin")) return "/sejong/admin";
  if (kinds.includes("counselor")) return "/sejong/counselor";
  return "/sejong/me";
}
