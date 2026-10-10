import Link from "next/link";
import BrandHome from "@/components/sf/brand-home";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { attemptOf } from "@/lib/me-v2/attempt";
import { countOf, profileOf } from "@/lib/me-v2/evidence";
import { latestSnapshot } from "@/lib/me-v2/render";
import { legacyBrief } from "@/lib/me-v2/legacy-summary";
import { step } from "@/lib/funnel-server";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Empty } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";
import { GenerateButton, ReportFrame } from "./report-view";

export const metadata = { title: `결과지 · ${BRAND.root}` };

/**
 * ME_V2 결과지.
 *
 * **아직 안 만든 것과 만들다 막힌 것을 가른다.** 둘 다 "결과지가 없습니다"
 * 로 적으면 막힌 날 아무도 모른다. 없으면 만드는 단추가 서고, 만들다 막히면
 * 그 자리에 까닭과 되짚을 번호가 선다.
 *
 * **경험을 안 적으신 분에게는 그 사실을 적는다.** 적지 않으면 할 수 있는
 * 말이 줄어드는데, 그것을 적지 않으면 읽는 사람은 이 검사가 원래 그 정도인
 * 줄 안다.
 */
export default async function ReportPage({
  params, searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const user = await requireUser();
  const { attemptId } = await params;
  const sp = await searchParams;
  const L = toLang2(await resolveLang(sp.lang));
  const T = txer(L);

  const a = await attemptOf(attemptId, user.id);
  if (!a) notFound();
  /* 아직 다 안 푼 응시로 결과지를 열 수 없다. 응시 화면으로 돌려보낸다 */
  if (!a.submitted_at) redirect(`/assessment/${attemptId}`);

  const snap = await latestSnapshot(attemptId);
  /* **결과지가 실제로 있을 때만 센다.** 만드는 단추가 선 화면까지 세면
     '결과지를 본 사람' 이 본 적 없는 사람으로 불어난다 */
  if (snap) await step("result_viewed", { userId: user.id, props: { tier: a.tier } });
  /* **굳은 기록에서 꺼내 온다.** 여기서 판단하지 않는다 */
  const brief = legacyBrief(snap?.payload);
  const prof = await profileOf(user.id);
  const n = countOf(prof);
  const bare = n.items === 0 && n.research === 0;

  return (
    <div className="pub">
      <header className="pubtop">
        {/* 로고와 브랜드 글자가 한 덩어리로 홈으로 간다. 로그인했으면 그
            역할의 첫 화면, 아니면 공개 홈이다 */}
        <BrandHome />
        <div className="pubtop-r">
          <LangSelect current={L} />
          <Link href="/me" className="sf-btn ghost sm">{T("navHome")}</Link>
        </div>
      </header>

      <div className="pubwrap" style={{ maxWidth: 1040 }}>
        <div className="sf-head">
          <div className="sf-head-t">
            {/* **어느 판본의 결과인지 사용자 말로 적는다**(규격 §7 · §3-1).
                전에는 등급과 학위 단계만 적혀 있어서, 지금 검사의 결과와
                그때 받은 결과가 화면에서 구별되지 않았다 */}
            <div className="sf-eyebrow">{T("rpOlder")}</div>
            <h1 className="sf-h1">{T("rpTitle")}</h1>
            <p className="rpmeta">
              <span><b>{T("rpTakenOn")}</b>{" "}
                {String(a.submitted_at ?? "").slice(0, 10) || "—"}</span>
              <span><b>{T("rpMajor")}</b> {T("rpMajorMe")}</span>
              <span><b>{T("rpTier")}</b> {a.tier}</span>
              {snap ? (
                <span><b>{T("rpMadeAt")}</b>{" "}
                  {String(snap.generated_at).slice(0, 10)}</span>
              ) : null}
            </p>
            <p className="sf-sub">{snap ? T("rpOlderNote") : T("rpNoneBody")}</p>
          </div>
          <div className="sf-head-a">
            {snap ? (
              <>
                {/* **없는 파일로 가는 단추를 그리지 않는다.** PDF 만들기가
                    깨진 날에도 이 자리에 단추가 서 있었고, 누르면 404 가
                    떴다. 웹 결과지는 그대로 열려 있으므로 그 사실을 적고
                    다시 만드는 쪽으로 보낸다(규격 §16) */}
                {snap.pdf_path ? (
                  <a href={`/assessment/${attemptId}/report/pdf`} className="sf-btn">
                    {T("rpPdf")}
                  </a>
                ) : null}
                <Link href={`/assessment/${attemptId}/evidence`} className="sf-btn ghost">
                  {T("asAddEvidence")}
                </Link>
                {/* **통제 파일럿에서만 띄운다**(규격 §19). 일반 손님에게
                    늘 보이면 결과지 머리에 설문 단추가 서고, 산 사람이
                    받으러 온 것은 결과지다 */}
                {process.env.PILOT_OPEN === "yes" ? (
                  <Link href={`/pilot/${attemptId}`} className="sf-btn ghost">
                    {L === "en" ? "Tell us how it read" : "읽은 느낌 알려 주기"}
                  </Link>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        {snap ? (
          <>
            {/* ── 핵심 요약 ────────────────────────────────────────────
             *
             * **굳은 기록에서 꺼내 적는다.** 여기 서는 세 줄은 결과를
             * 만들 때 이미 적어 둔 값이고(`payload.summary`), 다시 계산한
             * 것이 아니다. 그래서 그때 나간 결과지와 이 화면이 다른 말을
             * 할 수 없다.
             *
             * **왜 첫 화면에 따로 두는가.** 아래 전체 보고서는 A4 열 장을
             * 넘고, 그것을 다 펼쳐 놓으면 읽는 화면이 아니라 내려받기 전의
             * 미리보기가 된다. 첫 화면은 `무엇이 가장 비어 있고 지금
             * 무엇을 하면 되는가` 까지만 든다 */}
            {brief ? (
              <section className="rpbrief">
                <h2 className="sf-h2">{T("rpBriefTitle")}</h2>
                {brief.roles.length ? (
                  <div className="rpbrief-row">
                    <b>{T("rpBriefRoles")}</b>
                    <p>{brief.roles.map((r) => r.name).join(" · ")}
                      {brief.roles[0]?.slot
                        ? <small>{brief.roles[0].slot}</small> : null}</p>
                  </div>
                ) : null}
                {brief.gap ? (
                  <div className="rpbrief-row">
                    <b>{T("rpBriefGap")}</b>
                    <p>{brief.gap.family
                      ? `${brief.gap.family} · ${brief.gap.label}`
                      : brief.gap.label}
                      {brief.gap.why ? <small>{brief.gap.why}</small> : null}</p>
                  </div>
                ) : null}
                {brief.next ? (
                  <div className="rpbrief-row is-do">
                    <b>{T("rpBriefNext")}</b>
                    <p>{brief.next}</p>
                  </div>
                ) : null}
                {brief.note ? <p className="sf-meta">{brief.note}</p> : null}
              </section>
            ) : null}

            {/* 경험을 안 적으셨으면 무엇이 빠지는지 적는다.
                **첫 화면 위가 아니라 요약 다음이다**: 손전화에서 이 칸이
                맨 위에 서면 첫 창을 거의 다 먹어서, 결과를 보러 온
                사람이 요약을 한 줄도 못 읽고 스크롤을 시작한다 */}
            {bare ? (
              <div className="sf-section">
                {/* **여기서는 거드는 단추다.** 이 쪽의 주된 일은 결과지를
                    내는 것이고, 경험은 그다음이다. 둘을 같은 굵기로 두면
                    결과지를 받으러 온 사람이 경험 화면으로 끌려간다 */}
                <Empty
                  icon="layers"
                  title={T("rpBareTitle")}
                  body={T("rpBareBody")}
                  cta={
                    <Link href={`/assessment/${attemptId}/evidence`}
                      className="sf-btn ghost">
                      {T("asAddEvidence")}
                    </Link>
                  }
                  tight
                />
              </div>
            ) : null}

            {/* ── 상세 결과 ────────────────────────────────────────────
             *
             * 전체 보고서는 그대로 들고 있고 절마다 접혀 있다. **가린
             * 것이 아니라 접은 것이다**: 눌러서 펼치면 문서가 그만큼
             * 길어지고, PDF 에는 처음부터 전부 들어 있다 */}
            <h2 className="sf-h2 rpdetail">{T("rpDetail")}</h2>
            <p className="sf-meta" style={{ marginTop: 0 }}>{T("rpDetailBody")}</p>
            {/* 결과지 본문은 **만들 때의 언어**로 읽는다. 화면 언어를
                바꿔도 이미 나간 결과지의 글은 그대로다 */}
            <ReportFrame attemptId={attemptId}
              lang={snap.interface_language ?? L} />
            {/* 다시 만드는 단추는 아래에 둔다. 위에 두면 이미 있는 결과지를
                덮는 단추로 읽힌다 */}
            <div className="rpmake">
              <span className="sf-meta">
                {snap.pdf_path ? T("rpAgainWhy") : T("rpPdfMissing")}
              </span>
              <GenerateButton
                attemptId={attemptId}
                labels={{
                  make: T("rpAgain"), making: T("rpMaking"),
                  again: T("rpRetry"), failed: T("rpFailed"),
                }}
              />
            </div>
          </>
        ) : (
          <div className="sf-section">
            <div className="sf-card">
              <h2 className="sf-h2">{T("rpNoneTitle")}</h2>
              <p className="sf-sub" style={{ fontSize: 14 }}>{T("rpNoneBody")}</p>
              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <GenerateButton
                  attemptId={attemptId}
                  labels={{
                    make: T("rpMake"), making: T("rpMaking"),
                    again: T("rpRetry"), failed: T("rpFailed"),
                  }}
                />
                <Link href={`/assessment/${attemptId}/evidence?flow=1`}
                  className="sf-btn ghost">
                  {T("asAddEvidence")}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
