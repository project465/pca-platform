"use client";

import { useEffect, useState } from "react";
import type { SiteContent } from "@/content";
import { checkoutUrl, orderUrl } from "@/lib/platform";

/**
 * 개인 진단을 그 자리에서 사는 단추.
 *
 * **이 단추는 사람이 켜지 않는다.** 플랫폼에 "지금 팔 수 있느냐" 고 묻고
 * 그렇다고 할 때만 나타난다. 문항이 없거나 채점 산식이 없거나 결제가
 * 연결되지 않았으면 대답이 아니오이고, 화면은 그대로 문의로 간다.
 *
 * 사람이 켜는 스위치를 두지 않은 이유는 단순하다 — 사람은 채점이 아직
 * 없다는 걸 잊고 켠다. 그리고 그날 밤에 판 것은 돌려줘야 한다.
 *
 * 금액은 보내지 않는다. 어느 판에서 누가 사는지만 보내고 값은 서버가
 * 매긴다. 정적 사이트의 원고는 누구나 고쳐 보낼 수 있기 때문이다.
 */
export function BuyButton({ site, className }: { site: SiteContent; className?: string }) {
  const [sellable, setSellable] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState("");

  /* 팔 수 있는지 물어본다. 대답이 없으면 없는 것으로 본다 —
     플랫폼이 안 뜬 상태에서 결제 단추를 보여 주면 안 된다 */
  useEffect(() => {
    let alive = true;
    fetch(`${orderUrl(site)}?site=${site.key}`, { signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { sellable?: boolean } | null) => {
        if (alive && d?.sellable === true) setSellable(true);
      })
      .catch(() => {
        /* 조용히 문의로 남는다. 화면에 오류를 띄울 일이 아니다 */
      });
    return () => {
      alive = false;
    };
  }, [site]);

  if (!sellable) return null;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setErr("");

    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(orderUrl(site), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site: site.key,
          product: "individual",
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          website: String(fd.get("website") ?? ""),
        }),
        signal: AbortSignal.timeout(10000),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; orderNo?: string }
        | null;

      /* 주문이 서지 않았으면 결제창으로 보내지 않는다. 빈손으로 넘기면
         결제창에서야 막히고, 그때는 이미 산 줄 아는 사람이 생긴다 */
      if (!res.ok || !data?.ok || !data.orderNo) {
        setErr(site.buy.error);
        setPending(false);
        return;
      }
      window.location.href = checkoutUrl(site, data.orderNo);
    } catch {
      setErr(site.buy.error);
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button className={className ?? "btn solid"} type="button" onClick={() => setOpen(true)}>
        {site.buy.cta}
      </button>
    );
  }

  return (
    <form className="buybox" onSubmit={submit}>
      <b>{site.buy.heading}</b>
      <label>
        <span>{site.contact.fields.name}</span>
        <input name="name" required maxLength={100} autoComplete="name" />
      </label>
      <label>
        <span>{site.contact.fields.email}</span>
        <input name="email" type="email" required maxLength={200} autoComplete="email" />
      </label>
      {/* 사람 눈에 보이지 않는 칸. 채워져 오면 사람이 아니다 */}
      <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <p className="note">{site.buy.note}</p>
      {err ? <p className="notice err">{err}</p> : null}
      <button className="btn solid full-w" type="submit" disabled={pending}>
        {pending ? site.contact.sending : site.buy.submit}
      </button>
    </form>
  );
}
