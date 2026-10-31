import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import BrandHome from "@/components/sf/brand-home";
import PublicFooter from "@/components/sf/public-footer";
import LaunchNotify, { type NotifyQuery } from "@/components/inquiry/launch-notify";
import { currentUser } from "@/lib/session";
import { money } from "@/lib/market";
import { trackOffers } from "@/lib/track";
import { payOpen } from "@/lib/payments";
import { txer } from "@/lib/surface-text";
import { PARTNERS, isPartner, partnerVisible, recordBrand } from "@/lib/brand";
import { publicCommerceGate } from "@/lib/public-gate";
import { cookies } from "next/headers";
import { JOB_COOKIE } from "@/lib/partner-job";
import { RESEARCH_POLICY_FROM, researchOpen } from "@/lib/assistant/research-docs";
import { CONSULT_POLICY_FROM, consultOpen } from "@/lib/careerpeak-consult";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  const p = isPartner(brand) ? PARTNERS[brand] : null;
  return { title: p ? `${p.name} ${p.label} · CareerMatri` : "CareerMatri" };
}

/**
 * 제휴 소개 쪽(`/partner/jobindustry`). 잡인더스트리 단추가 `/from/…` 을
 * 거쳐 여기로 온다.
 *
 * **MAT 을 새로 설명하지 않는다.** 가격표의 MAT 칸과 같은 문장(`surface-text`
 * 의 `pxTrack*`)과 같은 값(`trackOffers`)을 읽는다. 따로 적으면 어느 날
 * 잡인더스트리 쪽 값만 옛것으로 남는다.
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
  const T = txer("ko");
  const user = await currentUser().catch(() => null);
  if (user) await recordBrand(user.id, brand);
  /* **가격표와 같은 문을 지난다.** 전자상거래법 제10조 표시가 비어 있는 동안
     운영에서는 값과 사는 단추를 내놓지 않는다(`public-gate.ts`). 무료 검사로
     가는 길은 그대로 열어 둔다 */
  const gate = await publicCommerceGate().catch(() => ({ open: false }));
  const tracks = gate.open ? await trackOffers("KR").catch(() => []) : [];
  const back = `/partner/${brand}`;
  /* 잡인더스트리 공고 화면에서 넘어왔으면 그 공고를 로그인 뒤에 바로 비교한다.
     **커리어피크 쪽에서는 보지 않는다**(`takesJob`): 잡인더스트리에서 남은 쿠키가
     있어도 "보던 공고" 안내가 뜨지 않는다 */
  const hasJob = P.takesJob && Boolean((await cookies()).get(JOB_COOKIE)?.value);
  const open = hasJob ? { href: "/me/track/import", label: "보던 공고와 비교하기" } : (P.open ?? { href: "/me/track", label: `${P.label} 열기` });
  const next = encodeURIComponent(open.href);

  /* 아직 열리지 않은 것은 맨 아래 작은 글씨에만 적는다(열린 것처럼 적지 않는다) */
  const day = (d: Date) => d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });
  const fine = [
    "무료로 2번 써 볼 수 있습니다.",
    "기간권은 자동으로 갱신되지 않습니다.",
    ...(P.fine ?? []),
    ...(brand === "careerpeak" && !researchOpen() ? [`자료 올리기는 ${day(RESEARCH_POLICY_FROM)}부터 열립니다.`] : []),
    ...(brand === "careerpeak" && !consultOpen() && CONSULT_POLICY_FROM && Date.now() < CONSULT_POLICY_FROM.getTime()
      ? [`커리어피크 상담 신청은 ${day(CONSULT_POLICY_FROM)}부터 받습니다.`] : []),
  ];

  /*
   * **짧게 쓴다**(2026-10-31 대표 지시: "너무 AI 느낌"). 제목 한 줄 · 부제 한 줄 · 단추 하나,
   * 세 단계, 값. 줄표로 이은 설명 · 칸마다 붙던 면책 문장 · 같은 말 되풀이를 걷고, 꼭 알릴
   * 안내는 맨 아래 작은 글씨 한 곳에 모은다.
   */
  return (
    <div className="pub">
      <header className="pubtop">
        <BrandHome />
        <div className="pubtop-r">
          {/* 같은 탭으로 돌아간다. 새 탭으로 열면 뒤로 가기가 끊긴다 */}
          <a href={P.home} className="sf-btn ghost sm">{P.name}로 돌아가기</a>
          <Link href={user ? "/me" : `/login?next=${next}`} className="sf-btn ghost sm">
            {user ? "내 CareerMatri" : "로그인"}
          </Link>
        </div>
      </header>

      <div className="pubwrap">
        <section className="pxhero">
          <div className="sf-eyebrow">{P.name} × CareerMatri</div>
          <h1>{P.name} {P.label}</h1>
          <p>{P.intro}</p>
          {hasJob ? (
            <p style={{ marginTop: 8 }}>보시던 공고를 기억해 두었습니다. 로그인하면 바로 비교해 드립니다.</p>
          ) : null}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16, justifyContent: "center" }}>
            {user
              ? <Link href={open.href} className="sf-btn accent">{open.label}</Link>
              : <Link href={P.start?.href ?? "/signup?next=%2Fcores"} className="sf-btn accent">{P.start?.label ?? "무료로 시작하기"}</Link>}
          </div>
        </section>

        <section className="pxband">
          <div className="pxband-g">
            {P.steps.map(([t, b], i) => (
              <div key={t} className="pxband-i">
                <b>{i + 1}. {t}</b>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </section>

        {tracks.length ? (
          <section className="pxband" id="track">
            <h2>기간권</h2>
            <div className="pxband-g">
              {tracks.map((t) => (
                <div key={t.code} className="pxband-i">
                  <b>{t.days === 90 ? T("pxTrack90") : T("pxTrack30")} · {money(t.amount, t.currency, "ko")}</b>
                  <span>{t.days === 90 ? T("pxTrack90Why") : T("pxTrack30Why")}</span>
                  {payOpen("KR") ? (
                    <Link href={user ? `/checkout?product=${encodeURIComponent(t.code)}` : "/signup?next=%2Fme%2Ftrack"}
                      className={t.days === 90 ? "sf-btn accent sm" : "sf-btn ghost sm"}
                      style={{ marginTop: 10, alignSelf: "flex-start" }}>
                      {P.label} 시작하기
                    </Link>
                  ) : (
                    <LaunchNotify product={t.code} lang="ko" source={`app:/partner/${brand}`}
                      brand={brand} q={sp} compact back={`${back}#track`} />
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <p style={{ margin: "32px auto 0", maxWidth: 640, textAlign: "center", fontSize: 13, lineHeight: 1.7,
          color: "var(--sf-ink-3)", wordBreak: "keep-all" }}>
          {fine.join(" ")}
        </p>
      </div>
      <PublicFooter lang="ko" />
    </div>
  );
}
