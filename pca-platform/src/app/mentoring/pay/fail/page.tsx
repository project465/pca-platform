import Link from "next/link";
import { requireUser } from "@/lib/session";
import { markFailed } from "@/lib/billing";

export const metadata = { title: "결제 실패 — 현멘" };
export const dynamic = "force-dynamic";

export default async function PayFailPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; message?: string; code?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const reason = sp.message ?? "결제가 취소되었거나 승인되지 않았습니다.";
  if (sp.orderId) await markFailed(sp.orderId, reason);

  return (
    <div className="exam-wrap">
      <div className="panel">
        <h1>결제가 끝나지 않았습니다</h1>
        <p>{reason}</p>
        <p>신청은 결제 대기 상태로 남아 있습니다. 내 신청에서 다시 결제하거나 취소하세요.</p>
        <Link className="act solid" href="/mentoring/requests">
          내 신청으로
        </Link>
      </div>
    </div>
  );
}
