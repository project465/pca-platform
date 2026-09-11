"use client";

import { useActionState } from "react";
import Link from "next/link";
import { t, UI, type Lang } from "@/lib/locale";
import { eraseMe, type EraseState } from "./actions";

export default function EraseForm({ lang }: { lang: Lang }) {
  const [state, action, pending] = useActionState<EraseState, FormData>(eraseMe, {});
  const word = UI.erConfirmWord[lang];

  return (
    <form className="eraseform" action={action}>
      <input type="hidden" name="lang" value={lang} />
      <label className="field">
        <span>{t("erConfirmLabel", lang, { word })}</span>
        <input name="confirm" required autoComplete="off" placeholder={word} />
      </label>
      {state.error && (
        <p className="notice warn" role="alert">
          {state.error}
        </p>
      )}
      <div className="row">
        <Link className="act" href="/my">
          {t("repBack", lang)}
        </Link>
        <button type="submit" className="act danger" disabled={pending}>
          {pending ? t("erWorking", lang) : t("erSubmit", lang)}
        </button>
      </div>
    </form>
  );
}
