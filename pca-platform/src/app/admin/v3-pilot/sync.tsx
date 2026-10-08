"use client";

import { useActionState } from "react";
import { runSync } from "./actions";

/** 여러 번 눌러도 같은 자리에 선다. 그래서 확인을 묻지 않는다 */
export default function SyncButton() {
  const [, action, pending] = useActionState(async () => {
    await runSync();
    return null;
  }, null);
  return (
    <form action={action} style={{ display: "inline" }}>
      <button type="submit" className="act" disabled={pending}>
        {pending ? "옮기는 중" : "지금 옮기기"}
      </button>
    </form>
  );
}
