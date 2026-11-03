import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { attachBilling, chargeFirst, subscriptionById } from "@/lib/subscriptions/engine";
import { verifyBillingKey } from "@/lib/subscriptions/kcp";

export const dynamic = "force-dynamic";

/**
 * KCP 카드 등록이 휴대폰에서 다른 쪽으로 넘어갔다가 돌아오는 자리(PortOne `redirectUrl`).
 * 주소의 빌링키를 **PortOne 에 다시 물어 확인한 뒤** 붙이고 첫 결제를 한다. 남의 정기결제 번호는 받지 않는다
 */
export default async function SubscribeDone({ searchParams }: { searchParams: Promise<{ sub?: string; billingKey?: string; code?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const sub = sp.sub && /^\d+$/.test(sp.sub) ? await subscriptionById(sp.sub) : null;
  if (!sub || sub.user_id !== user.id || sub.provider !== "kcp" || sub.status !== "pending" || !sp.billingKey || sp.code) {
    redirect("/mat/pass?sub=fail");
  }
  const v = await verifyBillingKey(sp.billingKey);
  if (!v.ok) redirect("/mat/pass?sub=fail");
  await attachBilling(sub.id, sp.billingKey);
  const r = await chargeFirst(sub.id);
  redirect(r.ok ? "/mat/pass?sub=ok" : "/mat/pass?sub=fail");
}
