import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { matTitle } from "@/lib/mat/title";
import { CHECKOUT_SUB, PRICING } from "@/lib/mat/money-text";
import { isPlan, priceLabel, PRICING_HREF, type Period } from "@/lib/pricing/config";
import { subscriptionsOpen } from "@/lib/subscriptions/open";
import { ipCountryFrom, routeForUser } from "@/lib/subscriptions/route";
import { priceFor, providerFor } from "@/lib/subscriptions/engine";
import { lastDayKst } from "@/lib/track";
import { SubscribeForm } from "./subscribe-form";

export const generateMetadata = () => matTitle("정기결제");

/**
 * 정기결제 결제 화면(/legal/subscription 2조 3항: 다음 결제일 · 금액을 먼저 보이고 동의한 뒤 결제).
 * 동의 칸은 비어 있는 채로 연다. 체크하지 않으면 단추가 꺼져 있고, 서버도 한 번 더 본다
 */
export default async function MatSubscribe({ searchParams }: { searchParams: Promise<{ plan?: string; p?: string }> }) {
  const user = await requireUser();
  if (!subscriptionsOpen()) redirect(PRICING_HREF);
  const sp = await searchParams;
  const plan = isPlan(sp.plan) ? sp.plan : "basic";
  const period: Period = sp.p === "90" ? 90 : 30;
  const route = await routeForUser(user.id, ipCountryFrom(await headers()));
  const amount = priceFor(route, plan, period);
  if (amount == null) redirect(PRICING_HREF);
  const label = priceLabel(amount, route.currency)!;
  /* 다음 결제일 = 오늘부터 주기만큼(이미 쓰는 기간이 있으면 그 뒤에 이어 붙으므로 그 끝) */
  const next = lastDayKst(new Date(Date.now() + period * 86_400_000 + 1).toISOString());
  const provider = providerFor(route);
  return (
    <main>
      <p className="mt-week"><Link href={PRICING_HREF}>← {PRICING.title}</Link></p>
      <h1 className="mt-h1">{CHECKOUT_SUB.title}</h1>
      <dl className="mt-dl">
        <div><dt>{CHECKOUT_SUB.plan}</dt><dd>{plan === "basic" ? PRICING.basic : PRICING.research} · {period === 30 ? PRICING.t30 : PRICING.t90}</dd></div>
        <div><dt>{CHECKOUT_SUB.today}</dt><dd>{label}</dd></div>
        <div><dt>{CHECKOUT_SUB.next}</dt><dd>{CHECKOUT_SUB.nextLine(next, label)}</dd></div>
      </dl>
      <p className="mt-note">{PRICING.auto(period)} · {PRICING.keep}</p>
      <p className="mt-note">{CHECKOUT_SUB.cancelHow}</p>
      <p className="mt-note">{route.provider === "kcp" ? CHECKOUT_SUB.routeKr : CHECKOUT_SUB.routeGlobal}</p>
      {provider === "mock" ? <p className="mt-alert">{CHECKOUT_SUB.testMode}</p> : null}
      <SubscribeForm plan={plan} period={period} />
      <p className="mt-note">
        <Link href="/legal/subscription">{PRICING.legal}</Link> · <Link href="/legal/refund">{PRICING.refund}</Link>
      </p>
    </main>
  );
}
