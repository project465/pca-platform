"use client";

import { useActionState } from "react";
import { openFreeAction, type FreeState } from "./actions";
import { t, type Lang } from "@/lib/locale";

export default function FreeForm({ lang }: { lang: Lang }) {
  const [state, action, pending] = useActionState<FreeState, FormData>(openFreeAction, {});
  return (
    <form action={action}>
      <button type="submit" className="act solid" disabled={pending}>
        {t("freeCta", lang)}
      </button>
      {state.error ? <p className="err">{t("freeFail", lang)}</p> : null}
    </form>
  );
}
