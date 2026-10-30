import Link from "next/link";
import { notFound } from "next/navigation";
import BrandHome from "@/components/sf/brand-home";
import PublicFooter from "@/components/sf/public-footer";
import LaunchNotify, { type NotifyQuery } from "@/components/inquiry/launch-notify";
import { currentUser } from "@/lib/session";
import { money } from "@/lib/market";
import { trackOffers } from "@/lib/track";
import { payOpen } from "@/lib/payments";
import { txer } from "@/lib/surface-text";
import { PARTNERS, isPartner, recordBrand } from "@/lib/brand";
import { publicCommerceGate } from "@/lib/public-gate";

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
 * 한국어만 낸다. 잡인더스트리는 국내 이공계 석·박사 회원을 받는 곳이다.
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
  const T = txer("ko");
  const user = await currentUser().catch(() => null);
  if (user) await recordBrand(user.id, brand);
  /* **가격표와 같은 문을 지난다.** 전자상거래법 제10조 표시가 비어 있는 동안
     운영에서는 값과 사는 단추를 내놓지 않는다(`public-gate.ts`). 무료 검사로
     가는 길은 그대로 열어 둔다 */
  const gate = await publicCommerceGate().catch(() => ({ open: false }));
  const tracks = gate.open ? await trackOffers("KR").catch(() => []) : [];
  const back = `/partner/${brand}`;

  const steps: [string, string][] = [
    ["무료 검사로 시작합니다", "전공을 고르고 기본 검사를 풀면 내 경험이 어느 판단까지 설명되는지 결과로 나옵니다."],
    ["비어 있는 부분을 확인합니다", "결과에서 아직 근거가 없는 판단과, 그걸 채울 다음 할 일을 봅니다."],
    ["MAT 이 한 주씩 챙깁니다", "공고를 붙여 두면 마감을 알려 드리고, 요구 항목마다 내 경험이 있는지 맞대어 보여 드립니다."],
  ];

  return (
    <div className="pub">
      <header className="pubtop">
        <BrandHome />
        <div className="pubtop-r">
          {/* 같은 탭으로 돌아간다. 새 탭으로 열면 뒤로 가기가 끊긴다 */}
          <a href={P.home} className="sf-btn ghost sm">{P.name}로 돌아가기</a>
          <Link href={user ? "/me" : "/login?next=%2Fme%2Ftrack"} className="sf-btn ghost sm">
            {user ? "내 CareerMatri" : "로그인"}
          </Link>
        </div>
      </header>

      <div className="pubwrap">
        <section className="pxhero">
          <div className="sf-eyebrow">{P.name} × CareerMatri</div>
          <h1>{P.name} {P.label}</h1>
          <p>
            {P.name}의 {P.label}는 CareerMatri의 MAT으로 운영합니다. 검사로 내 경험을 정리하고,
            지원할 공고와 맞대어 이번 주에 할 일을 알려 드립니다.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16, justifyContent: "center" }}>
            {user ? (
              <Link href="/me/track" className="sf-btn accent">MAT 열기</Link>
            ) : (<>
              <Link href="/signup?next=%2Fcores" className="sf-btn accent">무료 검사로 시작하기</Link>
              <Link href="/login?next=%2Fme%2Ftrack" className="sf-btn ghost">이미 계정이 있어요</Link>
            </>)}
          </div>
        </section>

        <section className="pxband">
          <h2>이렇게 이어집니다</h2>
          <div className="pxband-g">
            {steps.map(([t, b], i) => (
              <div key={t} className="pxband-i">
                <b>{i + 1}. {t}</b>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="pxband" id="track">
          <h2>{P.label}가 하는 일</h2>
          <ul className="pxtrack-f">
            <li>{T("pxTrackF1")}</li>
            <li>{T("pxTrackF2")}</li>
            <li>{T("pxTrackF3")}</li>
          </ul>
          <p className="pxwhat">{T("pxTrackNot")}</p>
          {tracks.length ? (
            <div className="pxband-g">
              {tracks.map((t) => (
                <div key={t.code} className="pxband-i">
                  <b>{t.days === 90 ? T("pxTrack90") : T("pxTrack30")} · {money(t.amount, t.currency, "ko")}</b>
                  <span>{t.days === 90 ? T("pxTrack90Why") : T("pxTrack30Why")}</span>
                  {payOpen("KR") ? (
                    <Link href={user ? `/checkout?product=${encodeURIComponent(t.code)}` : "/signup?next=%2Fme%2Ftrack"}
                      className={t.days === 90 ? "sf-btn accent sm" : "sf-btn ghost sm"}
                      style={{ marginTop: 10, alignSelf: "flex-start" }}>
                      {T("pxTrackBuy")}
                    </Link>
                  ) : (
                    <LaunchNotify product={t.code} lang="ko" source={`app:/partner/${brand}`}
                      brand={brand} q={sp} compact back={`${back}#track`} />
                  )}
                </div>
              ))}
            </div>
          ) : null}
          <p className="pxwhat">
            자동으로 갱신되지 않고, 기간이 끝나면 저절로 닫힙니다. 남은 기간이 있을 때 다시 사면 끝나는 날 뒤에 이어 붙습니다.
          </p>
        </section>
      </div>
      <PublicFooter lang="ko" />
    </div>
  );
}
