"use client";

import { useActionState } from "react";
import { sejongLogin, type LoginState } from "./actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sejongLogin, {});
  return (
    <form action={action} className="sj-form">
      <div className="sj-field">
        <label htmlFor="identifier">아이디</label>
        <input id="identifier" name="identifier" type="text" autoComplete="username" required />
      </div>
      <div className="sj-field">
        <label htmlFor="password">비밀번호</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error ? <p className="sj-error" role="alert">{state.error}</p> : null}
      <button className="sj-btn" type="submit" disabled={pending}>{pending ? "확인 중…" : "로그인"}</button>
    </form>
  );
}
