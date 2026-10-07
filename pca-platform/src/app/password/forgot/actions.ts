"use server";

import { query, queryOne, tx } from "@/lib/db";
import { createResetToken } from "@/lib/password";
import { mailReady, sendNow } from "@/lib/outbox";
import { headers } from "next/headers";
import { publicBase } from "@/lib/urls";

export type ForgotState = {
  done?: boolean;
  devLink?: string;
  /**
   * 이 배포본에 메일이 붙어 있지 않다.
   *
   * **보낸 척하지 않는다.** `MAIL_HOST`·`MAIL_FROM` 이 비어 있으면 한 통도
   * 나가지 않는데, 화면이 "보냈습니다" 로만 끝나면 기다리는 사람은 받은
   * 편지함만 들여다본다.
   *
   * **이 값은 계정이 있는지와 무관하다.** 배포본의 설정 하나만 보고 정하므로
   * 답이 사람마다 갈리지 않는다 — 갈리면 그 답이 남의 학번이 등록돼 있는지
   * 확인하는 수단이 된다.
   */
  mailOff?: boolean;
};

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
  /* 계정을 찾기 전에 정한다. 뒤에서 정하면 못 찾은 갈래에만 빠진다 */
  const mailOff = !mailReady();

  const identifier = String(formData.get("identifier") ?? "").trim();
  if (!identifier) return { done: true, mailOff };

  const user = await queryOne<{ id: string; email: string | null }>(
    `SELECT id, email FROM users
      WHERE (login_id = $1 OR lower(email) = lower($1)) AND status = 'active'
      LIMIT 1`,
    [identifier],
  );

  if (!user) return { done: true, mailOff };

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

  /**
   * 링크의 바탕 주소는 **정규 주소**다(`site_configs.canonical_url`).
   *
   * 받는 사람은 다른 날 다른 자리에서 이 링크를 연다. 지금 요청이 들어온
   * 호스트를 그대로 적으면, staging 에서 누른 재설정이 staging 링크로
   * 나가고 그 주소는 밖에서 안 열린다. 정규 주소가 없을 때만(개발)
   * 지금 호스트로 되돌린다.
   */
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto")
    ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const base = (await publicBase("KR").catch(() => null)) ?? `${proto}://${host}`;
  const link = `${base}/password/reset/${token}`;

  const sent = await sendNow({
    kind: "password_reset", userId: user.id, link, hours: TOKEN_TTL_HOURS,
  }).catch(() => false);

  /* 개발에서는 링크를 화면에 적어 둔다. 운영에서는 적지 않는다:
     **화면에 적으면 남의 화면에서도 보인다** */
  if (process.env.NODE_ENV === "production") return { done: true, mailOff };
  return { done: true, mailOff, devLink: sent ? undefined : link };
}

export async function countActiveTokens(userId: string): Promise<number> {
  const rows = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM password_reset_tokens
      WHERE user_id = $1 AND used_at IS NULL AND expires_at > now()`,
    [userId],
  );
  return Number(rows[0]?.n ?? 0);
}
