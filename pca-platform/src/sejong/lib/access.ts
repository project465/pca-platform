/**
 * 상담사가 참여자 결과를 열 수 있는가 — **한 함수에서만 판단한다.**
 *
 * 네 가지가 다 맞아야 연다. 하나라도 빠지면 닫고, 닫은 것도 기록한다.
 *   ① 같은 기관의 상담사다
 *   ② 그 참여자가 이 상담사에게 배정돼 있다(활성)
 *   ③ 참여자 본인이 이 기관에 결과 열람을 동의했고, 가장 최근 줄이 동의다
 *   ④ 기관 설정이 개인 열람을 허용한다 (시연 기관은 허용으로 둔다)
 *
 * 동의는 공통 표 `consents` 에 `kind = 'data_visibility'` · `org_id` 로 적는다.
 * 공통 엔진 `rbac.canReadParticipantReport` 와 같은 조건이고, 거기 없는
 * **배정**만 세종 쪽 표(`sj_counselor_assignments`)로 더한다 (CR-6 의 대역).
 */
import { query, queryOne } from "@/lib/db";

export const CONSENT_KIND = "data_visibility";
export const CONSENT_VERSION = "SJ-DEMO-COUNSELOR-1";

export async function consentState(userId: number, orgId: number): Promise<{ granted: boolean; at: string | null }> {
  const row = await queryOne<{ granted: boolean; created_at: string }>(
    `SELECT granted, created_at::text FROM consents
      WHERE user_id = $1 AND org_id = $2 AND kind = $3
      ORDER BY created_at DESC, id DESC LIMIT 1`, [userId, orgId, CONSENT_KIND]);
  return { granted: Boolean(row?.granted), at: row?.created_at ?? null };
}

export async function setConsent(userId: number, orgId: number, granted: boolean): Promise<void> {
  await query(
    `INSERT INTO consents (user_id, kind, version, granted, org_id) VALUES ($1,$2,$3,$4,$5)`,
    [userId, CONSENT_KIND, CONSENT_VERSION, granted, orgId]);
}

export type AccessDecision = { ok: true } | { ok: false; reason: string };

export async function counselorMayRead(opts: {
  counselorId: number; orgId: number; participantId: number;
}): Promise<AccessDecision> {
  const staff = await queryOne<{ kind: string }>(
    `SELECT kind FROM sj_staff WHERE user_id = $1 AND org_id = $2 AND kind = 'counselor'`,
    [opts.counselorId, opts.orgId]);
  if (!staff) return { ok: false, reason: "이 기관의 상담사가 아닙니다." };

  const part = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM sj_participants WHERE user_id = $1 AND org_id = $2`,
    [opts.participantId, opts.orgId]);
  if (!part) return { ok: false, reason: "이 기관의 참여자가 아닙니다." };

  const assigned = await queryOne<{ active: boolean }>(
    `SELECT active FROM sj_counselor_assignments
      WHERE org_id = $1 AND counselor_user_id = $2 AND participant_user_id = $3`,
    [opts.orgId, opts.counselorId, opts.participantId]);
  if (!assigned?.active) return { ok: false, reason: "배정된 참여자가 아닙니다." };

  const c = await consentState(opts.participantId, opts.orgId);
  if (!c.granted) return { ok: false, reason: "참여자가 결과 열람에 동의하지 않았습니다." };

  const org = await queryOne<{ workspace_settings: { individual_access?: boolean } }>(
    `SELECT workspace_settings FROM organizations WHERE id = $1`, [opts.orgId]);
  if (!org?.workspace_settings?.individual_access) {
    return { ok: false, reason: "기관 설정에 개인 결과 열람이 들어 있지 않습니다." };
  }
  return { ok: true };
}
