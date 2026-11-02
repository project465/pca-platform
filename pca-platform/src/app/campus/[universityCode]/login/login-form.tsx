"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/login/actions";

const initial: LoginState = {};

/**
 * 학교 전용 로그인 폼.
 *
 * **새 인증을 만들지 않는다.** 개인 로그인과 **같은 서버 액션**을 부른다
 * (`loginAction`): 시도 제한과 아이디·비밀번호 판정과 열쇠 비교가 한
 * 자리에 있어야 둘의 판단이 갈리지 않는다(설계 원칙 10). 갈리는 것은
 * 화면에 서는 글자와 들어간 뒤에 가는 자리뿐이다.
 */
export default function CampusLoginForm({ next, org, idLabel = "아이디", idHint }: {
  next: string;
  /** 학교 코드. 서버가 적은 학번 · 전화번호를 그 학교의 아이디 꼴로 바꾼다 */
  org?: string;
  idLabel?: string;
  idHint?: string;
}) {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="form">
      <input type="hidden" name="next" value={next} />
      {org ? <input type="hidden" name="org" value={org} /> : null}
      {state.error ? (
        <p className="notice error" role="alert">{state.error}</p>
      ) : null}

      <div className="field">
        <label htmlFor="identifier">{idLabel}</label>
        <input
          id="identifier" name="identifier" type="text" placeholder={idHint}
          inputMode={idLabel.includes("전화") ? "tel" : undefined}
          autoComplete="username" autoCapitalize="none" spellCheck={false}
          required aria-invalid={state.error ? true : undefined}
        />
      </div>

      <div className="field">
        <label htmlFor="password">비밀번호</label>
        <input
          id="password" name="password" type="password"
          autoComplete="current-password"
          required aria-invalid={state.error ? true : undefined}
        />
      </div>

      <button className="act solid full" type="submit" disabled={pending}>
        {pending ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
