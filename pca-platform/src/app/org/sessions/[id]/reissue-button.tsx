"use client";

import { useActionState } from "react";
import { reissue, type ReissueState } from "../../actions";

/**
 * 비밀번호 재발급.
 *
 * 임시 비밀번호를 저장하지 않으므로 "다시 보여주기" 는 없다. 새로 만들어
 * 건네는 것뿐이고, 그 순간 예전 비밀번호와 예전 재설정 링크는 죽는다.
 * 담당자가 그 사실을 모르고 누르면 곤란하므로 버튼 옆에 적어 둔다.
 */
export default function ReissueButton({
  sessionId,
  studentId,
  name,
}: {
  sessionId: string;
  studentId: string;
  name: string;
}) {
  const [state, action, pending] = useActionState<ReissueState, FormData>(reissue, {});

  if (state.issued) {
    return (
      <span className="reissued">
        <code>{state.issued.tempPassword}</code>
        <i>지금만 보입니다</i>
      </span>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="studentId" value={studentId} />
      <button
        type="submit"
        className="act tiny"
        disabled={pending}
        title={`${name} 님의 비밀번호를 새로 만듭니다. 예전 비밀번호는 즉시 쓸 수 없게 됩니다.`}
      >
        {pending ? "…" : "재발급"}
      </button>
      {state.error && <i className="reissue-err">{state.error}</i>}
    </form>
  );
}
