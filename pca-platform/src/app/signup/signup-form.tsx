"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction, type SignupState } from "./actions";

const initial: SignupState = {};

export default function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initial);
  const err = state.errors ?? {};
  const v = state.values;

  if (state.done) {
    return (
      <>
        <h1>확인 메일을 보냈습니다</h1>
        <p className="sub">
          {state.done} 으로 보낸 링크를 열면 가입이 끝납니다. 메일이 오지 않으면 스팸함을
          확인해 주세요.
        </p>
        <Link className="act solid full" href="/login">
          로그인으로
        </Link>
      </>
    );
  }

  return (
    <>
      <h1>회원가입</h1>
      <p className="sub">현직자 멘토링을 신청하려면 계정이 필요합니다.</p>

      <form action={action} className="form">
        <div className="field">
          <label htmlFor="email">이메일</label>
          <input id="email" name="email" type="email" autoComplete="email" required
                 defaultValue={v?.email ?? ""}
                 aria-invalid={err.email ? true : undefined} />
          {err.email ? <span className="help" style={{ color: "var(--gap)" }}>{err.email}</span> : null}
        </div>

        <div className="field">
          <label htmlFor="name">이름</label>
          <input id="name" name="name" type="text" autoComplete="name" maxLength={50} required
                 defaultValue={v?.name ?? ""}
                 aria-invalid={err.name ? true : undefined} />
          <span className="help" style={err.name ? { color: "var(--gap)" } : undefined}>
            {err.name ?? "멘토에게는 성만 보이고 나머지는 가려집니다."}
          </span>
        </div>

        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required
                 aria-invalid={err.password ? true : undefined} />
          <span className="help" style={err.password ? { color: "var(--gap)" } : undefined}>
            {err.password ?? (v ? "비밀번호는 다시 입력해 주세요. 10자 이상" : "10자 이상")}
          </span>
        </div>

        <div className="field">
          <label htmlFor="confirm">비밀번호 확인</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required
                 aria-invalid={err.confirm ? true : undefined} />
          {err.confirm ? <span className="help" style={{ color: "var(--gap)" }}>{err.confirm}</span> : null}
        </div>

        <label className="check" style={{ alignSelf: "flex-start" }}>
          <input type="checkbox" name="terms" defaultChecked={v?.terms ?? false} />
          <a href="/terms" target="_blank" rel="noreferrer">
            이용약관
          </a>
          과{" "}
          <a href="/privacy" target="_blank" rel="noreferrer">
            개인정보 수집·이용
          </a>
          에 동의합니다
        </label>
        {err.terms ? <span className="help" style={{ color: "var(--gap)" }}>{err.terms}</span> : null}

        {state.message ? <div className="notice error">{state.message}</div> : null}

        <button className="act solid full" type="submit" disabled={pending}>
          {pending ? "가입 중…" : "가입하기"}
        </button>
      </form>

      <div className="foot-links">
        <Link href="/login">이미 계정이 있습니다</Link>
      </div>
    </>
  );
}
