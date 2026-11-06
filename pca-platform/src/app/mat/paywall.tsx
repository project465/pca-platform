import Link from "next/link";
import { matAccess } from "@/lib/mat-access";
import { pickJobs } from "@/lib/mat/pick-jobs";
import { moneyText } from "@/lib/mat/money-text";
import type { MatUiLang } from "@/lib/mat/copy";
import { headers } from "next/headers";
import { ipCountryFrom, routeForUser } from "@/lib/subscriptions/route";
import { krwPrice, priceLabel, PRICING_HREF, usdPrice } from "@/lib/pricing/config";
import { subscriptionsOpen } from "@/lib/subscriptions/open";

/**
 * 결제 입구(시안 Paywall). 무료 분석 결과 바로 아래에 선다. 기간권(개인 · 학교 · 기관)이 있으면 그리지 않는다.
 *
 * - 남은 맞는 공고 수는 지금 목록(`pickJobs`)에서 이미 분석한 공고를 뺀 수다. 없으면 수를 적지 않는다
 * - 값은 설정(`pricing/config.ts`)에서 읽는다. 30일 값이 비어 있으면 값 없이 요금 화면으로만 보낸다
 * - `언제든 해지` 는 정기결제가 열려 있을 때만 적는다. 1회 결제 기간권에는 해지할 것이 없다
 */
export async function Paywall({ userId, analyzed = 0, lang = "ko" }: { userId: string; analyzed?: number; lang?: MatUiLang }) {
  const PAYWALL = moneyText(lang).PAYWALL;
  const acc = await matAccess(userId);
  if (acc.paid) return null;
  const jobs = await pickJobs(userId, 60).catch(() => null);
  const total = jobs ? (jobs.main.length || jobs.broad.length) : 0;
  const rest = Math.max(0, total - analyzed);
  /* 값은 요금 화면과 같은 결제 길로 고른다(해외 카드면 달러) */
  const route = await routeForUser(userId, ipCountryFrom(await headers())).catch(() => null);
  const price = route?.currency === "USD"
    ? priceLabel(usdPrice("basic", 30, route.country), "USD")
    : priceLabel(krwPrice("basic", 30), "KRW");
  return (
    <>
    <CampusWait userId={userId} lang={lang} />
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
    </>
  );
}

/**
 * **학교가 발급한 계정인데 학교 MAT 이 아직 열리지 않은 학생**(2026-11-06). 결제 입구 · 요금 화면 위에 선다.
 *
 * 이 학생은 개인 무료(공고 분석 1회 + 검사 뒤 1회)로 MAT 을 쓰고, 다 쓰면 결제 입구를 받는다(`mat-access.ts`).
 * 학교 계약 학생은 결제 없이 전부 열리는 것이 약속이므로(확정된 결정 표), **결제보다 먼저 학교가 열어 준다는 것과
 * 누구에게 물을지**를 적는다. 개인 결제 길은 막지 않는다. 학교 MAT 이 열려 있으면 그리지 않는다
 */
export async function CampusWait({ userId, lang = "ko" }: { userId: string; lang?: MatUiLang }) {
  const PAYWALL = moneyText(lang).PAYWALL;
  const [{ activeTrack }, { campusStudentContext }, { campusSay, university }] = await Promise.all([
    import("@/lib/track"), import("@/lib/campus/students"), import("@/lib/campus/registry"),
  ]);
  const [st, campus] = await Promise.all([
    activeTrack(userId), campusStudentContext(userId).catch(() => null),
  ]);
  if (!campus || st.on) return null;
  /* 기관(진흥원) 참여자에게는 `학교` 대신 `기관` 으로 적는다. 영어 문장은 그대로 */
  const say = lang === "en" ? (s: string) => s : campusSay(university(campus.row.university_code));
  return (
    <section className="mt-box is-school" aria-label={PAYWALL.campusWait(campus.university_name)}>
      <h3>{PAYWALL.campusWait(campus.university_name)}</h3>
      <p>{say(PAYWALL.campusWaitBody)}</p>
    </section>
  );
}

/**
 * 학교 · 기관 이용권이 **30일 안에 끝나는 학생에게만** 개인 이용권을 알린다(2026-11-03 대표 결정).
 * 학생 본인의 MAT 화면에만 선다. 기관 화면 · 기관 집계에는 개인 결제 여부가 보이지 않는다(이 칸은 기관 쪽에서 부르지 않는다).
 * 뒤에 개인 이용권이 이어 붙어 있으면 세우지 않는다
 */
export async function SchoolEnding({ userId, lang = "ko" }: { userId: string; lang?: MatUiLang }) {
  const PAYWALL = moneyText(lang).PAYWALL;
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
