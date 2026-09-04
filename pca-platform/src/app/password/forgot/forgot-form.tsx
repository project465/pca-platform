"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotAction, type ForgotState } from "./actions";

const initial: ForgotState = {};

export default function ForgotForm() {
  const [state, formAction, pending] = useActionState(forgotAction, initial);

  if (state.done) {
    return (
      <div className="form">
        <p className="notice ok">
          입력하신 계정이 등록돼 있다면 재설정 링크를 보냈습니다.
        </p>
        <p className="sub" style={{ marginBottom: 0 }}>
          메일이 없는 학생 계정은 학과 담당자가 직접 재설정 링크를 발급합니다.
          담당자에게 문의하세요.
        </p>

        {state.devLink ? (
          <div className="notice">
            <b>개발 모드</b> — 메일 발송이 아직 연결되지 않아 링크를 여기에 표시합니다.
            운영 환경에서는 표시되지 않습니다.
            <br />
            <Link className="mono" href={state.devLink}>
              {state.devLink}
            </Link>
          </div>
        ) : null}

        <Link className="act full" href="/login">
          로그인으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="form">
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
        />
      </div>

      <button className="act solid full" type="submit" disabled={pending}>
        {pending ? "처리 중…" : "재설정 링크 받기"}
      </button>
    </form>
  );
}
