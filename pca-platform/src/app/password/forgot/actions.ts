"use server";

import { query, queryOne, tx } from "@/lib/db";
import { createResetToken } from "@/lib/password";
import { sendNow } from "@/lib/outbox";
import { headers } from "next/headers";

export type ForgotState = { done?: boolean; devLink?: string };

const TOKEN_TTL_HOURS = 24;

/**
 * 계정이 있든 없든 같은 화면을 돌려준다.
 * 응답이 다르면 남의 학번이 등록돼 있는지 확인하는 수단이 된다.
 *
 * **메일은 그 자리에서 보내고 아무것도 적지 않는다.** 링크에 한 번 쓰는
 * 열쇠가 들어 있어서, 대기열 표에 적으면 DB 가 새는 순간 남의 계정이 된다
 * (`outbox.sendNow` 주석). 돈길 옆도 아니라서 실패하면 다시 누르면 된다.
 *
 * 학생 계정은 email 이 없는 경우가 많아, 그쪽은 학과 담당자가 재설정
 * 링크를 발급해 전달하는 경로가 그대로 남는다.
 */
export async function forgotAction(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  if (!identifier) return { done: true };

  const user = await queryOne<{ id: string; email: string | null }>(
    `SELECT id, email FROM users
      WHERE (login_id = $1 OR lower(email) = lower($1)) AND status = 'active'
      LIMIT 1`,
    [identifier],
  );

  if (!user) return { done: true };

  const { token, tokenHash } = createResetToken();

  await tx(async (c) => {
    // 이전에 발급한 링크는 무효로 돌린다. 살아 있는 링크는 항상 하나다.
    await c.query(
      `UPDATE password_reset_tokens SET used_at = now()
        WHERE user_id = $1 AND used_at IS NULL`,
      [user.id],
    );
    await c.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + ($3 || ' hours')::interval)`,
      [user.id, tokenHash, String(TOKEN_TTL_HOURS)],
    );
  });

  /* 주소는 **요청이 들어온 그 호스트**에서 가져온다. 환경변수에 적어 둔
     것이 staging 이면 메일에 staging 링크가 나간다(규격 §11) */
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto")
    ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const link = `${proto}://${host}/password/reset/${token}`;

  const sent = await sendNow({
    kind: "password_reset", userId: user.id, link, hours: TOKEN_TTL_HOURS,
  }).catch(() => false);

  /* 개발에서는 링크를 화면에 적어 둔다. 운영에서는 적지 않는다:
     **화면에 적으면 남의 화면에서도 보인다** */
  if (process.env.NODE_ENV === "production") return { done: true };
  return { done: true, devLink: sent ? undefined : link };
}

export async function countActiveTokens(userId: string): Promise<number> {
  const rows = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM password_reset_tokens
      WHERE user_id = $1 AND used_at IS NULL AND expires_at > now()`,
    [userId],
  );
  return Number(rows[0]?.n ?? 0);
}
