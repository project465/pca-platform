"use client";

import { useActionState } from "react";
import { resolveAction, type ResolveState } from "./actions";

const initial: ResolveState = {};

/**
 * 판정. 두 버튼이 같은 폼을 쓰고 어느 쪽을 눌렀는지만 다르다.
 * 메모는 선택이지만, 인정해서 돈이 움직이는 건에는 근거를 남기는 편이 낫다.
 */
export default function ResolveForm({
  reportId,
  against,
  amount,
}: {
  reportId: string;
  against: string;
  amount: number | null;
}) {
  const [state, action, pending] = useActionState(resolveAction, initial);
  if (state.ok) return <div className="notice ok">{state.ok}</div>;

  const money =
    against === "mentor"
      ? amount
        ? `인정하면 ${amount.toLocaleString("ko-KR")}원 전액 환불, 정산 없음`
        : "인정하면 전액 환불, 정산 없음"
      : "인정해도 멘토가 시간을 비웠으므로 정산은 그대로입니다";

  return (
    <form action={action} className="form" style={{ marginTop: 12 }}>
      <input type="hidden" name="reportId" value={reportId} />
      <input name="note" maxLength={600} placeholder="판정 메모 (선택)" />
      <div className="join">
        <button className="act solid" type="submit" name="decision" value="accept" disabled={pending}>
          {pending ? "처리 중…" : "인정"}
        </button>
        <button className="act" type="submit" name="decision" value="reject" disabled={pending}>
          기각
        </button>
        <span className="help">{money}</span>
      </div>
      {state.message ? <div className="notice error">{state.message}</div> : null}
    </form>
  );
}
