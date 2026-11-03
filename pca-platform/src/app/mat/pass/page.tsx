import Link from "next/link";
import { requireUser } from "@/lib/session";
import { matTitle } from "@/lib/mat/title";
import { activeTrack, lastDayKst, trackOffers } from "@/lib/track";
import { payOpen } from "@/lib/payments";
import { campusSay, university } from "@/lib/campus/registry";
import { campusStudentContext } from "@/lib/campus/students";
import { withJosa } from "@/lib/me-v3/result/josa";
import { openDay } from "@/lib/mat/open-dates";
import { matLang } from "@/lib/mat/lang";
import { sayOf } from "@/lib/mat/copy";
import { PASS_PAGE_TEXT as T, TITLE_TEXT } from "../mat-text";
import { SchoolEnding } from "../paywall";
import { SubStatus } from "../sub-status";
import { subscriptionsOpen } from "@/lib/subscriptions/open";
import { moneyText } from "@/lib/mat/money-text";
import { PRICING_HREF } from "@/lib/pricing/config";

export const generateMetadata = () => matTitle(TITLE_TEXT.pass);

/**
 * 이용권(예상 화면 6번, 2026-11-01 대표 결정: 하나의 MAT, 두 가지 이용권).
 *
 * - **학교 칸이 먼저다.** 학교 좌석이 열려 있으면 결제 없이 쓴다는 것과 언제까지인지. 학교 코드를
 *   적는 칸은 두지 않는다(대표 결정 사-3: 코드만 알면 남이 좌석을 쓸 수 있다). 학교에서 받은
 *   계정으로 로그인하면 이어진다
 * - 개인 이용권은 30 · 90일, 90일이 기본. 값은 `products` 에서 읽는다(화면과 결제 값이 갈리지 않게)
 * - **결제가 열리기 전에는 사는 단추를 끈다**(`payOpen`). 누를 수 없는 결제 화면으로 보내지 않는다
 * - 들어 있는 것은 **지금 되는 것만 된다고 적는다.** 아직 만들고 있는 것은 `준비 중`
 */
export default async function MatPass({ searchParams }: { searchParams: Promise<{ sub?: string }> }) {
  const user = await requireUser();
  const lang = await matLang();
  const t = sayOf(lang);
  const en = lang === "en";
  const PASS_TEXT = moneyText(lang).PASS_TEXT;
  const subMsg = PASS_TEXT.msg[(await searchParams).sub ?? ""] ?? null;
  const [state, offers, campus] = await Promise.all([
    activeTrack(user.id),
    trackOffers("KR"),
    campusStudentContext(user.id).catch(() => null),
  ]);
  /* 기관(진흥원) 참여자에게는 `학교` 대신 `기관` 으로 적는다(기관 말 바꾸기) */
  const sayKo = campusSay(campus ? university(campus.row.university_code) : null);
  /* 기관 말 바꾸기는 한국어 문장에만 있다. 영어 화면은 영어 문구를 그대로 쓴다 */
  const say = (x: { ko: string; en?: string }) => (en ? t(x) : sayKo(x.ko));
  const open = payOpen("KR");
  const day = (s: string) => lastDayKst(s);
  const school = state.source?.kind === "school"
    ? (university(state.source.university)?.university_name ?? t(T.school))
    : null;
  const o30 = offers.find((o) => o.days === 30) ?? null;
  const o90 = offers.find((o) => o.days === 90) ?? null;
  const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

  return (
    <main>
      {/* 눈썹과 제목이 같은 말을 두 번 적지 않는다(MAT 시험 P2: '이용권 / 이용권') */}
      <div className="mt-top"><span className="mt-week">{t(T.kicker)}</span></div>
      <h1 className="mt-h1">{state.on ? t(T.current) : t(T.choose)}</h1>

      {state.on && state.until ? (
        <p className="mt-lead">
          {school ? t(T.fromSchool, { school }) : t(T.personal)}{t(T.until, { d: day(state.until) })}
          {state.queued ? t(T.queued) : ""}
        </p>
      ) : null}

      {subMsg ? <p className="mt-note" role="status">{subMsg}</p> : null}
      <SubStatus userId={user.id} lang={lang} />
      <SchoolEnding userId={user.id} lang={lang} />

      <section className={`mt-box is-school`}>
        <h3>{say(T.schoolQ)}</h3>
        {school && state.source?.kind === "school" ? (
          <p>{t(T.schoolOn, { school: en ? school : withJosa(school, "이가"), d: day(state.source.until) })}</p>
        ) : campus ? (
          <p>{t(T.campusAcc, { name: campus.university_name })}{say(T.schoolOpens)}</p>
        ) : (
          <ul>
            <li>{say(T.schoolFree)}</li>
            <li>{t(T.schoolLogin)}</li>
          </ul>
        )}
      </section>

      <h2 className="mt-h2">{t(T.personalTitle)}</h2>
      {subscriptionsOpen() ? <p className="mt-note"><Link href={PRICING_HREF}>{PASS_TEXT.subLink}</Link></p> : null}
      {o30 || o90 ? (
        <form action="/checkout" method="get">
          <fieldset className="mt-opts">
            <legend className="mt-meta" style={{ marginBottom: 8 }}>{t(T.noAuto)}</legend>
            {o30 ? (
              <label className="mt-opt">
                <input type="radio" name="product" value={o30.code} />
                <span><b>{t(T.d30)}</b>{t(T.d30For)}</span>
                <span className="mt-price">{won(o30.amount)}</span>
              </label>
            ) : null}
            {o90 ? (
              <label className="mt-opt">
                <input type="radio" name="product" value={o90.code} defaultChecked />
                <span><b>{t(T.d90)}</b>{t(T.d90For, { m: won(Math.round(o90.amount / 3 / 100) * 100) })}</span>
                <span className="mt-price">{won(o90.amount)}</span>
              </label>
            ) : null}
          </fieldset>
          <div style={{ marginTop: 12 }}>
            {open ? (
              <button type="submit" className="mt-btn is-main is-block">{t(T.pay)}</button>
            ) : (
              <button type="button" className="mt-btn is-block" disabled aria-disabled="true">{t(T.payNotReady)}</button>
            )}
          </div>
          {state.on && open ? (
            <p className="mt-note">{t(T.nextDay)}</p>
          ) : null}
          {/* 결제 단추 곁에 청약철회 · 환불 조건이 있는 자리를 둔다(전자상거래법 제13조 제2항, 2026-11-03 MAT 시험 M3) */}
          <p className="mt-note">
            {t(T.legalPre)}<Link href="/legal/refund">{t(T.refund)}</Link>{t(T.refundSub)}<Link href="/legal/subscription">{t(T.sub)}</Link>{t(T.and)}<Link href="/legal/terms">{t(T.terms)}</Link>{t(T.legalPost)}
          </p>
        </form>
      ) : (
        <p className="mt-empty">{t(T.none)}</p>
      )}

      <h2 className="mt-h2">{t(T.incl)}</h2>
      <ul className="mt-incl">
        <li>{t(T.i1)}<span>{t(T.i1s)}</span></li>
        {/* 지금 되는 것만 된다고 적는다(2026-11-03 MAT 시험 M1: 이 줄은 '준비 중', 지원서 화면은 '만들어 드려요') */}
        <li>{t(T.i2)}<span>{t(T.i2s)}</span></li>
        <li>{t(T.i3)}<span>{t(T.i3s, { date: openDay("tools", lang) })}</span></li>
        <li>{t(T.i4)}<span>{t(T.i4s)}</span></li>
        <li>{t(T.i5)}<span>{t(T.i5s)}</span></li>
        <li>{t(T.i6)}<span>{t(T.i6s, { date: openDay("consult", lang) })}</span></li>
      </ul>
    </main>
  );
}
