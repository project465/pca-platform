import Link from "next/link";
import { notFound } from "next/navigation";
import { queryOne } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { payDryRun } from "@/lib/pay";
import PayLauncher from "../../[handle]/pay-launcher";

export const metadata = { title: "결제 — 현멘" };
export const dynamic = "force-dynamic";

export default async function ResumePayPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const orderId = sp.order ?? "";
  if (!orderId) notFound();

  const row = await queryOne<{
    order_id: string;
    amount: number;
    status: string;
    request_id: string;
    alias: string;
  }>(
    `SELECT p.order_id, p.amount, p.status, p.request_id, m.alias
       FROM payments p
       JOIN mentoring_requests r ON r.id = p.request_id
       JOIN mentors m ON m.id = r.mentor_id
      WHERE p.order_id = $1 AND p.user_id = $2`,
    [orderId, user.id],
  );
  if (!row) notFound();

  if (row.status !== "ready") {
    return (
      <div className="exam-wrap">
        <div className="panel">
          <h1>이미 처리된 결제입니다</h1>
          <p>내 신청에서 상태를 확인하세요.</p>
          <Link className="act solid" href="/mentoring/requests">
            내 신청으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-wrap">
      <div className="panel">
        <h1>결제 이어서 하기</h1>
        <PayLauncher
          pay={{
            orderId: row.order_id,
            amount: row.amount,
            requestId: row.request_id,
            title: `현직자 멘토링 · ${row.alias}`,
          }}
          clientKey={process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? null}
          dryRun={payDryRun()}
        />
      </div>
    </div>
  );
}
