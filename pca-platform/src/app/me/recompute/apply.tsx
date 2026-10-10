"use client";

import { useFormStatus } from "react-dom";

/**
 * 현재 상태에 더하는 단추(규격 §21).
 *
 * **누른 뒤의 상태를 적는다.** 다시 계산하는 일은 한두 박자가 걸리는데,
 * 그동안 단추가 그대로 서 있으면 누른 사람이 한 번 더 누른다. 상태 말은
 * 제품 전체가 같은 다섯 마디를 쓴다: `저장 중…` · `저장됨` ·
 * `경험을 저장했습니다.` · `현재 상태를 다시 확인하고 있습니다.` ·
 * `경험은 저장했지만 현재 상태를 갱신하지 못했습니다.`
 */
export default function ApplyButton({ retry }: { retry: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="cm-btn is-primary" type="submit" disabled={pending}>
      {pending
        ? "현재 상태를 다시 확인하고 있습니다…"
        : retry ? "다시 시도" : "현재 상태에 더하기"}
    </button>
  );
}
