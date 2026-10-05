/**
 * 사고를 한 자리에서 본다.
 *
 * **로그에만 두지 않는다**(규격 §26). 결제 확정이 깨지거나 이용권이 안
 * 나간 날, 그것이 로그 파일 안에만 있으면 돈 낸 사람이 먼저 알고 우리가
 * 나중에 안다.
 *
 * `job_failures` 한 표를 읽는다. **표를 더 만들지 않는 것이 일부러다**:
 * 사고를 보는 자리가 둘이 되면 운영자가 한 자리만 보고 다른 쪽을 놓친다.
 */
import { query, queryOne } from "./db";

export const KINDS = ["payment", "entitlement", "webhook", "result", "pdf", "mail"] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_LABEL: Record<Kind, string> = {
  payment: "결제 확정",
  entitlement: "이용권 발급",
  webhook: "웹훅",
  result: "결과지 생성",
  pdf: "PDF 생성",
  mail: "메일 발송",
};

export type IncidentRow = {
  id: string;
  kind: string;
  attemptId: string | null;
  traceId: string | null;
  message: string;
  at: string;
};

export type StuckAttempt = {
  attemptId: string;
  tier: string;
  startedAt: string;
  answered: number;
  total: number;
  days: number;
};

export type Incidents = {
  counts: { kind: string; label: string; n: number }[];
  recent: IncidentRow[];
  /** 멈춘 응시. 사고는 아니지만 사람이 한 번 봐야 하는 자리다 */
  stuck: StuckAttempt[];
  /** 결제가 확정됐는데 이용권이 없는 주문. **가장 비싼 사고다** */
  paidNoGrant: { orderNo: string; productCode: string; paidAt: string }[];
  /** 못 나간 메일 */
  mailStuck: number;
  total: number;
};

export async function incidents(limit = 40): Promise<Incidents> {
  const counts = await query<{ kind: string; n: number }>(
    `SELECT kind, count(*)::int AS n FROM job_failures
      WHERE resolved_at IS NULL GROUP BY kind`,
  ).catch(() => []);

  const recent = await query<{
    id: string; kind: string; attempt_id: string | null; trace_id: string | null;
    message: string; at: string;
  }>(
    `SELECT id::text, kind, attempt_id::text, trace_id, message,
            created_at::text AS at
       FROM job_failures
      WHERE resolved_at IS NULL
      ORDER BY created_at DESC
      LIMIT $1`,
    [limit],
  ).catch(() => []);

  /* 이틀 넘게 손대지 않은 응시. **하루로 잡으면 주말이 전부 걸린다** */
  const stuck = await query<{
    attempt_id: string; tier: string; started_at: string; answered: number; days: number;
  }>(
    `SELECT a.id::text AS attempt_id, a.tier, a.started_at::text,
            (SELECT count(*)::int FROM v2_responses r WHERE r.attempt_id = a.id) AS answered,
            floor(extract(epoch FROM now() - coalesce(a.last_saved_at, a.started_at))
                  / 86400)::int AS days
       FROM attempts a
      WHERE a.assessment_version = 'ME_V2'
        AND a.submitted_at IS NULL
        AND coalesce(a.last_saved_at, a.started_at) < now() - interval '2 days'
      ORDER BY a.started_at
      LIMIT 20`,
  ).catch(() => []);

  /**
   * 돈은 들어왔는데 문이 안 열린 주문.
   *
   * **이것이 가장 비싼 사고다.** 산 사람은 결제 문자를 받고 들어와서
   * 아무것도 못 한다. 웹훅이 한 번 빠지거나 확정 트랜잭션이 되돌아가면
   * 생기고, 그때 화면에는 아무 표시가 없다.
   */
  const paidNoGrant = await query<{
    order_no: string; product_code: string; paid_at: string;
  }>(
    `SELECT o.order_no, o.product_code, o.paid_at::text AS paid_at
       FROM orders o
       JOIN products p ON p.code = o.product_code
      WHERE o.status = 'paid'
        AND p.assessment_version = 'ME_V2'
        AND NOT EXISTS (SELECT 1 FROM entitlements e WHERE e.order_id = o.id)
      ORDER BY o.paid_at DESC
      LIMIT 20`,
  ).catch(() => []);

  const mail = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM outbox
      WHERE status <> 'sent' AND created_at < now() - interval '1 hour'`,
  ).catch(() => null);

  return {
    counts: counts.map((c) => ({
      kind: c.kind,
      label: KIND_LABEL[c.kind as Kind] ?? c.kind,
      n: c.n,
    })),
    recent: recent.map((r) => ({
      id: r.id, kind: r.kind, attemptId: r.attempt_id, traceId: r.trace_id,
      /* **개인 서술을 담지 않는다.** 메시지는 우리가 쓴 한 줄이고 응시자가
         적은 글이 아니다. 그래도 길이를 자른다 */
      message: r.message.slice(0, 200),
      at: r.at.slice(0, 16),
    })),
    stuck: stuck.map((s) => ({
      attemptId: s.attempt_id, tier: s.tier, startedAt: s.started_at.slice(0, 16),
      answered: s.answered, total: 0, days: s.days,
    })),
    paidNoGrant: paidNoGrant.map((o) => ({
      orderNo: o.order_no, productCode: o.product_code,
      paidAt: o.paid_at?.slice(0, 16) ?? "",
    })),
    mailStuck: mail?.n ?? 0,
    total: counts.reduce((a, c) => a + c.n, 0)
      + paidNoGrant.length + (mail?.n ?? 0),
  };
}

/** 사람이 보고 처리했다고 적는다. **지우지 않는다** */
export async function resolve(id: string, by: string): Promise<boolean> {
  const r = await query(
    `UPDATE job_failures SET resolved_at = now(), resolved_by = $2
      WHERE id = $1 AND resolved_at IS NULL`,
    [id, by],
  ).then(() => true).catch(() => false);
  return r;
}
