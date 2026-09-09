"use client";

import { useActionState } from "react";
import { joinAction, type JoinState } from "./actions";

const initial: JoinState = {};

export default function JoinForm({ token }: { token: string }) {
  const bound = joinAction.bind(null, token);
  const [state, formAction, pending] = useActionState(bound, initial);
  const err = state.errors ?? {};

  return (
    <form action={formAction} className="form" style={{ maxWidth: 420 }}>
      {state.message ? (
        <p className="notice err full" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="field full">
        <label htmlFor="displayName">이름</label>
        <input id="displayName" name="displayName" required autoComplete="name" />
        {err.displayName ? <span className="help" style={{ color: "var(--gap)" }}>{err.displayName}</span> : null}
      </div>

      <div className="field full">
        <label htmlFor="loginId">학번</label>
        <input id="loginId" name="loginId" required autoComplete="username" />
        <span className="help">다음부터 이 학번으로 로그인합니다.</span>
        {err.loginId ? <span className="help" style={{ color: "var(--gap)" }}>{err.loginId}</span> : null}
      </div>

      <div className="field full">
        <label htmlFor="password">비밀번호</label>
        <input id="password" name="password" type="password" required autoComplete="new-password" />
        <span className="help">10자 이상.</span>
        {err.password ? <span className="help" style={{ color: "var(--gap)" }}>{err.password}</span> : null}
      </div>

      <div className="field full">
        <label htmlFor="passwordConfirm">비밀번호 확인</label>
        <input id="passwordConfirm" name="passwordConfirm" type="password" required autoComplete="new-password" />
        {err.passwordConfirm ? <span className="help" style={{ color: "var(--gap)" }}>{err.passwordConfirm}</span> : null}
      </div>

      <div className="actions full">
        <button className="act solid" disabled={pending}>
          {pending ? "등록 중…" : "응시자로 등록"}
        </button>
      </div>
    </form>
  );
}
