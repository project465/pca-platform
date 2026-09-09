"use client";

import { useActionState } from "react";
import { joinAction, type JoinState } from "./actions";

const initial: JoinState = {};

export default function JoinForm({
  token,
  askEmail,
  loginIdHint,
}: {
  token: string;
  /** 링크가 이메일 도메인을 걸었으면 이메일을 함께 받는다 */
  askEmail: boolean;
  /** "2021001234 처럼" 같은 안내. 조건이 없으면 null */
  loginIdHint: string | null;
}) {
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
        <span className="help">
          다음부터 이 학번으로 로그인합니다.
          {loginIdHint ? ` ${loginIdHint}` : ""}
        </span>
        {err.loginId ? <span className="help" style={{ color: "var(--gap)" }}>{err.loginId}</span> : null}
      </div>

      {askEmail ? (
        <div className="field full">
          <label htmlFor="email">학교 이메일</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
          <span className="help">결과가 공개되면 이 주소로 알려드립니다.</span>
          {err.email ? <span className="help" style={{ color: "var(--gap)" }}>{err.email}</span> : null}
        </div>
      ) : null}

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
