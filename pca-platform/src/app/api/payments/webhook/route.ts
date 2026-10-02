import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { fetchPayment, providerName, verifyWebhook } from "@/lib/payments";
import { fulfillOrder, markPaid, SETUP_TTL_HOURS } from "@/lib/orders";
import { sendMail } from "@/lib/mail";
import { langOfSite, orderReadyMail } from "@/lib/mail-templates";

/**
 * 결제대행사가 "결제됐다" 고 알려 오는 곳. **밤에 도는 자리다.**
 *
 * 여기서 지키는 것이 셋이다.
 *
 * 1. **통지를 믿지 않는다.** 서명을 보고, 금액은 대행사에 되물어서 쓴다
 * 2. **두 번 와도 한 번만 준다.** payment_webhooks 의 UNIQUE 가 막는다.
 *    대행사는 같은 통지를 몇 번이고 다시 보낸다 — 그게 정상이다
 * 3. **되돌려 줄 코드를 가려 쓴다.** 다시 보내 봐야 소용없는 일에는
 *    200 을, 우리 쪽이 잠깐 삐끗한 것에는 500 을 준다. 반대로 하면
 *    대행사가 영영 재시도하거나, 영영 포기한다
 *
 * 이행까지 못 가도 결제 사실은 남는다(status='paid'). 아침에 사람이
 * 집어서 다시 돌리면 된다 — 돈만 받고 조용히 사라지는 경우가 없어야 한다.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  /* 서명은 글자 그대로의 본문에 걸린다. JSON 으로 풀었다 다시 만들면 깨진다 */
  const raw = await req.text();

  const v = verifyWebhook(raw, req.headers);
  if (!v.ok) {
    console.warn("[pay] 통지를 물리쳤습니다:", v.why);
    /* 서명이 안 맞는 것은 다시 보낸다고 맞아지지 않는다 */
    return NextResponse.json({ error: v.why }, { status: 400 });
  }

  const provider = providerName();

  /* 처음 보는 통지인가. 두 번째부터는 여기서 조용히 끝난다 */
  const fresh = await queryOne<{ id: string }>(
    `INSERT INTO payment_webhooks (provider, event_id, tx_id, payload)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (provider, event_id) DO NOTHING
     RETURNING id::text`,
    [provider, v.eventId, v.txId, raw],
  );
  if (!fresh) {
    console.info("[pay] 이미 처리한 통지", v.eventId);
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const note = async (text: string) => {
    await query(`UPDATE payment_webhooks SET handled_at = now(), note = $2 WHERE id = $1`, [
      fresh.id,
      text,
    ]);
  };

  /* 금액은 여기서만 나온다. 통지 본문의 숫자는 쓰지 않는다 */
  const facts = await fetchPayment(v.txId);
  if (!facts) {
    /* 대행사가 잠깐 안 될 수도 있다. 다시 보내 달라고 한다.
       통지 기록은 지워서 재시도가 막히지 않게 한다 */
    await query(`DELETE FROM payment_webhooks WHERE id = $1`, [fresh.id]);
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  if (facts.status !== "paid") {
    await note(`status=${facts.status}`);
    return NextResponse.json({ ok: true, ignored: facts.status });
  }
  if (!facts.orderNo) {
    await note("no_order_no");
    console.error("[pay] 주문번호가 없는 결제", v.txId);
    return NextResponse.json({ ok: true, ignored: "no_order_no" });
  }

  const paid = await markPaid({
    orderNo: facts.orderNo,
    provider,
    txId: v.txId,
    paidAmount: facts.amount,
    currency: facts.currency,
  });
  /* 같은 결제에 대해 통지가 여러 갈래로 올 수 있다. 이미 결제로 표시된
     것은 사고가 아니므로 그대로 발급 단계로 내려간다 */
  if (!paid.changed && paid.why === "already_fulfilled") {
    await note("already_fulfilled");
    return NextResponse.json({ ok: true, duplicate: true });
  }
  if (!paid.changed && paid.why !== "already_paid") {
    await note(`markPaid:${paid.why}`);
    console.error("[pay] 결제를 주문에 붙이지 못했습니다", facts.orderNo, paid.why);
    return NextResponse.json({ ok: true, ignored: paid.why });
  }

  /* 여기부터가 발급이다. 사람 손이 닿지 않는다 */
  const out = await fulfillOrder(facts.orderNo);
  if ("error" in out) {
    if (out.error === "already_fulfilled") {
      await note("already_fulfilled");
      return NextResponse.json({ ok: true, duplicate: true });
    }
    /* 결제는 살아 있고 발급만 못 했다. 상태를 남겨 아침에 집어낸다 */
    await query(`UPDATE orders SET fail_reason = $2 WHERE order_no = $1`, [
      facts.orderNo,
      out.error,
    ]);
    await note(`fulfill:${out.error}`);
    console.error("[pay] 발급 실패 — 사람이 봐야 합니다", facts.orderNo, out.error);
    return NextResponse.json({ error: "fulfill_failed" }, { status: 500 });
  }

  /* 메일이 실패해도 발급은 이미 끝났다. 200 을 준다 —
     대행사가 다시 보내 봐야 같은 자리에서 duplicate 로 끝날 뿐이다 */
  const base = process.env.AUTH_URL ?? "";
  const mail = await sendMail(
    orderReadyMail(langOfSite(out.site), {
      to: out.email,
      name: out.name,
      orderNo: out.orderNo,
      setupUrl: `${base}/password/reset/${out.setupToken}`,
      hours: SETUP_TTL_HOURS,
    }),
  );
  if (!mail.ok) {
    console.error("[pay] 안내 메일 실패", out.orderNo, mail.error);
    await query(`UPDATE orders SET fail_reason = $2 WHERE order_no = $1`, [
      out.orderNo,
      "mail_failed:" + mail.error,
    ]);
  }

  await note("fulfilled");
  console.info("[pay] 발급 완료", out.orderNo, out.email);
  return NextResponse.json({ ok: true });
}
