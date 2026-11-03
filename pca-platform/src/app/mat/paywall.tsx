import Link from "next/link";
import { matAccess } from "@/lib/mat-access";
import { pickJobs } from "@/lib/mat/pick-jobs";
import { PAYWALL } from "@/lib/mat/money-text";
import { krwPrice, priceLabel, PRICING_HREF } from "@/lib/pricing/config";
import { subscriptionsOpen } from "@/lib/subscriptions/open";

/**
 * 결제 입구(시안 Paywall). 무료 분석 결과 바로 아래에 선다. 기간권(개인 · 학교 · 기관)이 있으면 그리지 않는다.
 *
 * - 남은 맞는 공고 수는 지금 목록(`pickJobs`)에서 이미 분석한 공고를 뺀 수다. 없으면 수를 적지 않는다
 * - 값은 설정(`pricing/config.ts`)에서 읽는다. 30일 값이 비어 있으면 값 없이 요금 화면으로만 보낸다
 * - `언제든 해지` 는 정기결제가 열려 있을 때만 적는다. 1회 결제 기간권에는 해지할 것이 없다
 */
export async function Paywall({ userId, analyzed = 0 }: { userId: string; analyzed?: number }) {
  const acc = await matAccess(userId);
  if (acc.paid) return null;
  const jobs = await pickJobs(userId, 60).catch(() => null);
  const total = jobs ? (jobs.main.length || jobs.broad.length) : 0;
  const rest = Math.max(0, total - analyzed);
  const price = priceLabel(krwPrice("basic", 30), "KRW");
  return (
    <section className="mt-pay" aria-label={PAYWALL.body}>
      <h3>{rest > 0 ? PAYWALL.more(rest) : PAYWALL.moreNone}</h3>
      <p>{PAYWALL.body}</p>
      <Link className="mt-btn is-main is-block" href={`${PRICING_HREF}?from=paywall`}>
        {rest > 0 ? PAYWALL.analyzeRest(rest) : price ? PAYWALL.start(price) : PAYWALL.moreNone}
      </Link>
      {rest > 0 && price ? <p className="mt-pay-sub">{PAYWALL.start(price)}</p> : null}
      {subscriptionsOpen() ? <p className="mt-pay-sub">{PAYWALL.cancelAny}</p> : null}
      <p className="mt-pay-foot">
        {acc.freeLeft > 0 ? null : acc.slots.aftertest === "locked" ? PAYWALL.usedFree : PAYWALL.usedAll}
        {acc.slots.aftertest === "locked" ? <> · <Link href="/cores">{PAYWALL.testForMore}</Link></> : null}
      </p>
    </section>
  );
}

/**
 * 학교 · 기관 이용권이 **30일 안에 끝나는 학생에게만** 개인 이용권을 알린다(2026-11-03 대표 결정).
 * 학생 본인의 MAT 화면에만 선다. 기관 화면 · 기관 집계에는 개인 결제 여부가 보이지 않는다(이 칸은 기관 쪽에서 부르지 않는다).
 * 뒤에 개인 이용권이 이어 붙어 있으면 세우지 않는다
 */
export async function SchoolEnding({ userId }: { userId: string }) {
  const { activeTrack, lastDayKst } = await import("@/lib/track");
  const st = await activeTrack(userId);
  if (!st.on || st.source?.kind !== "school") return null;
  const end = Date.parse(st.source.until);
  if (!Number.isFinite(end) || end - Date.now() > SCHOOL_NOTICE_DAYS * 86_400_000) return null;
  if (st.until && Date.parse(st.until) > end + 60_000) return null;
  return (
    <section className="mt-box" aria-label={PAYWALL.schoolEnds(lastDayKst(st.source.until))}>
      <h3>{PAYWALL.schoolEnds(lastDayKst(st.source.until))}</h3>
      <p>{PAYWALL.schoolEndsBody}</p>
      <Link className="mt-btn is-block" href={`${PRICING_HREF}?from=school`} style={{ marginTop: 10 }}>{PAYWALL.schoolEndsGo}</Link>
    </section>
  );
}

/** 학교 · 기관 이용권이 끝나기 며칠 전부터 알리는가 */
export const SCHOOL_NOTICE_DAYS = 30;
