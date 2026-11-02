"use client";

import { useActionState } from "react";
import { issueKeyAction, type KeyState } from "./actions";

/** 키 만들기. 만든 키는 이 칸에 한 번만 보이고, 새로 고치면 사라진다 */
export function IssueKey({ partner }: { partner: string }) {
  const [state, run, pending] = useActionState<KeyState, FormData>(issueKeyAction, {});
  return (
    <form className="sf-filters" action={run}>
      <input type="hidden" name="partner" value={partner} />
      <label className="sf-field">
        <span>종류</span>
        <select name="env" defaultValue="test">
          <option value="test">시험 키</option>
          <option value="live">운영 키</option>
        </select>
      </label>
      <button type="submit" className="sf-btn" disabled={pending}>{pending ? "만드는 중…" : "키 만들기"}</button>
      {state.err ? <p className="sf-note is-bad" role="alert">{state.err}</p> : null}
      {state.key ? (
        <div className="sf-note is-ok" role="status" style={{ width: "100%" }}>
          <p style={{ margin: "0 0 6px" }}>{state.ok}</p>
          <code style={{ wordBreak: "break-all", userSelect: "all" }}>{state.key}</code>
        </div>
      ) : null}
    </form>
  );
}
