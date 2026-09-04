"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangeState } from "./actions";

const initial: ChangeState = {};

export default function ChangeForm({ forced }: { forced: boolean }) {
  const [state, formAction, pending] = useActionState(changePasswordAction, initial);

  return (
    <form action={formAction} className="form">
      {state.error ? (
        <p className="notice error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="current">
          {forced ? "발급받은 임시 비밀번호" : "지금 쓰는 비밀번호"}
        </label>
        <input
          id="current"
          name="current"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="next">새 비밀번호</label>
        <input
          id="next"
          name="next"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
        />
        <span className="help">10자 이상</span>
      </div>

      <div className="field">
        <label htmlFor="confirm">새 비밀번호 확인</label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
        />
      </div>

      <button className="act solid full" type="submit" disabled={pending}>
        {pending ? "변경 중…" : "비밀번호 변경"}
      </button>
    </form>
  );
}
