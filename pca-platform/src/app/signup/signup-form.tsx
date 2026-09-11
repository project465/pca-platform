"use client";

import { useActionState } from "react";
import { t, type Lang } from "@/lib/locale";
import { signupAction, type SignupState } from "./actions";

export default function SignupForm({ next, lang }: { next: string; lang: Lang }) {
  const [state, action, pending] = useActionState<SignupState, FormData>(signupAction, {});
  const err = state.errors ?? {};

  return (
    <form className="form" action={action}>
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

      {state.message && <p className="notice warn" role="alert">{state.message}</p>}

      <button type="submit" className="act solid full" disabled={pending}>
        {pending ? t("suWorking", lang) : t("suSubmit", lang)}
      </button>
    </form>
  );
}
