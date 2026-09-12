"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initial: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="form">
      {state.error ? (
        <p className="notice error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="identifier">학번 또는 이메일</label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      <div className="field">
        <label htmlFor="password">비밀번호</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      <button className="act solid full" type="submit" disabled={pending}>
        {pending ? "확인 중…" : "로그인"}
      </button>

      <p className="help" style={{ textAlign: "center" }}>
        현직자 멘토링을 처음 쓰시나요? <a href="/signup">회원가입</a>
      </p>
    </form>
  );
}
