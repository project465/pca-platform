/**
 * 지원 경로.
 *
 * **창업자가 DB 를 열어 보는 것으로 지원을 대신하지 않는다.** 그 방식은
 * 한 사람이 자는 동안 막히고, 그 사람이 늘 깨어 있어도 산 사람 쪽에서는
 * 자기 주문이 어떻게 됐는지 볼 길이 없다.
 *
 * 그래서 두 가지를 나눠 둔다.
 *
 *   본인이 직접 보는 것   주문 번호 · 결제 상태 · 막힌 것의 참조 번호
 *   사람이 받는 것        지원 메일 (주소는 **지어내지 않는다**)
 *
 * 주소를 지어내면 그 주소로 보낸 메일이 아무 데도 닿지 않고, 보낸 사람은
 * 답을 기다린다. 없으면 없다고 화면에 적는 쪽이 낫다.
 */
import { query } from "./db";
import { get } from "./settings";

export type SupportConfig = {
  email: string | null;
  /** 응대 시간 안내. 없으면 적지 않는다 */
  hours: string | null;
  ready: boolean;
  blocker: string | null;
};

/**
 * 지원 주소와 응대 시간.
 *
 * **읽는 자리를 `settings.get` 으로 옮겼다.** 전에는 환경변수만 봤는데,
 * `/admin/business` 는 그 두 값을 표에 적고 `/admin/launch` 의 `SUPPORT`
 * 줄은 고치러 가는 단추를 **그 화면으로** 보낸다. 그래서 시키는 대로
 * 넣어도 블로커가 안 풀리고, 상품 쪽은 계속 '지원 메일 주소가 아직
 * 설정되지 않았습니다' 를 적었다. **화면이 가리키는 자리와 값을 읽는
 * 자리가 다르면 둘 중 하나는 거짓말을 한다**(설계 원칙 10).
 *
 * 열쇠는 사업자 표시의 이메일 칸과 **같은 `email`** 이다. 지원 주소와
 * 전자상거래법 표시의 이메일을 따로 받으면, 손님이 본 주소와 우리가
 * 보는 주소가 갈린다.
 */
export async function supportConfig(): Promise<SupportConfig> {
  const email = await get("email", "SUPPORT_EMAIL");
  const hours = await get("support_hours", "SUPPORT_HOURS");
  if (!email) {
    return {
      email: null, hours, ready: false,
      blocker: "지원 메일 주소가 비어 있습니다. 주소를 지어내지 않았습니다. "
        + "`/admin/business` 에 넣거나 SUPPORT_EMAIL 로 주십시오.",
    };
  }
  return { email, hours, ready: true, blocker: null };
}

export type MyOrderRef = {
  orderNo: string;
  productCode: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  refundRequested: boolean;
};

export type MyFailureRef = {
  /** 응시 번호. 문의할 때 이 번호를 적는다 */
  attemptId: string | null;
  kind: string;
  /** 참조 번호. 운영자가 이 번호로 그 사건을 바로 찾는다 */
  traceId: string | null;
  at: string;
};

export type MyReferences = { orders: MyOrderRef[]; failures: MyFailureRef[] };

/**
 * 본인 것만 돌려준다.
 *
 * **남의 주문 번호를 주소로 바꿔 넣어도 보이지 않는다**: `user_id` 로
 * 걸러서 읽는다. 주문 번호는 추측하기 어렵게 생겼지만, 어렵다는 것은
 * 막는 것이 아니다.
 */
export async function myReferences(userId: string): Promise<MyReferences> {
  const orders = await query<{
    order_no: string; product_code: string; amount: number; currency: string;
    status: string; created_at: string; paid_at: string | null; req: number;
  }>(
    `SELECT o.order_no, o.product_code, o.amount, o.currency, o.status,
            o.created_at::text AS created_at, o.paid_at::text AS paid_at,
            (SELECT count(*)::int FROM refund_requests r
              WHERE r.order_id = o.id AND r.status IN ('requested','approved')) AS req
       FROM orders o
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
      LIMIT 20`,
    [userId],
  ).catch(() => []);

  /* 막힌 것은 **본인 응시에 달린 것만** 보여 준다. 운영 전체의 실패
     목록은 운영 화면 쪽 일이다 */
  const failures = await query<{
    attempt_id: string | null; kind: string; trace_id: string | null; at: string;
  }>(
    `SELECT f.attempt_id::text, f.kind, f.trace_id, f.created_at::text AS at
       FROM job_failures f
       JOIN attempts a ON a.id = f.attempt_id
      WHERE a.user_id = $1 AND f.resolved_at IS NULL
      ORDER BY f.created_at DESC
      LIMIT 10`,
    [userId],
  ).catch(() => []);

  return {
    orders: orders.map((o) => ({
      orderNo: o.order_no, productCode: o.product_code, amount: o.amount,
      currency: o.currency.trim(), status: o.status,
      createdAt: o.created_at.slice(0, 16), paidAt: o.paid_at?.slice(0, 16) ?? null,
      refundRequested: o.req > 0,
    })),
    failures: failures.map((f) => ({
      attemptId: f.attempt_id, kind: f.kind, traceId: f.trace_id,
      at: f.at.slice(0, 16),
    })),
  };
}
