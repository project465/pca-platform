import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { buildReport } from "@/lib/report";
import { t, type Lang, type UiKey } from "@/lib/locale";
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

  const top = r.jobs[0];
  const topArea = r.areas[0];
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
          <h1>{t("repTitle", lang)}</h1>
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
              {t("repLead", lang)}{" "}
              {t("repLeadTop", lang, { area: topArea?.name ?? "—", job: top?.name ?? "—" })}
            </p>
          </div>

          <div className="rp-kpis">
            <div className="rp-kpi big">
              <span className="k-label">{t("repKpiJob", lang)}</span>
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
              <span className="k-label">{t("repKpiArea", lang)}</span>
              <b className="k-val">{topArea?.name}</b>
              <span className="k-num">{topArea?.scaled.toFixed(1)}</span>
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
            <h2>{t("repSec01", lang)}</h2>
          </div>
          <p className="rp-note">{t("repNote01", lang)}</p>
          <RankBars items={r.areas} />
        </section>

        {/* ---- 02 공학 활동 8축 ---- */}
        <section className="rp-sec">
          <div className="rp-sec-head">
            <span className="rp-no">02</span>
            <h2>{t("repSec02", lang)}</h2>
          </div>
          <p className="rp-note">{t("repNote02", lang)}</p>
          <div className="rp-chart-wrap">
            <Radar items={r.axes} />
          </div>
        </section>

        {/* ---- 03 업무 성향 ---- */}
        <section className="rp-sec">
          <div className="rp-sec-head">
            <span className="rp-no">03</span>
            <h2>{t("repSec03", lang)}</h2>
          </div>
          <p className="rp-note">
            {t("repNote03", lang, { hi: traitTop?.name ?? "—", lo: traitLow?.name ?? "—" })}
          </p>
          <div className="rp-chart-wrap">
            <Radar items={r.traits} />
          </div>
        </section>

        {/* ---- 04 직무 적합도 ---- */}
        <section className="rp-sec">
          <div className="rp-sec-head">
            <span className="rp-no">04</span>
            <h2>{t("repSec04", lang)}</h2>
          </div>
          <p className="rp-note">{t("repNote04", lang)}</p>
          <BandBars
            items={r.jobs.map((j) => ({ name: j.name, fit: j.fit, band: j.band, sub: j.areaName }))}
          />
        </section>

        {/* ---- 05 역량 격차 ---- */}
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

        {/* ---- 06 다음 여섯 달 ---- */}
        <section className="rp-sec">
          <div className="rp-sec-head">
            <span className="rp-no">06</span>
            <h2>{t("repSec06", lang)}</h2>
          </div>
          <ol className="rp-plan">
            <li>
              <b>{t("repPlanM1", lang)}</b> {t("repPlan1", lang, { job: top?.name ?? "—" })}
            </li>
            <li>
              <b>{t("repPlanM2", lang)}</b> {t("repPlan2", lang, { area: topArea?.name ?? "—" })}
            </li>
            <li>
              <b>{t("repPlanM3", lang)}</b> {t("repPlan3", lang, { job: r.jobs[1]?.name ?? "—" })}
            </li>
          </ol>
          <p className="rp-note">{t("repRetest", lang)}</p>
        </section>

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
