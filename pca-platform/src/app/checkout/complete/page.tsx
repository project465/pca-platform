import Link from "next/link";
import { requireUser } from "@/lib/session";
import { settlePayment } from "@/lib/orders";
import { paymentProvider } from "@/lib/payments";

export const metadata = { title: "결제 결과 — METRI" };

/**
 * 결제창에서 돌아오는 자리.
 *
 * 쿼리에 온 값으로 "성공" 이라고 쓰지 않는다. 그 값은 사용자가 고칠 수 있다.
 * 서버가 PG 에 직접 물어본 결과로만 확정한다.
 */
export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; paymentId?: string; code?: string; message?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;

  // PortOne 은 paymentId 를, mock 은 order 를 돌려준다
  const key =
    sp.paymentId ??
    (sp.order ? (paymentProvider().name === "mock" ? `mock_${sp.order}` : sp.order) : null);

  if (sp.code) {
    return (
      <main className="main">
        <div className="empty">
          <b>결제가 완료되지 않았습니다</b>
          {sp.message ?? "결제창에서 취소되었습니다."}
          <Link className="btn" href="/checkout">
            다시 시도하기
          </Link>
        </div>
      </main>
    );
  }

  if (!key) {
    return (
      <main className="main">
        <div className="empty">
          <b>결제 정보를 찾을 수 없습니다</b>
          주문 화면에서 다시 시작해 주세요.
        </div>
      </main>
    );
  }

  const result = await settlePayment(key);

  return (
    <main className="main">
      <div className="paywrap">
        {result.ok ? (
          <>
            <h1>결제가 완료되었습니다</h1>
            <p className="paydone">
              주문번호 <b>{result.orderNo}</b>
              <br />
              응시권 1개가 발급되었습니다.
              {result.alreadyDone ? " (이미 처리된 결제입니다)" : null}
            </p>
            <Link className="btn solid lg" href="/my">
              검사 시작하기
            </Link>
          </>
        ) : (
          <>
            <h1>결제를 확인하지 못했습니다</h1>
            <p className="err">{result.reason}</p>
            <p className="paynote-p">
              이미 결제하셨다면 잠시 후 자동으로 처리됩니다. 계속 문제가 있으면 주문번호와 함께
              문의해 주세요.
            </p>
            <Link className="btn" href="/my">
              내 검사로
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
