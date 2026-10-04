/**
 * 좌석(라이선스) 생애주기.
 *
 * **초대를 좌석 사용으로 치지 않는다.** 초대만 보내 놓고 아무도 안 들어온
 * 날, 쓴 좌석을 센 숫자가 틀리면 기관이 돈을 더 냈다고 생각한다. 쓴 것은
 * `started` 부터다.
 *
 * 좌석 표를 새로 만들지 않고 `seats` 에 생애주기를 붙였다. 등급을 정하는
 * 곳이 둘이 되면 그중 하나는 반드시 뒤처진다(설계 원칙 10).
 */
import { query } from "@/lib/db";
import { createHash, randomBytes } from "node:crypto";

export const SEAT_STATUS = [
  "available", "invited", "claimed", "started", "completed", "expired", "revoked",
] as const;
export type SeatStatus = (typeof SEAT_STATUS)[number];

export type SeatCounts = {
  total: number; available: number; invited: number; claimed: number;
  started: number; completed: number; expired: number; revoked: number;
  /** 쓴 좌석. 초대와 배정은 아직 쓴 것이 아니다 */
  used: number;
  remaining: number;
};

export async function seatCounts(contractId: number): Promise<SeatCounts> {
  const rows = await query<{ status: SeatStatus; n: string }>(
    `SELECT status, count(*)::text AS n FROM seats WHERE contract_id = $1 GROUP BY status`,
    [contractId],
  );
  const by = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)])) as Record<SeatStatus, number>;
  const g = (k: SeatStatus) => by[k] ?? 0;
  const total = SEAT_STATUS.reduce((a, k) => a + g(k), 0);
  const used = g("started") + g("completed");
  return {
    total,
    available: g("available"), invited: g("invited"), claimed: g("claimed"),
    started: g("started"), completed: g("completed"),
    expired: g("expired"), revoked: g("revoked"),
    used,
    remaining: total - used - g("revoked") - g("expired"),
  };
}

/** 계약이 아직 살아 있는가. 끝난 계약은 좌석을 더 내주지 않는다. */
export async function contractIsLive(contractId: number): Promise<boolean> {
  const rows = await query<{ live: boolean }>(
    `SELECT (status = 'active' AND ends_on >= current_date) AS live
       FROM contracts WHERE id = $1`,
    [contractId],
  );
  return rows[0]?.live === true;
}

function hash(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
/** 초대 코드. **원문은 돌려줄 때 한 번만 보여주고 저장하지 않는다.** */
export function newInviteCode(): { code: string; sha: string } {
  const code = randomBytes(9).toString("base64url").toUpperCase();
  return { code, sha: hash(code) };
}

export async function inviteSeat(opts: {
  orgId: number; contractId: number; email?: string | null;
  cohortId?: number | null; createdBy?: number | null;
  kind?: "email" | "link" | "cohort_code";
}): Promise<{ ok: true; code: string; seatId: number } | { ok: false; reason: string }> {
  if (!(await contractIsLive(opts.contractId))) {
    return { ok: false, reason: "기간이 끝났거나 멈춘 계약입니다. 좌석을 더 내줄 수 없습니다." };
  }
  const rows = await query<{ id: number }>(
    `UPDATE seats SET status = 'invited', invited_at = now()
      WHERE id = (SELECT id FROM seats
                   WHERE contract_id = $1 AND status = 'available'
                   ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED)
      RETURNING id`,
    [opts.contractId],
  );
  const seat = rows[0];
  if (!seat) return { ok: false, reason: "남은 좌석이 없습니다." };

  const { code, sha } = newInviteCode();
  await query(
    `INSERT INTO invitations
       (org_id, contract_id, seat_id, cohort_id, email, code_sha256, kind, created_by, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now() + interval '60 days')`,
    [opts.orgId, opts.contractId, seat.id, opts.cohortId ?? null,
     opts.email ?? null, sha, opts.kind ?? "email", opts.createdBy ?? null],
  );
  return { ok: true, code, seatId: seat.id };
}

/** 초대 코드를 좌석으로 바꾼다. **한 번만 된다**: 조건이 UPDATE 안에 있다. */
export async function claimInvite(code: string, userId: number): Promise<
  { ok: true; seatId: number } | { ok: false; reason: string }
> {
  const rows = await query<{ id: number; seat_id: number; contract_id: number }>(
    `UPDATE invitations SET status = 'claimed', claimed_at = now(), claimed_by = $2
      WHERE code_sha256 = $1 AND status = 'sent'
        AND (expires_at IS NULL OR expires_at > now())
      RETURNING id, seat_id, contract_id`,
    [hash(code), userId],
  );
  const inv = rows[0];
  if (!inv) return { ok: false, reason: "쓸 수 없는 코드입니다. 이미 쓰였거나 기간이 지났습니다." };
  if (!(await contractIsLive(inv.contract_id))) {
    return { ok: false, reason: "기간이 끝난 계약의 초대입니다." };
  }
  const seatRows = await query(
    `UPDATE seats SET user_id = $2, status = 'claimed', assigned_at = now(), claimed_at = now()
      WHERE id = $1 AND status = 'invited' RETURNING id`,
    [inv.seat_id, userId],
  );
  if (!seatRows[0]) return { ok: false, reason: "좌석 상태가 맞지 않습니다." };
  return { ok: true, seatId: inv.seat_id };
}

/** 응시를 시작한 순간 좌석이 소진된다. */
export async function markStarted(seatId: number): Promise<boolean> {
  const rows = await query(
    `UPDATE seats SET status = 'started', consumed_at = COALESCE(consumed_at, now())
      WHERE id = $1 AND status IN ('claimed') RETURNING id`,
    [seatId],
  );
  return rows.length > 0;
}

export async function markCompleted(seatId: number): Promise<boolean> {
  const rows = await query(
    `UPDATE seats SET status = 'completed', completed_at = now()
      WHERE id = $1 AND status = 'started' RETURNING id`,
    [seatId],
  );
  return rows.length > 0;
}

/**
 * 안 쓴 좌석을 거둔다.
 *
 * **이미 시작한 좌석은 거두지 않는다.** 응시 중인 사람의 화면이 끊기고,
 * 그 사람은 자기가 무엇을 잘못했는지 모른다.
 */
export async function revokeSeat(seatId: number, byUserId: number): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  const rows = await query(
    `UPDATE seats SET status = 'revoked', revoked_at = now(), revoked_by = $2, user_id = NULL
      WHERE id = $1 AND status IN ('available','invited','claimed') RETURNING id`,
    [seatId, byUserId],
  );
  if (!rows[0]) return { ok: false, reason: "이미 응시를 시작했거나 끝난 좌석입니다." };
  await query(
    `UPDATE invitations SET status = 'revoked' WHERE seat_id = $1 AND status = 'sent'`,
    [seatId],
  );
  return { ok: true };
}

/** 거둔 좌석으로는 응시를 시작할 수 없다. */
export async function seatCanStart(seatId: number): Promise<boolean> {
  const rows = await query<{ ok: boolean }>(
    `SELECT (s.status = 'claimed' AND c.status = 'active' AND c.ends_on >= current_date) AS ok
       FROM seats s JOIN contracts c ON c.id = s.contract_id WHERE s.id = $1`,
    [seatId],
  );
  return rows[0]?.ok === true;
}
