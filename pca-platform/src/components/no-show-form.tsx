"use client";

import { useActionState } from "react";
import { reportNoShowAction, type NoShowActionState } from "@/app/mentoring/no-show-action";

const initial: NoShowActionState = {};

/**
 * 노쇼 신고. 접어둔 채로 두는 이유는 대부분의 세션에서 쓸 일이 없기 때문이다.
 * 취소 버튼 옆에 늘 펼쳐져 있으면 없던 분쟁을 부른다.
 */
export default function NoShowForm({
  requestId,
  who,
  until,
}: {
  requestId: string;
  /** 누가 안 나왔다고 신고하는지 */
  who: "멘토" | "신청자";
  /** 신고 기간이 끝나는 시각 */
  until: string | null;
}) {
  const [state, action, pending] = useActionState(reportNoShowAction, initial);
  if (state.ok) return <div className="notice ok">{state.ok}</div>;

  return (
    <details className="no-show">
      <summary>{who}가 나타나지 않았습니다</summary>
      <form action={action} className="form">
        <input type="hidden" name="requestId" value={requestId} />
        <textarea
          name="note"
          rows={3}
          maxLength={600}
          required
          placeholder={`언제까지 기다렸는지, 연락을 시도했는지 적어주세요. 판정 근거가 됩니다.`}
        />
        <div className="join">
          <button className="act" type="submit" disabled={pending}>
            {pending ? "접수 중…" : "노쇼 신고"}
          </button>
          {until ? <span className="help">{until}까지 신고할 수 있습니다</span> : null}
        </div>
        <span className="help">
          운영사가 양쪽 이야기를 확인한 뒤 판정합니다. 판정 전까지 정산은 멈춰 있습니다.
        </span>
        {state.message ? <div className="notice error">{state.message}</div> : null}
      </form>
    </details>
  );
}
