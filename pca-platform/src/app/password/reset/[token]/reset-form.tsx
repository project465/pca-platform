"use client";

import { useActionState } from "react";
import { resetAction, type ResetState } from "./actions";

const initial: ResetState = {};

export default function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetAction, initial);

  return (
    <form action={formAction} className="form">
      <input type="hidden" name="token" value={token} />

      {state.error ? (
        <p className="notice error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="next">새 비밀번호</label>
        <input id="next" name="next" type="password" autoComplete="new-password" required minLength={10} />
        <span className="help">10자 이상</span>
      </div>

      <div className="field">
        <label htmlFor="confirm">새 비밀번호 확인</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} />
      </div>

      <button className="act solid full" type="submit" disabled={pending}>
        {pending ? "설정 중…" : "비밀번호 설정"}
      </button>
    </form>
  );
}
