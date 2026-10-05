/**
 * 상용 퍼널: 방문이 결제가 되는 비율.
 *
 * **표는 처음부터 있었고 적는 코드가 없었다.** `analytics_events` 가
 * schema_platform.sql 에 들어 있는데 한 줄도 쌓이지 않고 있었다. 그래서
 * 지금 "몇 명이 가격표를 보고 몇 명이 샀는가" 에 답할 수 없다. **파는
 * 쪽에서 그 비율을 모르면 고칠 자리를 고를 수 없다**: 가격표에서 떠나는
 * 것과 결제창에서 떠나는 것은 전혀 다른 문제인데, 세지 않으면 둘이 한
 * 덩어리로 보인다.
 *
 * **이름을 코드에 적어 둔다.** 아무 문자열이나 적을 수 있게 두면 화면마다
 * `purchase` · `purchased` · `buy` 가 생기고, 그러면 비율이 거짓이 된다.
 *
 * **자유입력을 담지 않는다.** `props` 가 받는 열쇠를 좁혀 뒀다. 경험
 * 본문이나 결과지 문장이 이 표에 들어가면, 거래 분석을 보는 사람이
 * 응시자의 서술을 읽게 된다(표 주석에 적힌 규칙이다).
 */
import { query, queryOne } from "./db";

/** 방문에서 PDF 까지. **순서가 곧 퍼널이다** */
export const FUNNEL_STEPS = [
  "landing",              // 상품 쪽을 열었다
  "pricing",              // 가격표를 봤다
  "checkout_start",       // 결제를 시작했다
  "purchase",             // 결제가 확정됐다
  "assessment_start",     // 응시를 시작했다
  "assessment_complete",  // 응시를 제출했다
  "evidence_complete",    // 경험을 적었다
  "result_viewed",        // 결과지를 열었다
  "pdf_downloaded",       // PDF 를 받았다
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

/**
 * 같이 적어도 되는 것. **사람을 좁히는 값과 자유입력은 없다.**
 *
 * 등급·시장·언어는 상품 쪽 성질이고, 이것들이 없으면 "어느 등급이 안
 * 팔리는가" 에 답할 수 없다.
 */
export type FunnelProps = {
  tier?: string;
  product?: string;
  market?: string;
  locale?: string;
  /** 결제 실패·결과 실패처럼 **분류된** 사유만. 메시지 본문이 아니다 */
  reason?: string;
};

const ALLOWED: (keyof FunnelProps)[] = ["tier", "product", "market", "locale", "reason"];

function clean(p: FunnelProps | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of ALLOWED) {
    const v = p?.[k];
    /* **길이를 자른다.** 자유입력이 실수로 흘러들어도 한 줄을 넘지 못한다 */
    if (typeof v === "string" && v) out[k] = v.slice(0, 60);
  }
  return out;
}

/**
 * 한 걸음을 적는다. **던지지 않는다.**
 *
 * 계측이 응시나 결제를 되돌리면 안 된다. 못 적었으면 그 한 줄이 없는
 * 것으로 끝난다(`outbox.enqueue` 와 같은 규칙).
 */
export async function track(
  step: FunnelStep,
  opts: {
    userId?: string | null;
    anonId?: string | null;
    siteId?: string | null;
    props?: FunnelProps;
  } = {},
): Promise<void> {
  try {
    await query(
      `INSERT INTO analytics_events (user_id, site_id, anon_id, name, props)
       VALUES ($1,$2,$3,$4,$5::jsonb)`,
      [
        opts.userId ?? null,
        opts.siteId ?? null,
        opts.anonId ?? null,
        step,
        JSON.stringify(clean(opts.props)),
      ],
    );
  } catch {
    /* 비워 둔다 */
  }
}

export type StepRow = {
  step: FunnelStep;
  /** 사람 수. 같은 사람이 세 번 눌러도 한 번이다 */
  people: number;
  /** 앞 걸음에서 여기까지 온 비율. 첫 걸음은 null */
  fromPrev: number | null;
  /** 첫 걸음에서 여기까지 온 비율 */
  fromTop: number | null;
};

export type FunnelReport = {
  days: number;
  steps: StepRow[];
  /** 규격이 요구한 비율들 */
  ratios: { label: string; value: number | null; note?: string }[];
  /** 아직 아무것도 쌓이지 않았는가 */
  empty: boolean;
};

/**
 * 몇 명이 어디까지 왔는가.
 *
 * **사람으로 센다, 사건으로 세지 않는다.** 가격표를 다섯 번 새로 고친
 * 사람이 다섯 명으로 세어지면 전환율이 바닥으로 보인다. 로그인한 사람은
 * `user_id`, 로그인 전은 `anon_id` 가 그 사람이다.
 */
export async function funnelReport(days = 30): Promise<FunnelReport> {
  const rows = await query<{ name: string; people: number }>(
    `SELECT name, count(DISTINCT coalesce(user_id::text, anon_id))::int AS people
       FROM analytics_events
      WHERE created_at > now() - ($1 || ' days')::interval
        AND name = ANY($2::text[])
      GROUP BY name`,
    [String(days), FUNNEL_STEPS as unknown as string[]],
  ).catch(() => []);

  const by = new Map(rows.map((r) => [r.name, r.people]));
  const top = by.get("landing") ?? 0;

  const steps: StepRow[] = FUNNEL_STEPS.map((step, i) => {
    const people = by.get(step) ?? 0;
    const prev = i === 0 ? null : (by.get(FUNNEL_STEPS[i - 1]) ?? 0);
    return {
      step,
      people,
      fromPrev: prev === null ? null : prev > 0 ? people / prev : null,
      fromTop: top > 0 ? people / top : null,
    };
  });

  const n = (s: FunnelStep) => by.get(s) ?? 0;
  const div = (a: number, b: number) => (b > 0 ? a / b : null);

  /* 환불율과 지원율은 사건 표에서 직접 센다. 퍼널 걸음이 아니다 */
  const refunds = await queryOne<{ paid: number; refunded: number }>(
    `SELECT count(*) FILTER (WHERE status IN ('paid','refunded'))::int AS paid,
            count(*) FILTER (WHERE status = 'refunded')::int           AS refunded
       FROM orders
      WHERE created_at > now() - ($1 || ' days')::interval`,
    [String(days)],
  ).catch(() => null);

  const asked = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM refund_requests
      WHERE requested_at > now() - ($1 || ' days')::interval`,
    [String(days)],
  ).catch(() => null);

  const ratios = [
    { label: "방문 → 구매", value: div(n("purchase"), n("landing")) },
    { label: "구매 → 응시 시작", value: div(n("assessment_start"), n("purchase")) },
    { label: "응시 시작 → 완료", value: div(n("assessment_complete"), n("assessment_start")) },
    { label: "완료 → 결과지", value: div(n("result_viewed"), n("assessment_complete")) },
    {
      label: "환불율",
      value: refunds ? div(refunds.refunded, refunds.paid) : null,
      note: "결제 확정된 주문 가운데",
    },
    {
      label: "환불 요청율",
      value: refunds ? div(asked?.n ?? 0, refunds.paid) : null,
      note: "거절한 요청까지 센다. 요청이 많으면 가격표가 설명을 못 한 것이다",
    },
  ];

  return { days, steps, ratios, empty: rows.length === 0 };
}

/** 사람이 읽는 걸음 이름 */
export const STEP_LABEL: Record<FunnelStep, { ko: string; en: string }> = {
  landing: { ko: "상품 쪽 방문", en: "Product page" },
  pricing: { ko: "가격표", en: "Pricing" },
  checkout_start: { ko: "결제 시작", en: "Checkout started" },
  purchase: { ko: "결제 확정", en: "Purchased" },
  assessment_start: { ko: "응시 시작", en: "Assessment started" },
  assessment_complete: { ko: "응시 완료", en: "Assessment completed" },
  evidence_complete: { ko: "경험 입력", en: "Evidence entered" },
  result_viewed: { ko: "결과지 열람", en: "Result viewed" },
  pdf_downloaded: { ko: "PDF 내려받기", en: "PDF downloaded" },
};
