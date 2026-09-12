import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { BillingError, markFailed, markPaid, paymentOf } from "@/lib/billing";
import { approve, PayError } from "@/lib/pay";
import { queryOne } from "@/lib/db";

export const metadata = { title: "결제 확인 — 현멘" };
export const dynamic = "force-dynamic";

/**
 * 결제창이 성공으로 돌려보낸 자리. 여기서 서버가 승인을 마쳐야 결제가 끝난다.
 * 브라우저가 보내온 금액을 믿지 않고 우리가 저장해 둔 금액으로 승인한다.
 */
export default async function PaySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; paymentKey?: string; amount?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const orderId = sp.orderId ?? "";
  const paymentKey = sp.paymentKey ?? "";
  if (!orderId || !paymentKey) redirect("/mentoring/requests");

  const row = await queryOne<{ amount: number; status: string }>(
    `SELECT amount, status FROM payments WHERE order_id = $1 AND user_id = $2`,
    [orderId, user.id],
  );
  if (!row) redirect("/mentoring/requests");
  if (row.status === "paid") redirect("/mentoring/requests?paid=1");

  let message: string | null = null;
  try {
    const approved = await approve({ paymentKey, orderId, amount: row.amount });
    await markPaid({
      orderId,
      userId: user.id,
      providerKey: approved.providerKey,
      method: approved.method,
      receiptUrl: approved.receiptUrl,
    });
  } catch (e) {
    message =
      e instanceof PayError || e instanceof BillingError
        ? e.message
        : "결제를 마치지 못했습니다.";
    await markFailed(orderId, message);
  }

  if (!message) redirect("/mentoring/requests?paid=1");

  return (
    <div className="exam-wrap">
      <div className="panel">
        <h1>결제를 마치지 못했습니다</h1>
        <p>{message}</p>
        <p>
          카드에서 빠져나간 금액이 있다면 자동으로 취소됩니다. 신청은 결제 대기 상태로
          남아 있으니 다시 시도하거나 취소하세요.
        </p>
        <Link className="act solid" href="/mentoring/requests">
          내 신청으로
        </Link>
      </div>
    </div>
  );
}
