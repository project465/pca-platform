import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { canRead, MIN_CELL } from "@/lib/org";
import { buildCohort } from "@/lib/cohort";
import { Radar, RankBars } from "@/components/report-charts";

export const metadata = { title: "단체 리포트 — METRI" };

/**
 * 단체 리포트.
 *
 * 개인 결과지를 500장 묶어 준다고 학과가 돈을 쓰지 않는다. 학과가 사는 것은
 * 커리큘럼을 손볼 근거이므로, 마지막 절이 항상 교육 수요로 끝나야 한다.
 */
export default async function CohortReport({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["org_admin", "instructor"]);
  const { id } = await params;
  if (!(await canRead(user.id, id))) notFound();

  const c = await buildCohort(id);
  if (!c) notFound();

  const worst = c.demand[0];

  return (
    <div className="report">
      <header className="rp-cover">
        <div className="rp-cover-in">
          <span className="rp-kicker">METRI · 학과 집계 리포트</span>
          <h1>{c.session.name}</h1>
          <p className="rp-who">
            {c.session.orgName} · 명단 {c.n}명 · 채점 완료 {c.scored}명
          </p>
        </div>
      </header>

      <main className="rp-body">
        {c.suppressed ? (
          <section className="rp-sec">
            <div className="rp-sec-head">
              <span className="rp-no">—</span>
              <h2>아직 집계를 낼 수 없습니다</h2>
            </div>
            <p className="notice warn">
              채점이 끝난 학생이 {c.scored}명입니다. {MIN_CELL}명 미만인 칸은 숫자를 내지 않습니다 —
              익명 집계가 개인 식별이 되는 순간 이 리포트는 쓸 수 없게 됩니다. 응시가 더 쌓이면
              자동으로 열립니다.
            </p>
          </section>
        ) : (
          <>
            {/* ---- 00 종합 ---- */}
            <section className="rp-sec">
              <div className="rp-sec-head">
                <span className="rp-no">00</span>
                <h2>종합</h2>
              </div>
              <div className="rp-lead">
                <p>
                  채점이 끝난 {c.scored}명 가운데 1순위 직무가 가장 많이 몰린 곳은{" "}
                  <b>{c.topJobs[0]?.label}</b>이고, 학과 평균이 가장 높은 직무분야는{" "}
                  <b>{c.areas[0]?.name}</b>({c.areas[0]?.mean})입니다.
                  {worst && (
                    <>
                      {" "}
                      교육이 가장 급한 칸은 <b>{worst.name}</b>으로, 요구 수준 {worst.required}을
                      채운 학생이 {worst.metPct}%입니다.
                    </>
                  )}
                </p>
              </div>
              <div className="rp-kpis">
                <div className="rp-kpi big">
                  <span className="k-label">교육 대상 (가장 급한 역량)</span>
                  <b className="k-val">{worst?.name ?? "—"}</b>
                  <span className="k-num">
                    {worst?.hidden ? "—" : (worst?.shortfall ?? 0)}
                    <em>명</em>
                  </span>
                </div>
                <div className="rp-kpi">
                  <span className="k-label">응답 신뢰도</span>
                  <b className="k-val">정상 {c.quality.ok}명</b>
                  <span className="k-num">
                    재확인 {c.quality.check} · 무효 {c.quality.invalid}
                  </span>
                </div>
                <div className="rp-kpi">
                  <span className="k-label">증거 입력률</span>
                  <b className="k-val">{c.evidenceCoverage}%</b>
                  <span className="k-num">수강 이력을 올린 학생</span>
                </div>
              </div>
            </section>

            {/* ---- 01 직무 분포 ---- */}
            <section className="rp-sec">
              <div className="rp-sec-head">
                <span className="rp-no">01</span>
                <h2>1순위 직무 분포</h2>
              </div>
              <p className="rp-note">
                학생마다 1순위로 나온 직무를 셌습니다. {MIN_CELL}명 미만인 칸은 숫자를 감춥니다.
              </p>
              <ul className="distlist">
                {c.topJobs.map((j) => (
                  <li key={j.label}>
                    <span className="d-name">{j.label}</span>
                    <span className={`d-track${j.hidden ? " hidden" : ""}`}>
                      {!j.hidden && <span className="d-fill" style={{ width: `${j.pct}%` }} />}
                    </span>
                    <span className="d-num">
                      {j.hidden ? <i>{MIN_CELL}명 미만</i> : `${j.n}명 · ${j.pct}%`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* ---- 02 직무분야 평균 ---- */}
            <section className="rp-sec">
              <div className="rp-sec-head">
                <span className="rp-no">02</span>
                <h2>직무분야 평균</h2>
              </div>
              <p className="rp-note">
                학과 전체가 어느 쪽으로 기울어 있는지 봅니다. 커리큘럼이 이 분포와 어긋나 있다면
                그것이 먼저 손댈 곳입니다.
              </p>
              <RankBars items={c.areas.map((a) => ({ name: a.name, scaled: a.mean }))} />
            </section>

            {/* ---- 03 업무 성향 ---- */}
            <section className="rp-sec">
              <div className="rp-sec-head">
                <span className="rp-no">03</span>
                <h2>업무 성향 평균</h2>
              </div>
              <div className="rp-chart-wrap">
                <Radar items={c.traits.map((t) => ({ name: t.name, scaled: t.mean }))} />
              </div>
            </section>

            {/* ---- 04 교육 수요 ---- */}
            <section className="rp-sec">
              <div className="rp-sec-head">
                <span className="rp-no">04</span>
                <h2>교육 수요</h2>
              </div>
              <p className="rp-note">
                이 회차에서 상위 3순위로 많이 나온 직무들이 요구하는 역량입니다. 요구 수준을
                채우지 못한 학생 수가 곧 교육 대상입니다.
              </p>
              <p className="notice warn">
                <b>증거 입력률 {c.evidenceCoverage}%.</b> 보유 수준은 학생이 올린 수강 이력·자격증에서만
                나옵니다. 실제로 들었는데 올리지 않은 학생이 &ldquo;못 채움&rdquo;으로 섞이므로, 아래 인원은
                상한으로 읽으십시오. 입력률이 올라가면 숫자가 줄어듭니다.
              </p>
              <div className="tablewrap">
                <table className="demand">
                  <thead>
                    <tr>
                      <th>역량</th>
                      <th>요구 수준</th>
                      <th>충족률</th>
                      <th>교육 대상</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.demand.map((d) => (
                      <tr key={d.code}>
                        <td>{d.name}</td>
                        <td className="mono">{d.required}</td>
                        <td className="mono">{d.metPct}%</td>
                        <td className="mono strong">
                          {d.hidden ? <i>{MIN_CELL}명 미만</i> : `${d.shortfall}명`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <footer className="rp-foot">
          <Link className="act" href={`/org/sessions/${c.session.id}`}>
            회차로 돌아가기
          </Link>
          <span className="rp-foot-note">
            {MIN_CELL}명 미만 칸은 숫자를 내지 않습니다 · 개인을 지목할 수 있는 집계는 만들지 않습니다
          </span>
        </footer>
      </main>
    </div>
  );
}
