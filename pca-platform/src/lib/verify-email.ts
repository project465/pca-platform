/**
 * 메일 주소 확인.
 *
 * **응시를 막지 않는다**(규격 §16: 메일 실패가 제품 접근을 막지 않는다).
 * 확인은 **연락이 닿는지**를 아는 일이고, 산 것을 주지 않는 근거가 아니다.
 * 결과지가 준비됐다는 메일이 오타 난 주소로 나가면 산 사람은 기다리고
 * 우리는 보냈다고 생각하는데, 그 상태를 이 표가 가른다.
 *
 * **열쇠를 저장하지 않는다.** 링크의 원문은 메일에만 담고 표에는 해시만
 * 남긴다(임시 비밀번호와 같은 규칙). 그래서 보내는 것도 대기열이 아니라
 * `sendNow()` 로 그 자리에서 한다.
 */
import { query, queryOne } from "./db";
import { createResetToken, hashToken } from "./password";
import { sendNow } from "./outbox";

const TTL_HOURS = 72;

export type SendResult = { ok: boolean; reason?: "no_email" | "already" | "mail_off" };

/** 확인 링크를 보낸다. 보냈는지를 그대로 돌려준다 */
export async function sendVerification(userId: string, origin: string): Promise<SendResult> {
  const u = await queryOne<{ email: string | null; email_verified_at: string | null }>(
    `SELECT email, email_verified_at::text FROM users WHERE id = $1`,
    [userId],
  ).catch(() => null);
  if (!u?.email) return { ok: false, reason: "no_email" };
  if (u.email_verified_at) return { ok: false, reason: "already" };

  const { token, tokenHash } = createResetToken();
  await query(
    `UPDATE email_verify_tokens SET used_at = now()
      WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );
  await query(
    `INSERT INTO email_verify_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + ($3 || ' hours')::interval)`,
    [userId, tokenHash, String(TTL_HOURS)],
  );

  const sent = await sendNow({
    kind: "verify_email",
    userId,
    link: `${origin.replace(/\/$/, "")}/verify/${token}`,
    hours: TTL_HOURS,
  });
  /* **보낸 척하지 않는다.** 메일이 안 붙어 있으면 그 사실을 돌려주고
     화면이 그대로 적는다 */
  return sent ? { ok: true } : { ok: false, reason: "mail_off" };
}

/** 링크를 눌렀다. 한 번만 먹는다 */
export async function confirm(token: string): Promise<boolean> {
  const row = await queryOne<{ user_id: string }>(
    `UPDATE email_verify_tokens SET used_at = now()
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
      RETURNING user_id::text`,
    [hashToken(token)],
  ).catch(() => null);
  if (!row) return false;
  await query(
    `UPDATE users SET email_verified_at = now()
      WHERE id = $1 AND email_verified_at IS NULL`,
    [row.user_id],
  );
  return true;
}

export async function isVerified(userId: string): Promise<boolean | null> {
  const u = await queryOne<{ email: string | null; email_verified_at: string | null }>(
    `SELECT email, email_verified_at::text FROM users WHERE id = $1`,
    [userId],
  ).catch(() => null);
  if (!u?.email) return null;   // 주소가 없으면 확인할 것도 없다
  return Boolean(u.email_verified_at);
}
