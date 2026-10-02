import { queryOne } from "@/lib/db";
import { parseDomains } from "@/lib/join-rules";

/**
 * 전용 링크 한 개의 상태.
 *
 * 링크는 그 자체가 자격이므로(계정을 미리 만들어 두지 않는다) 열 때마다
 * 살아 있는지 확인해야 한다. 막힌 이유를 화면에 그대로 보여주기 위해
 * 참·거짓이 아니라 이유를 돌려준다.
 */
export type LinkState =
  | {
      ok: true; orgId: string; linkId: string; label: string; remaining: number | null;
      /** 등록 조건. 없으면 아무나 들어올 수 있다 */
      loginIdMask: string | null;
      emailDomains: string[];
    }
  | { ok: false; reason: "unknown" | "revoked" | "expired" | "full" };

export async function readLink(token: string): Promise<LinkState> {
  const row = await queryOne<{
    id: string;
    org_id: string;
    label: string;
    max_uses: string | null;
    used_count: string;
    revoked: boolean;
    expired: boolean;
    login_id_mask: string | null;
    email_domains: string | null;
  }>(
    `SELECT id, org_id, label, max_uses::text AS max_uses, used_count::text AS used_count,
            login_id_mask, email_domains,
            (revoked_at IS NOT NULL) AS revoked,
            (expires_at IS NOT NULL AND expires_at < now()) AS expired
       FROM org_links WHERE token = $1`,
    [token],
  );

  if (!row) return { ok: false, reason: "unknown" };
  if (row.revoked) return { ok: false, reason: "revoked" };
  if (row.expired) return { ok: false, reason: "expired" };

  const max = row.max_uses === null ? null : Number(row.max_uses);
  const used = Number(row.used_count);
  if (max !== null && used >= max) return { ok: false, reason: "full" };

  return {
    ok: true,
    orgId: row.org_id,
    linkId: row.id,
    label: row.label,
    remaining: max === null ? null : max - used,
    loginIdMask: row.login_id_mask,
    emailDomains: parseDomains(row.email_domains),
  };
}

export const LINK_MESSAGE: Record<
  Exclude<LinkState & { ok: false }, { ok: true }>["reason"],
  { title: string; body: string }
> = {
  unknown: {
    title: "링크를 찾을 수 없습니다",
    body: "주소가 잘못되었거나 지워진 링크입니다. 학과 담당자에게 받은 주소를 다시 확인해 주세요.",
  },
  revoked: {
    title: "닫힌 링크입니다",
    body: "담당자가 이 링크를 회수했습니다. 새 링크를 받아 주세요.",
  },
  expired: {
    title: "기간이 지난 링크입니다",
    body: "응시 기간이 끝났습니다. 학과 담당자에게 문의해 주세요.",
  },
  full: {
    title: "정원이 찼습니다",
    body: "이 링크로 등록할 수 있는 인원이 모두 찼습니다. 학과 담당자에게 문의해 주세요.",
  },
};
