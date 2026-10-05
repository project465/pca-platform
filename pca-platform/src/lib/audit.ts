/**
 * 감사 기록.
 *
 * **이름과 메일 주소를 담지 않는다.** 파기(익명화)가 끝난 뒤에도 남는 표라,
 * 여기에 개인정보를 적으면 파기가 반쪽이 된다. 누가 무엇을 했는지는
 * `actor_id` 와 `target_id` 로 충분하다.
 */
import { query } from "@/lib/db";

export const AUDITED = [
  "license.invite", "license.claim", "license.revoke",
  "contract.create", "contract.update",
  "org.admin.change",
  "report.individual.access",
  "refund.record",
  "product.update", "site.update", "country_pack.update",
  "business.update",
] as const;
export type AuditAction = (typeof AUDITED)[number];

const PII = /email|name|phone|주소|이름|메일|전화/i;

export async function audit(opts: {
  actorId: number | null;
  actorRole?: string | null;
  action: AuditAction;
  targetKind?: string | null;
  targetId?: string | number | null;
  orgId?: number | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const detail = opts.detail ?? {};
  /* 실수로 개인정보를 넘기면 그 칸만 떼고 적는다. 적지 않는 쪽이
     기록을 포기하는 것보다 낫다 */
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(detail)) {
    if (PII.test(k)) continue;
    if (typeof v === "string" && v.includes("@")) continue;
    clean[k] = v;
  }
  await query(
    `INSERT INTO audit_logs (actor_id, actor_role, action, target_kind, target_id, org_id, detail)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [opts.actorId, opts.actorRole ?? null, opts.action, opts.targetKind ?? null,
     opts.targetId != null ? String(opts.targetId) : null, opts.orgId ?? null, clean],
  );
}
