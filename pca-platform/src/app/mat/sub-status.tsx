import Link from "next/link";
import { money, subscriptionOf } from "@/lib/subscriptions/engine";
import { lastDayKst } from "@/lib/track";
import { moneyText, SUB_STATE } from "@/lib/mat/money-text";
import type { MatUiLang } from "@/lib/mat/copy";
import { PRICING_HREF } from "@/lib/pricing/config";
import { cancelSubAction, reconsentAction, resumeMockAction } from "./subscribe/actions";

/**
 * 정기결제 한 줄과 **해지 단추 하나**(/legal/subscription 4조: [내 정보 › 이용권] 버튼 하나).
 * MAT 이용권 화면(`/mat/pass`)과 내 정보(`/my`)가 같은 조각을 쓴다. 해지해도 이미 낸 기간은 그대로다.
 * 확인은 단추를 누르는 순간의 창 한 번(화면 문구 규칙 7)
 */
export async function SubStatus({ userId, back = "/mat/pass", className = "mt-box", lang = "ko" }: { userId: string; back?: string; className?: string; lang?: MatUiLang }) {
  const SUB_STATE = moneyText(lang).SUB_STATE;
  const s = await subscriptionOf(userId);
  if (!s || s.status === "pending") return null;
  const day = (iso: string | null) => (iso ? lastDayKst(iso) : "");
  const price = money(s.consented_price, s.currency);
  const line = s.status === "active" ? SUB_STATE.active(day(s.next_charge_at), price)
    : s.status === "canceled" ? SUB_STATE.canceled(day(s.current_period_end))
      : s.status === "past_due" ? SUB_STATE.pastDue
        : s.status === "paused" ? SUB_STATE.paused : "";
  return (
    <section className={className} aria-label={SUB_STATE.title} data-sub-status={s.status}>
      <h3>{SUB_STATE.title}</h3>
      <p>{line}</p>
      {s.pending_price && s.price_change_at && s.price_notice_at && (s.status === "active" || s.status === "past_due") ? (
        <form action={reconsentAction} style={{ marginTop: 8 }}>
          <input type="hidden" name="id" value={s.id} />
          <p className="mt-note">{SUB_STATE.reconsent(money(s.pending_price, s.currency), day(s.price_change_at))}</p>
          <button type="submit" className="mt-btn is-block">{SUB_STATE.reconsentGo}</button>
        </form>
      ) : null}
      {s.status === "paused" || s.status === "past_due" ? (
        s.provider === "mock" ? (
          <form action={resumeMockAction} style={{ marginTop: 8 }}>
            <input type="hidden" name="id" value={s.id} />
            <button type="submit" className="mt-btn is-main is-block">{SUB_STATE.resume}</button>
          </form>
        ) : <Link className="mt-btn is-main is-block" href={`/mat/subscribe?plan=${s.plan}&p=${s.period_days}`} style={{ marginTop: 8 }}>{SUB_STATE.resume}</Link>
      ) : null}
      {s.status === "active" || s.status === "past_due" || s.status === "paused" ? (
        <form action={cancelSubAction} style={{ marginTop: 8 }}>
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="back" value={back} />
          <button type="submit" className="mt-btn is-block" data-confirm={SUB_STATE.cancelConfirm}>{SUB_STATE.cancel}</button>
          <p className="mt-note">{SUB_STATE.cancelConfirm}</p>
        </form>
      ) : s.status === "canceled" ? <Link className="mt-link" href={PRICING_HREF}>{SUB_STATE.title}</Link> : null}
    </section>
  );
}

/**
 * [내 정보 › 이용권](`/my`) 칸 안의 정기결제 한 줄과 해지 단추. 작업공간 단추 모양(`cm-btn`)이다.
 * 정기결제가 없으면 아무것도 그리지 않는다(1회 결제 기간권은 위 줄이 이미 적는다)
 */
export async function SubStatusCm({ userId }: { userId: string }) {
  const s = await subscriptionOf(userId);
  if (!s || s.status === "pending") return null;
  const day = (iso: string | null) => (iso ? lastDayKst(iso) : "");
  const price = money(s.consented_price, s.currency);
  const line = s.status === "active" ? SUB_STATE.active(day(s.next_charge_at), price)
    : s.status === "canceled" ? SUB_STATE.canceled(day(s.current_period_end))
      : s.status === "past_due" ? SUB_STATE.pastDue : s.status === "paused" ? SUB_STATE.paused : "";
  return (
    <div data-sub-status={s.status}>
      <p>{SUB_STATE.title} · {line}</p>
      {s.status === "active" || s.status === "past_due" || s.status === "paused" ? (
        <form action={cancelSubAction} className="cm-acts">
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="back" value="/my" />
          <button type="submit" className="cm-btn">{SUB_STATE.cancel}</button>
        </form>
      ) : null}
    </div>
  );
}

/** 정기결제가 살아 있는가(내 정보 칸이 `자동 갱신 없음` 을 적을지 고른다) */
export async function hasLiveSub(userId: string): Promise<boolean> {
  const s = await subscriptionOf(userId);
  return Boolean(s && (s.status === "active" || s.status === "past_due"));
}
