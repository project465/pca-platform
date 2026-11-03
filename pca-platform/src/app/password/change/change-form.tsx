"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangeState } from "./actions";

const initial: ChangeState = {};

export default function ChangeForm({ forced, uid }: { forced: boolean; uid: string }) {
  const [state, formAction, pending] = useActionState(changePasswordAction, initial);

  return (
    <form action={formAction} className="form">
      {/* 이 화면이 보여 준 계정. 저장할 때 같은 계정인지 서버가 다시 본다(같은 브라우저에 담당자 · 다른 학생이 들어와 있을 때) */}
      <input type="hidden" name="uid" value={uid} />
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
          /* 첫 로그인에는 브라우저가 저장해 둔 다른 계정(같은 사이트의 담당자 등) 비밀번호를 채워 넣지 않게 한다 */
          autoComplete={forced ? "one-time-code" : "current-password"}
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
