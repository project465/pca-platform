"use client";

import { useState } from "react";

/**
 * 할 일 하나를 담아 둔다.
 *
 * 파일럿이 재려는 것은 `읽고 끄덕였는가` 가 아니라 **하나라도 고르는가**
 * 다. 다섯 줄을 다 담으면 그것은 고른 것이 아니고, 하나도 안 담으면 그
 * 줄들이 할 만하게 적히지 않은 것이다. 담은 수가 그 답이다.
 *
 * 눌린 상태는 서버가 들고 있다. 이 단추는 파일럿 참가자에게만 선다.
 */
export default function SaveAction(
  { attemptId, actionId, saved }: { attemptId: string; actionId: string; saved: boolean },
) {
  const [on, setOn] = useState(saved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const next = !on;
    setOn(next);
    setBusy(true);
    try {
      const r = await fetch("/api/v3/pilot/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          attemptId, kind: next ? "action_save" : "action_unsave", refs: [actionId],
        }),
      });
      /* 본문을 읽지 않으면 그 줄이 열린 채로 남는다 */
      await r.body?.cancel();
    } catch {
      /* 못 적었다고 화면을 되돌리지 않는다. 읽는 일이 재는 일보다 앞선다 */
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className={`rs-save${on ? " on" : ""}`}
      aria-pressed={on} onClick={toggle}>
      {on ? "담음" : "담아두기"}
    </button>
  );
}
