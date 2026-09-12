import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { buildReport } from "@/lib/report";
import { t, UI, type Lang, type UiKey } from "@/lib/locale";
import { prescribe } from "@/lib/prescribe";
import { careerChain } from "@/lib/chain";
import { checkoutReady } from "@/lib/payments";
import PrescriptionView from "@/components/prescription";
import CareerChainView from "@/components/career-chain";
import { resolveLang } from "@/lib/locale-server";
import LangSwitch from "@/components/lang-switch";
import { Radar, RankBars, BandBars, GapChart } from "@/components/report-charts";

export const metadata = { title: "METRI" };

/** attempt_quality.flag 세 값을 문구 키로 옮긴다. */
const FLAG_KEY: Record<string, UiKey> = {
  ok: "repQualityOk",
  check: "repQualityCheck",
  invalid: "repQualityInvalid",
};

const DATE_LOCALE: Record<Lang, string> = { ko: "ko-KR", en: "en-US", tr: "tr-TR" };

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const user = await requireRole(["student"]);
  const { attemptId } = await params;
  const { lang: q } = await searchParams;
  const lang = await resolveLang(q);

  // 이름도 결과지 언어로 가져온다. 영어로 응시하고 한국어 결과지를 받으면
  // 그 결과지는 못 읽는다.
  const r = await buildReport(attemptId, user.id, lang);
  if (!r) notFound();
  if (r === "pending") {
    return (
      <div className="center-wrap">
        <div className="panel narrow">
          <h1>{t("repPendingTitle", lang)}</h1>
          <p className="sub">{t("repPendingBody", lang)}</p>
          <Link className="act" href="/my">
            {t("repBack", lang)}
          </Link>
        </div>
      </div>
    );
  }

  /**
   * 고교판이면 "Hs" 가 붙은 문구를 고른다.
   *
   * 결과지 화면을 한 벌 더 만들지 않는다. 그리는 것(막대·레이더·묶음)은
   * 두 제품이 완전히 같고, 다른 것은 부르는 이름뿐이다 —
   * 직무 ↔ 계열, 여섯 달 ↔ 한 학기, 역량 격차는 고교판에 없다.
   */
  const hs = r.kind === "major";
  /**
   * 과목 처방은 고교판에만 붙는다. 대학생에게 고교학점제 과목을 권할 일이
   * 없고, 고교판에는 역량 격차(05)가 없어 자리가 비어 있다.
   */
  const paid = r.level === "full";
  const rx = hs && paid ? await prescribe(attemptId, lang) : null;
  /**
   * 과목 앞에 "왜" 가 와야 한다. 현장에서 하는 일이 이것을 요구하기 때문에
   * 이 과목이라는 순서다 — 과목부터 내밀면 "그래서 왜" 가 남는다.
   */
  const cc = hs && paid ? await careerChain(attemptId, lang) : null;
  const tt = (key: UiKey, vars?: Record<string, string | number>) =>
    hs && `${key}Hs` in UI ? t(`${key}Hs` as UiKey, lang, vars) : t(key, lang, vars);

  const top = r.jobs[0];
  const topArea = r.areas[0];
  // 1군에 몇 개가 들어 있는지. 여러 개면 그 사실을 그대로 말해 준다
  const topTier = r.jobs.filter((j) => j.tier === 1).length;
  /** 1군 다음 묶음의 선두. 고교판에서 "그럼 다음은 어디" 에 답한다 */
  const nextTier = r.jobs.find((j) => j.tier > 1) ?? null;
  const byScore = [...r.traits].sort((a, b) => b.scaled - a.scaled);
  const traitTop = byScore[0];
  const traitLow = byScore[byScore.length - 1];
  const dated = r.learner.submittedAt
    ? new Date(r.learner.submittedAt).toLocaleDateString(DATE_LOCALE[lang])
    : "";

  const flag: UiKey = FLAG_KEY[r.quality.flag] ?? "repQualityOk";

  return (
    <div className="report">
      <header className="rp-cover">
        <div className="rp-cover-in">
          <div className="rp-cover-top">
            <span className="rp-kicker">{t("repKicker", lang)}</span>
            <LangSwitch current={lang} />
          </div>
          <h1>{tt("repTitle")}</h1>
          <p className="rp-who">
            {r.learner.name} · {r.learner.majorName ?? "—"} · {dated}
          </p>
        </div>
      </header>

      <main className="rp-body">
        {/* ---- 00 종합 ---- */}
        <section className="rp-sec">
          <div className="rp-sec-head">
            <span className="rp-no">00</span>
            <h2>{t("repSec00", lang)}</h2>
          </div>
          <div className="rp-lead">
            <p>
              {tt("repLead")}{" "}
              {tt("repLeadTop", { area: topArea?.name ?? "—", job: top?.name ?? "—" })}
            </p>
          </div>

          <div className="rp-kpis">
            <div className="rp-kpi big">
              <span className="k-label">{tt("repKpiJob")}</span>
              <b className="k-val">{top?.name}</b>
              <span className="k-num">
                {top?.fit.toFixed(1)}
                <em>
                  {" "}
                  ({top?.band[0].toFixed(0)}–{top?.band[1].toFixed(0)})
                </em>
              </span>
            </div>
            <div className="rp-kpi">
              <span className="k-label">{tt("repKpiArea")}</span>
              {hs ? (
                <>
                  <b className="k-val">{nextTier?.name ?? t("repKpiNextNone", lang)}</b>
                  <span className="k-num">{nextTier ? nextTier.fit.toFixed(1) : ""}</span>
                </>
              ) : (
                <>
                  <b className="k-val">{topArea?.name}</b>
                  <span className="k-num">{topArea?.scaled.toFixed(1)}</span>
                </>
              )}
            </div>
            <div className="rp-kpi">
              <span className="k-label">{t("repKpiTrait", lang)}</span>
              <b className="k-val">{traitTop?.name}</b>
              <span className="k-num">{traitTop?.scaled.toFixed(1)}</span>
            </div>
          </div>

          <p className={`notice ${r.quality.flag === "ok" ? "" : "warn"}`}>
            <b>{t("repQuality", lang)}</b> — {t(flag, lang)}{" "}
            {t("repQualityStat", lang, {
              a: r.quality.attentionPass,
              b: r.quality.attentionTotal,
              r: r.quality.straightRun,
              w: (r.quality.bandWidth / 2).toFixed(1),
            })}
          </p>
        </section>

        {/* ---- 01 직무분야 ---- */}
        <section className="rp-sec">
          <div className="rp-sec-head">
            <span className="rp-no">01</span>
            <h2>{tt("repSec01")}</h2>
          </div>
          <p className="rp-note">{tt("repNote01")}</p>
          <RankBars items={r.areas} />
        </section>

        {/* ---- 02 공학 활동 8축 ---- */}
        <section className="rp-sec">
          <div className="rp-sec-head">
            <span className="rp-no">02</span>
            <h2>{t("repSec02", lang)}</h2>
          </div>
          <p className="rp-note">{tt("repNote02")}</p>
          <div className="rp-chart-wrap">
            <Radar items={r.axes} />
          </div>
        </section>

        {/* ---- 03 업무 성향 (유료) ---- */}
        {paid && (
        <section className="rp-sec">
          <div className="rp-sec-head">
            <span className="rp-no">03</span>
            <h2>{t("repSec03", lang)}</h2>
          </div>
          <p className="rp-note">
            {tt("repNote03", { hi: traitTop?.name ?? "—", lo: traitLow?.name ?? "—" })}
          </p>
          <div className="rp-chart-wrap">
            <Radar items={r.traits} />
          </div>
        </section>
        )}

        {/* ---- 04 직무 적합도 ---- */}
        <section className="rp-sec">
          <div className="rp-sec-head">
            <span className="rp-no">04</span>
            <h2>{tt("repSec04")}</h2>
          </div>
          <p className="rp-note">{tt("repNote04")}</p>
          <BandBars
            items={r.jobs.map((j) => ({
              name: j.name,
              fit: j.fit,
              band: j.band,
              sub: j.areaName,
              tier: j.tier,
            }))}
            tierLabel={(n) => t("repTier", lang, { n })}
          />
          {topTier > 1 && <p className="rp-note">{tt("repTierNote", { n: topTier })}</p>}
        </section>

        {/* ---- 05 역량 격차 ---- */}
        {/* 고교판에는 이 절이 없다. 고1에게 "요구 레벨 3 · 보유 0" 을 보여 주면
            아직 아무것도 안 한 것이 부족한 것으로 읽힌다. 역량은 증거에서만
            나오고, 증거는 대학에서 쌓인다. */}
        {!hs && (
        <section className="rp-sec">
          <div className="rp-sec-head">
            <span className="rp-no">05</span>
            <h2>{t("repSec05", lang)}</h2>
          </div>
          <p className="rp-note">{t("repNote05", lang, { job: top?.name ?? "—" })}</p>
          {r.evidenceCount === 0 && (
            <p className="notice warn">
              {t("repNoEvidence", lang)}{" "}
              <Link href="/evidence" className="notice-link">
                {t("evOpen", lang)}
              </Link>
            </p>
          )}
          <GapChart rows={r.gaps} mustLabel={t("repMust", lang)} />
          {r.evidenceCount > 0 && (
            <p className="rp-note" style={{ marginTop: 16 }}>
              <Link href="/evidence" className="notice-link">
                {t("evOpen", lang)}
              </Link>
            </p>
          )}
          <p className="rp-legend">
            <span className="lg lg-req" /> {t("repLegendReq", lang)}
            <span className="lg lg-held" /> {t("repLegendHeld", lang)}
            <span className="lg lg-gap" /> {t("repLegendGap", lang)}
          </p>
        </section>
        )}

        {/* ---- 05 현장에서 거꾸로 (고교판) ---- */}
        {hs && cc && (
          <section className="rp-sec">
            <div className="rp-sec-head">
              <span className="rp-no">05</span>
              <h2>{t("repSec05Chain", lang)}</h2>
            </div>
            <p className="rp-note">{t("repNote05Chain", lang)}</p>
            <CareerChainView chain={cc} />
          </section>
        )}

        {/* ---- 06 과목 처방 (고교판) ---- */}
        {hs && rx && (
          <section className="rp-sec">
            <div className="rp-sec-head">
              <span className="rp-no">06</span>
              <h2>{t("repSec05Hs", lang)}</h2>
            </div>
            <p className="rp-note">
              {t("repNote05Hs", lang, {
                n: String(rx.majors.length),
                c: String(rx.totalCredits),
              })}
            </p>
            <PrescriptionView rx={rx} />
            <p className="rp-note" style={{ marginTop: 20, marginBottom: 0 }}>
              {t("repRxCaveat", lang)}
            </p>
          </section>
        )}

        {/* ---- 06·07 다음 여섯 달 / 다음 한 학기 (유료) ---- */}
        {paid && (
        <section className="rp-sec">
          <div className="rp-sec-head">
            <span className="rp-no">{hs ? "07" : "06"}</span>
            <h2>{tt("repSec06")}</h2>
          </div>
          <ol className="rp-plan">
            <li>
              <b>{tt("repPlanM1")}</b> {tt("repPlan1", { job: top?.name ?? "—" })}
            </li>
            <li>
              <b>{tt("repPlanM2")}</b> {tt("repPlan2", { area: topArea?.name ?? "—" })}
            </li>
            <li>
              <b>{tt("repPlanM3")}</b> {tt("repPlan3", { job: (hs ? nextTier : r.jobs[1])?.name ?? "—" })}
            </li>
          </ol>
          <p className="rp-note">{tt("repRetest")}</p>
        </section>
        )}

        {/*
          무료 구간이 끝나는 자리.
          유료 절이 있던 곳에 그대로 놓는다 — 아래로 내려가다 멈추는
          지점이어야 무엇이 남았는지 알 수 있다. 항목을 적어서 무엇을
          사는지 알게 한다.
        */}
        {!paid && (
          <section className="rp-sec rp-lock">
            <div className="rp-sec-head">
              <span className="rp-no">{hs ? "03" : "03"}</span>
              <h2>{t("repLockTitle", lang)}</h2>
            </div>
            <p className="rp-note">{t("repLockBody", lang)}</p>
            <ul className="rp-lock-list">
              <li>{t("repLockItem1", lang)}</li>
              <li>{t("repLockItem2", lang)}</li>
              <li>{t("repLockItem3", lang)}</li>
              <li>{t("repLockItem4", lang)}</li>
            </ul>
            <p className="rp-lock-keep">{t("repLockNote", lang)}</p>
            <div className="rp-lock-act">
              {/* 결제가 아직 안 열렸으면 버튼을 그리지 않는다 — 누르면
                  오류 화면이 나오고, 그건 안내가 아니다. */}
              {checkoutReady() ? (
                <Link
                  className="act solid"
                  href={`/checkout?product=HS_UPGRADE&attempt=${r.attemptId}`}
                >
                  {t("repLockCta", lang)}
                </Link>
              ) : (
                <b className="rp-lock-soon">{t("repLockSoon", lang)}</b>
              )}
              <span className="rp-foot-note">{t("repLockSchool", lang)}</span>
            </div>
          </section>
        )}

        <footer className="rp-foot">
          <Link className="act" href="/my">
            {t("repBack", lang)}
          </Link>
          <span className="rp-foot-note">{t("repFootNote", lang, { id: r.attemptId })}</span>
        </footer>
      </main>
    </div>
  );
}
