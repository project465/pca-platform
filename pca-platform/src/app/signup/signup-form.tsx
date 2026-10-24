"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { t, type Lang } from "@/lib/locale";
import { signupAction, type SignupState } from "./actions";
import ConsentBlock, { type ConsentItem, type ConsentLabels } from "./consent-block";

export default function SignupForm({
  next, lang, consent, consentLabels,
}: {
  next: string;
  lang: Lang;
  consent: ConsentItem[];
  consentLabels: ConsentLabels;
}) {
  const [state, action, pending] = useActionState<SignupState, FormData>(signupAction, {});
  const err = state.errors ?? {};
  /**
   * **오류가 나도 적은 것을 지우지 않는다.** `<form action>` 으로 두면 React 가
   * 응답이 온 뒤 폼을 통째로 비운다. 비밀번호 한 칸이 짧았을 뿐인데 이름 ·
   * 이메일 · 동의 체크가 다 사라져 처음부터 다시 적어야 했다(영어판 2단계
   * 예행에서 걸렸다). 보내는 것을 손으로 해서 비우는 단계를 건너뛴다.
   */
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };

  return (
    <form className="form" onSubmit={submit}>
      <input type="hidden" name="next" value={next} />

      <div className="field">
        <label htmlFor="name">{t("suName", lang)}</label>
        <input id="name" name="name" required maxLength={60} autoComplete="name"
               aria-invalid={err.name ? true : undefined} />
        {err.name && <span className="err">{err.name}</span>}
      </div>

      <div className="field">
        <label htmlFor="email">{t("suEmail", lang)}</label>
        <input id="email" name="email" type="email" required autoComplete="email"
               aria-invalid={err.email ? true : undefined} />
        {err.email && <span className="err">{err.email}</span>}
        <span className="help">{t("suEmailHint", lang)}</span>
      </div>

      <div className="field">
        <label htmlFor="password">{t("suPassword", lang)}</label>
        <input id="password" name="password" type="password" required autoComplete="new-password"
               aria-invalid={err.password ? true : undefined} />
        {err.password && <span className="err">{err.password}</span>}
      </div>

      <ConsentBlock items={consent} labels={consentLabels} />

      {state.message && <p className="notice warn" role="alert">{state.message}</p>}

      <button type="submit" className="act solid full" disabled={pending}>
        {pending ? t("suWorking", lang) : t("suSubmit", lang)}
      </button>
    </form>
  );
}
