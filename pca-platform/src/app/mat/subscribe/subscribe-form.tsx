"use client";

import { useActionState, useEffect, useState } from "react";
import { moneyText } from "@/lib/mat/money-text";
import type { MatUiLang } from "@/lib/mat/copy";
import { kcpBillingDone, subscribeAction, type SubscribeState } from "./actions";

declare global {
  interface Window {
    Paddle?: {
      Environment: { set(env: string): void };
      Initialize(opts: { token: string; eventCallback?: (e: { name?: string }) => void }): void;
      Checkout: { open(opts: { transactionId: string }): void };
    };
  }
}

const loadScript = (src: string) => new Promise<void>((ok, bad) => {
  if (document.querySelector(`script[src="${src}"]`)) return ok();
  const s = document.createElement("script");
  s.src = src; s.async = true; s.onload = () => ok(); s.onerror = () => bad(new Error(src));
  document.head.appendChild(s);
});

/**
 * 동의 칸 + 결제 단추. **동의 칸은 비어 있는 채로 연다.** 체크해야 단추가 켜진다(서버도 다시 본다).
 * KCP 면 PortOne 카드 등록 창을, Paddle 이면 Paddle 결제창(sandbox)을 연다
 */
export function SubscribeForm({ plan, period, lang = "ko" }: { plan: string; period: number; lang?: MatUiLang }) {
  const CHECKOUT_SUB = moneyText(lang).CHECKOUT_SUB;
  const [state, action, pending] = useActionState<SubscribeState, FormData>(subscribeAction, {});
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const k = state.kcp;
    if (!k) return;
    (async () => {
      try {
        await loadScript("https://cdn.portone.io/v2/browser-sdk.js");
        /* PortOne SDK 는 결제창(`checkout-form.tsx`)과 같은 전역이다. 카드 등록 함수만 따로 꺼낸다 */
        const sdk = window.PortOne as unknown as { requestIssueBillingKey?(req: Record<string, unknown>): Promise<{ code?: string; message?: string; billingKey?: string }> } | undefined;
        const r = await sdk?.requestIssueBillingKey?.({
          storeId: k.storeId, channelKey: k.channelKey, billingKeyMethod: k.billingKeyMethod,
          issueId: k.issueId, issueName: k.issueName, customer: k.customer, redirectUrl: k.redirectUrl,
        });
        if (!r || r.code || !r.billingKey) { setErr(r?.message ?? CHECKOUT_SUB.consentNeed); return; }
        const done = await kcpBillingDone(k.subscriptionId, r.billingKey);
        window.location.assign(done.ok ? "/mat/pass?sub=ok" : "/mat/pass?sub=fail");
      } catch {
        setErr(CHECKOUT_SUB.sdkFail);
      }
    })();
  }, [state.kcp]);

  useEffect(() => {
    const p = state.paddle;
    if (!p) return;
    (async () => {
      try {
        await loadScript("https://cdn.paddle.com/paddle/v2/paddle.js");
        window.Paddle?.Environment.set(p.environment);
        window.Paddle?.Initialize({ token: p.token, eventCallback: (e) => {
          if (e.name === "checkout.completed") window.location.assign("/mat/pass?sub=pending");
        } });
        window.Paddle?.Checkout.open({ transactionId: p.transactionId });
      } catch {
        setErr(CHECKOUT_SUB.sdkFail);
      }
    })();
  }, [state.paddle]);

  return (
    <form action={action}>
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="period" value={period} />
      <label className="mt-consent">
        <input type="checkbox" name="consent" value="1" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
        <span>{CHECKOUT_SUB.consent}</span>
      </label>
      {state.error || err ? <p className="mt-alert" role="alert">{state.error ?? err}</p> : null}
      <button type="submit" className="mt-btn is-main is-block" disabled={!agree || pending}>{CHECKOUT_SUB.pay}</button>
    </form>
  );
}
