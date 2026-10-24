"use client";

import { useActionState } from "react";
import { resetAction, type ResetState } from "./actions";
import { entrySay, type EntryLang } from "@/lib/entry-say";

const initial: ResetState = {};

export default function ResetForm({ token, lang = "ko" }: { token: string; lang?: EntryLang }) {
  const [state, formAction, pending] = useActionState(resetAction, initial);
  const say = entrySay(lang);

  return (
    <form action={formAction} className="form">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="lang" value={lang} />

      {state.error ? (
        <p className="notice error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="next">{say("새 비밀번호")}</label>
        <input id="next" name="next" type="password" autoComplete="new-password" required minLength={10} />
        <span className="help">{say("10자 이상")}</span>
      </div>

      <div className="field">
        <label htmlFor="confirm">{say("새 비밀번호 확인")}</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} />
      </div>

      <button className="act solid full" type="submit" disabled={pending}>
        {pending ? say("설정 중…") : say("비밀번호 설정")}
      </button>
    </form>
  );
}
