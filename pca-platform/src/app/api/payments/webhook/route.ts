import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { settlePayment } from "@/lib/orders";
import { paymentProvider } from "@/lib/payments";

/**
 * PG 웹훅.
 *
 * 리다이렉트만 믿으면 사용자가 결제 직후 창을 닫았을 때 결제가 유실된다.
 * 그래서 같은 확정 경로를 웹훅으로도 연다. 두 번 들어와도 좌석은 하나만 생긴다.
 *
 * 검증 전에 일단 기록한다 — 서명이 틀린 요청도 남긴다. 공격을 받고 있는지
 * 나중에 알아야 하기 때문이다.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });

  const provider = paymentProvider();
  const result = await provider.verifyWebhook(raw, headers);

  await query(
    `INSERT INTO payment_events (provider, event_id, kind, payload)
     VALUES ($1, $2, 'webhook', $3)
     ON CONFLICT (provider, event_id) DO NOTHING`,
    [
      provider.name,
      result.ok ? result.eventId : null,
      JSON.stringify({ headers, body: raw.slice(0, 20_000), verified: result.ok }),
    ],
  );

  if (!result.ok) {
    // 서명이 틀리면 200 을 주지 않는다. PG 가 재전송하도록 둔다
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }
  if (!result.providerPaymentId) {
    return NextResponse.json({ ok: true, note: "결제 이벤트가 아닙니다" });
  }

  const settled = await settlePayment(result.providerPaymentId);

  // 확정에 실패해도 200 을 준다. 아직 승인 전인 상태 변경 알림일 수 있고,
  // 그걸 4xx 로 돌려주면 PG 가 무한히 재전송한다.
  return NextResponse.json({ ok: settled.ok, reason: settled.ok ? undefined : settled.reason });
}
