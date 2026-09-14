"use client";

import Link from "next/link";
import { useActionState } from "react";
import { redeemAction, type RedeemState } from "./actions";
import { t, type Lang, type UiKey } from "@/lib/locale";

const REASON: Record<string, UiKey> = {
  unknown: "redeemUnknown",
  used: "redeemUsed",
  expired: "redeemExpired",
  voided: "redeemVoided",
  inactive: "redeemInactive",
};

export default function RedeemForm({ lang }: { lang: Lang }) {
  const [state, action, pending] = useActionState<RedeemState, FormData>(redeemAction, {});
  return (
    <form action={action} className="redeem">
      <label htmlFor="code">{t("redeemLabel", lang)}</label>
      <input
        id="code"
        name="code"
        required
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="XXXX-XXXX-XXXX"
        maxLength={40}
      />
      <button type="submit" className="act solid" disabled={pending}>
        {t("redeemCta", lang)}
      </button>

      {state.error ? (
        <p className="notice err" role="alert">
          {t(REASON[state.error] ?? "redeemUnknown", lang)}
          {state.reportId ? (
            <>
              {" "}
              <Link href={`/report/${state.reportId}`}>{t("repKicker", lang)}</Link>
            </>
          ) : null}
        </p>
      ) : null}
    </form>
  );
}
