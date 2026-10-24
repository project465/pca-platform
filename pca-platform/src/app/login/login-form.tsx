"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { loginAction, type LoginState } from "./actions";
import { entrySay, type EntryLang } from "@/lib/entry-say";

const initial: LoginState = {};

export default function LoginForm({ next = "", lang = "ko" }: { next?: string; lang?: EntryLang }) {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  const say = entrySay(lang);
  /* 틀린 비밀번호 한 번에 아이디 칸까지 비우지 않는다. `<form action>` 은
     응답 뒤에 폼을 통째로 비운다(가입 폼과 같은 까닭) */
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  };

  return (
    <form onSubmit={submit} className="form">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="lang" value={lang} />
      {state.error ? (
        <p className="notice error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="identifier">{say("학번 또는 이메일")}</label>
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
        <label htmlFor="password">{say("비밀번호")}</label>
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
        {pending ? say("확인 중…") : say("로그인")}
      </button>
    </form>
  );
}
