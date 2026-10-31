import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import BrandHome from "@/components/sf/brand-home";
import PublicFooter from "@/components/sf/public-footer";
import LaunchNotify, { type NotifyQuery } from "@/components/inquiry/launch-notify";
import { currentUser } from "@/lib/session";
import { trackOffers } from "@/lib/track";
import { payOpen } from "@/lib/payments";
import { PARTNERS, isPartner, partnerVisible, recordBrand } from "@/lib/brand";
import { publicCommerceGate } from "@/lib/public-gate";
import { cookies } from "next/headers";
import { JOB_COOKIE } from "@/lib/partner-job";
import { RESEARCH_POLICY_FROM, researchOpen } from "@/lib/assistant/research-docs";
import { Icon } from "@/components/sf/icon";
import { LANDING } from "@/lib/partner-landing";
import "./landing.css";
import { CONSULT_POLICY_FROM, consultOpen } from "@/lib/careerpeak-consult";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  const p = isPartner(brand) ? PARTNERS[brand] : null;
  return { title: p ? `${p.name} ${p.label} · CareerMatri` : "CareerMatri" };
}

/**
 * 제휴 소개 쪽(`/partner/careerpeak` · `/partner/jobindustry`). 제휴 사이트 단추가
 * `/from/…` 을 거쳐 여기로 온다.
 *
 * **2026-10-31 대표 승인 시안을 따른다**: 첫 화면(제목 · 예시 카드) → 세 단계 → 하는 일
 * 카드 묶음 → 하지 않는 일 → 값 카드 셋 → 마지막 띠. 글은 `partner-landing.ts`, 모양은
 * `landing.css`(www 와 같은 값)에 있다. 값은 가격표와 같은 자리(`trackOffers`)에서 읽는다.
 *
 * 한국어만 낸다. 두 곳 다 국내 이공계 석·박사 회원을 받는 곳이다.
 */
export default async function PartnerPage({
  params, searchParams,
}: {
  params: Promise<{ brand: string }>;
  searchParams: Promise<NotifyQuery>;
}) {
  const [{ brand }, sp] = await Promise.all([params, searchParams]);
  if (!isPartner(brand)) notFound();
  const P = PARTNERS[brand];
  /* 내려 둔 동안에는 운영자만 본다. 그 밖의 사람은 제휴 사이트 첫 화면으로 돌아간다 */
  if (!(await partnerVisible())) redirect(P.home);
  const user = await currentUser().catch(() => null);
  if (user) await recordBrand(user.id, brand);
  /* **가격표와 같은 문을 지난다.** 전자상거래법 제10조 표시가 비어 있는 동안
     운영에서는 값과 사는 단추를 내놓지 않는다(`public-gate.ts`). 무료 검사로
     가는 길은 그대로 열어 둔다 */
  const gate = await publicCommerceGate().catch(() => ({ open: false }));
  const tracks = gate.open ? await trackOffers("KR").catch(() => []) : [];
  const back = `/partner/${brand}`;
  const L = LANDING[brand];
  /* 잡인더스트리 공고 화면에서 넘어왔으면 그 공고를 로그인 뒤에 바로 비교한다.
     **커리어피크 쪽에서는 보지 않는다**(`takesJob`) */
  const hasJob = P.takesJob && Boolean((await cookies()).get(JOB_COOKIE)?.value);
  const open = hasJob ? { href: "/me/track/import", label: "보던 공고와 비교하기" } : (P.open ?? { href: "/me/track", label: "시작하기" });
  const next = encodeURIComponent(open.href);
  const start = user ? open : { href: P.start?.href ?? "/signup?next=%2Fcores", label: L.cta };

  const won = (n: number) => n.toLocaleString("ko-KR");
  const t30 = tracks.find((t) => t.days === 30);
  const t90 = tracks.find((t) => t.days === 90);
  const day = (d: Date) => d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });
  /* 아직 열리지 않은 것은 열렸다고 적지 않는다. 날짜가 지나면 이 말이 저절로 빠진다 */
  const notYet = brand === "careerpeak" && (!researchOpen() || !consultOpen())
    ? `자료 읽기${!consultOpen() ? "와 커리어피크 상담 신청은" : "는"} ${day(!researchOpen() ? RESEARCH_POLICY_FROM : CONSULT_POLICY_FROM ?? RESEARCH_POLICY_FROM)}부터 열립니다.`
    : null;
  const buy = (code: string, best: boolean, name: string) => payOpen("KR") ? (
    <Link href={user ? `/checkout?product=${encodeURIComponent(code)}` : `/signup?next=${encodeURIComponent("/me/track")}`}
      className={`pl-btn${best ? " is-pri" : ""}`}>{name} 시작</Link>
  ) : (
    <LaunchNotify product={code} lang="ko" source={`app:/partner/${brand}`} brand={brand} q={sp} compact back={`${back}#price`} />
  );
  const Check = () => <Icon name="check" size={16} />;

  return (
    <div className="pl">
      <header className="pl-top">
        <div className="pl-wrap">
          <BrandHome />
          <span className="pl-logo-tag">{L.tag}</span>
          <span className="pl-sp" />
          {/* 같은 탭으로 돌아간다. 새 탭으로 열면 뒤로 가기가 끊긴다 */}
          <a href={P.home} className="pl-btn pl-hide-m">{P.name}로 돌아가기</a>
          {user ? null : <Link href={`/login?next=${next}`} className="pl-btn pl-hide-m">로그인</Link>}
          <Link href={start.href} className="pl-btn is-pri">{start.label}</Link>
        </div>
      </header>

      <div className="pl-hero">
        <div className="pl-wrap">
          <div>
            <span className="pl-chip"><span className="pl-dot" />{L.chip}</span>
            <h1>{L.h1[0]}<br /><em>{L.h1[1]}</em></h1>
            <p className="pl-lead">{L.lead}</p>
            {hasJob ? <p className="pl-job-note">보시던 공고를 기억해 두었습니다. 로그인하면 바로 비교해 드립니다.</p> : null}
            <div className="pl-cta">
              <Link href={start.href} className="pl-btn is-pri is-lg">{start.label} <Icon name="chev" size={16} /></Link>
              <a href="#how" className="pl-btn is-lg">어떻게 쓰는지 보기</a>
            </div>
            <div className="pl-facts">
              {L.facts.map((f) => <span key={f}><Check />{f}</span>)}
              {notYet ? <span><Icon name="clock" size={16} />{notYet}</span> : null}
            </div>
          </div>

          <div className="pl-stage" aria-label="예시 화면">
            <div className="pl-card pl-sum">
              <div className="pl-sum-hd">{L.preview.kind === "summary" ? "한 장 경력 요약" : "공고 요구 항목 비교"}<span className="pl-tag">예시</span></div>
              <h3>{L.preview.title[0]}<br />{L.preview.title[1]}</h3>
              {L.preview.kind === "summary" ? (<>
                <div className="pl-files">{L.preview.files.map(([k, n]) => <span key={n}><b>{k}</b>{n}</span>)}</div>
                <div className="pl-grid2">
                  <div><p>{L.preview.left[0]}</p><ul>{L.preview.left[1].map((x) => <li key={x}>{x}</li>)}</ul></div>
                  <div><p>{L.preview.right[0]}</p><ul>{L.preview.right[1].map((x) => <li key={x}>{x}</li>)}</ul></div>
                </div>
              </>) : (
                <div className="pl-rows">
                  {L.preview.rows.map((r) => (
                    <div className="pl-row" key={r.text}>
                      <span>{r.text}</span>
                      <span className={`pl-badge is-${r.state}`}>{BADGE[r.state]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pl-card pl-float"><i><Icon name="spark" size={16} /></i><div>{L.float[0]}<small>{L.float[1]}</small></div></div>
            <div className="pl-card pl-jobs">
              <div className="pl-jh">{L.jobsTitle}<span className="pl-tag">예시</span></div>
              {L.jobs.map((j) => (
                <div className="pl-job" key={j.title}>
                  <div><small>{j.org}</small><strong>{j.title}</strong></div>
                  <span className={`pl-dd pl-num${j.hot ? " is-hot" : ""}`}>{j.dd}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="pl-sec" id="how">
        <div className="pl-wrap">
          <div className="pl-eyebrow">HOW IT WORKS</div>
          <h2>{L.howTitle}</h2>
          <div className="pl-steps">
            {L.steps.map(([h, p], i) => (
              <div className="pl-step" key={h}>
                <span className="pl-step-n">{i + 1}</span>
                <h4>{h}</h4>
                <p>{p}</p>
                {i < L.steps.length - 1 ? <span className="pl-arr" aria-hidden="true"><Icon name="chev" size={14} /></span> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pl-sec is-tight">
        <div className="pl-wrap">
          <div className="pl-eyebrow">WHAT IT DOES</div>
          <h2>{L.whatTitle}</h2>
          <p className="pl-sub">{L.whatSub}</p>
          <div className="pl-bento">
            {L.bento.map((b, i) => (
              <div key={b.h} className={`pl-b${i === 0 ? " is-lead" : i === L.bento.length - 1 ? " is-soft" : ""}`}>
                <div className="pl-ic"><Icon name={b.icon} size={20} /></div>
                <h4>{b.h}</h4>
                <p>{b.p}</p>
                {b.chips ? <div className="pl-mini">{b.chips.map((c) => <span key={c}>{c}</span>)}</div> : null}
                {b.bar ? <div className="pl-bar" aria-hidden="true">{[0, 1, 2, 3].map((k) => <span key={k} className={k < b.bar! ? "is-on" : ""} />)}</div> : null}
                {b.alert ? <div className="pl-alert"><Icon name="clock" size={15} />{b.alert[0]} · <b>{b.alert[1]}</b><span className="pl-tag">예시</span></div> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pl-sec is-soft">
        <div className="pl-wrap">
          <div className="pl-eyebrow">OUR LINE</div>
          <h2>이런 일은 하지 않습니다</h2>
          <div className="pl-nots">
            {L.nots.map(([h, p]) => (
              <div className="pl-not" key={h}><strong><i aria-hidden="true">✕</i>{h}</strong><p>{p}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="pl-sec" id="price">
        <div className="pl-wrap">
          <div className="pl-eyebrow">PRICING</div>
          <h2>2번 써 보고 정하세요</h2>
          <p className="pl-sub">공고 확인, 경험 채우기, 파일 읽기, 내 자료 읽기 가운데 아무 도구나 합쳐서 2번까지 무료입니다.</p>
          <div className="pl-price">
            <div className="pl-pc">
              <span className="pl-pc-nm">무료</span>
              <div className="pl-pc-pv pl-num">0<small>원</small></div>
              <p className="pl-pc-ds">가입하면 바로 씁니다.</p>
              <ul>{L.free.map((x) => <li key={x}><Check />{x}</li>)}</ul>
              <Link href={start.href} className="pl-btn">무료로 시작</Link>
            </div>
            {/* 값은 가격표와 같은 문(`public-gate`)을 지난다. 닫혀 있으면 값 대신 준비 중이라고 적는다 */}
            <div className="pl-pc">
              <span className="pl-pc-nm">30일권</span>
              <div className="pl-pc-pv pl-num">{t30 ? <>{won(t30.amount)}<small>원</small></> : <small>준비 중</small>}</div>
              <p className="pl-pc-ds">한 달만 써 보고 정해도 됩니다.</p>
              <ul>{L.paid30.map((x) => <li key={x}><Check />{x}</li>)}</ul>
              {t30 ? buy(t30.code, false, "30일권") : null}
            </div>
            <div className="pl-pc is-best">
              <span className="pl-pc-badge">지원 시즌 추천</span>
              <span className="pl-pc-nm">90일권</span>
              <div className="pl-pc-pv pl-num">{t90 ? <>{won(t90.amount)}<small>원</small></> : <small>준비 중</small>}</div>
              <p className="pl-pc-ds">한 학기 지원 시즌을 이어서 준비할 때.</p>
              <ul>
                {L.paid90.map((x) => <li key={x}><Check />{x}</li>)}
                {t90 ? <li><Check />한 달 {won(Math.round(t90.amount / 3 / 100) * 100)}원꼴</li> : null}
              </ul>
              {t90 ? buy(t90.code, true, "90일권") : null}
            </div>
          </div>
          <p className="pl-note">
            기간권은 자동으로 갱신되지 않습니다. 남은 기간이 있을 때 다시 사면 끝나는 날 뒤에 이어 붙습니다.
            {notYet ? ` ${notYet}` : ""}
          </p>
        </div>
      </section>

      <div className="pl-final">
        <div className="pl-wrap">
          <div className="pl-fbox">
            <div style={{ flex: 1 }}><h2>{L.final[0]}</h2><p>{L.final[1]}</p></div>
            <Link href={start.href} className="pl-btn is-lg">{start.label} <Icon name="chev" size={16} /></Link>
          </div>
        </div>
      </div>
      <PublicFooter lang="ko" />
    </div>
  );
}

const BADGE = { ready: "설명할 경험 있음", partial: "정리가 덜 됨", empty: "아직 없음", cond: "자격 조건" } as const;
