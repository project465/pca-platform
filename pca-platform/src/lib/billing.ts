import { query, queryOne } from "@/lib/db";
import type { PoolClient } from "pg";

/**
 * 정산.
 *
 * 두 가지 계약이 있다.
 *
 *   선불(prepaid)  응시권을 미리 산다. 지금까지의 방식이다.
 *   건당(per_use)  나간 건수만큼 나중에 청구한다. 대학 산학협력단, 지역
 *                  일자리·경제진흥원, 고용노동부 위탁사업이 이 방식을 쓴다.
 *                  예산을 미리 태우지 않아도 되고, 발주처는 실적으로 검수한다.
 *
 * 건당에서 '한 건' 은 **제출된 응시 하나**다. 시작만 하고 만 것은 세지
 * 않는다 — 제공되지 않은 것을 청구하면 검수에서 잘린다.
 *
 * 금액은 원 단위 정수로만 다룬다. 부동소수로 돈을 세면 청구서와 장부가
 * 언젠가 1원씩 어긋난다.
 */

export type Billing = "prepaid" | "per_use";

export type Contract = {
  id: string;
  orgId: string;
  title: string;
  billing: Billing;
  seatCount: number;
  unitPrice: number | null;
  currency: string;
  useCap: number | null;
  startsOn: string;
  endsOn: string;
};

type Row = {
  id: string; org_id: string; title: string; billing: string;
  seat_count: string; unit_price: string | null; currency: string;
  use_cap: string | null; starts_on: string; ends_on: string;
};

const toContract = (r: Row): Contract => ({
  id: r.id,
  orgId: r.org_id,
  title: r.title,
  billing: r.billing === "per_use" ? "per_use" : "prepaid",
  seatCount: Number(r.seat_count),
  unitPrice: r.unit_price === null ? null : Number(r.unit_price),
  currency: r.currency,
  useCap: r.use_cap === null ? null : Number(r.use_cap),
  startsOn: r.starts_on,
  endsOn: r.ends_on,
});

const SELECT = `SELECT id::text, org_id::text, title, billing,
                       seat_count::text, unit_price::text, currency, use_cap::text,
                       to_char(starts_on, 'YYYY-MM-DD') AS starts_on,
                       to_char(ends_on,   'YYYY-MM-DD') AS ends_on
                  FROM contracts`;

/** 이 기관의 살아 있는 계약. 여러 개면 최근 것을 쓴다 */
export async function activeContract(orgId: string): Promise<Contract | null> {
  const r = await queryOne<Row>(
    `${SELECT} WHERE org_id = $1 AND status = 'active' ORDER BY id DESC LIMIT 1`,
    [orgId],
  );
  return r ? toContract(r) : null;
}

/** 정산 기간 문자열. 달을 넘기는 순간이 곧 청구서가 갈리는 지점이다 */
export function periodOf(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 화면에 쓰는 금액 표기. 원 단위 정수를 그대로 찍는다 */
export function money(amount: number, currency = "KRW"): string {
  if (currency === "KRW") return `${amount.toLocaleString("ko-KR")}원`;
  return `${amount.toLocaleString("ko-KR")} ${currency}`;
}

export type UsageSummary = {
  billing: Billing;
  /** 지금까지 쌓인 청구 건수 (계약 전체) */
  total: number;
  /** 이번 달 건수 */
  thisMonth: number;
  /** 이번 달 금액 */
  thisMonthAmount: number;
  /** 계약 전체 금액 */
  totalAmount: number;
  /** 상한. NULL 이면 무제한 */
  cap: number | null;
  /** 상한까지 남은 건수. 무제한이면 null */
  left: number | null;
  currency: string;
  unitPrice: number | null;
};

/** 건당 계약이 지금 어디까지 왔는가. 담당자 화면과 정산 화면이 함께 쓴다 */
export async function usageOf(contract: Contract): Promise<UsageSummary> {
  const period = periodOf();
  const r = await queryOne<{
    total: string; total_amount: string; month: string; month_amount: string;
  }>(
    `SELECT count(*)::text AS total,
            COALESCE(sum(unit_price), 0)::text AS total_amount,
            count(*) FILTER (WHERE period = $2)::text AS month,
            COALESCE(sum(unit_price) FILTER (WHERE period = $2), 0)::text AS month_amount
       FROM billing_events WHERE contract_id = $1`,
    [contract.id, period],
  );
  const total = Number(r?.total ?? 0);
  return {
    billing: contract.billing,
    total,
    totalAmount: Number(r?.total_amount ?? 0),
    thisMonth: Number(r?.month ?? 0),
    thisMonthAmount: Number(r?.month_amount ?? 0),
    cap: contract.useCap,
    left: contract.useCap === null ? null : Math.max(0, contract.useCap - total),
    currency: contract.currency,
    unitPrice: contract.unitPrice,
  };
}

/**
 * 건당 계약에서 새 응시를 시작해도 되는지.
 *
 * 트랜잭션 안에서 계약 행을 잠그고 센다. 잠그지 않으면 마지막 한 건을
 * 두 사람이 동시에 가져가 상한을 넘긴다 — 선불의 SKIP LOCKED 와 같은 이유다.
 * 상한이 없으면 언제나 통과한다.
 */
export async function reserveUse(c: PoolClient, contractId: string): Promise<boolean> {
  const ct = await c.query<{ use_cap: string | null }>(
    `SELECT use_cap::text FROM contracts
      WHERE id = $1 AND status = 'active' FOR UPDATE`,
    [contractId],
  );
  if (ct.rowCount === 0) return false;
  if (ct.rows[0].use_cap === null) return true;

  const used = await c.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM billing_events WHERE contract_id = $1`,
    [contractId],
  );
  return Number(used.rows[0].n) < Number(ct.rows[0].use_cap);
}

/**
 * 청구할 건 하나를 남긴다. 제출 트랜잭션 안에서 부른다.
 *
 * 같은 응시로 두 번 들어와도 한 줄만 남는다(UNIQUE + DO NOTHING). 두 번
 * 청구하는 것이 이 기능에서 가장 나쁜 오류라 데이터베이스에서 막는다.
 * 선불 계약이면 아무것도 하지 않는다.
 */
export async function recordUse(
  c: PoolClient,
  attemptId: string,
  userId: string,
): Promise<void> {
  await c.query(
    `INSERT INTO billing_events
       (contract_id, org_id, attempt_id, user_id, period, unit_price, currency)
     SELECT ct.id, ct.org_id, a.id, $2, to_char(now(), 'YYYY-MM'), ct.unit_price, ct.currency
       FROM attempts a
       JOIN test_sessions s ON s.id = a.session_id
       JOIN contracts ct    ON ct.id = s.contract_id
      WHERE a.id = $1
        AND ct.billing = 'per_use'
        AND ct.status = 'active'
        AND ct.unit_price IS NOT NULL
     ON CONFLICT (attempt_id) DO NOTHING`,
    [attemptId, userId],
  );
}

export type InvoiceLine = {
  orgId: string;
  contractId: string;
  contractTitle: string;
  period: string;
  count: number;
  amount: number;
  currency: string;
  invoiced: number;
};

/** 운영자 정산 화면. 기관·계약·달 별로 묶어 준다 */
export async function invoiceLines(): Promise<InvoiceLine[]> {
  const rows = await query<{
    org_id: string; contract_id: string; title: string; period: string;
    n: string; amount: string; currency: string; invoiced: string;
  }>(
    `SELECT b.org_id::text, b.contract_id::text, ct.title, b.period,
            count(*)::text AS n,
            sum(b.unit_price)::text AS amount,
            min(b.currency) AS currency,
            count(*) FILTER (WHERE b.invoiced_at IS NOT NULL)::text AS invoiced
       FROM billing_events b
       JOIN contracts ct ON ct.id = b.contract_id
      GROUP BY b.org_id, b.contract_id, ct.title, b.period
      ORDER BY b.period DESC, b.org_id`,
  );
  return rows.map((r) => ({
    orgId: r.org_id,
    contractId: r.contract_id,
    contractTitle: r.title,
    period: r.period,
    count: Number(r.n),
    amount: Number(r.amount),
    currency: r.currency,
    invoiced: Number(r.invoiced),
  }));
}
