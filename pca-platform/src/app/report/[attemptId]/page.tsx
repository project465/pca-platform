import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { buildReport } from "@/lib/report";
import { Radar, RankBars, BandBars, GapChart } from "@/components/report-charts";

export const metadata = { title: "검사 결과지 — METRI" };

const FLAG_NOTE: Record<string, string> = {
  ok: "응답이 고르게 들어왔습니다. 아래 점수를 그대로 읽으셔도 됩니다.",
  check:
    "같은 보기가 길게 이어지거나 응답이 빨랐습니다. 점수는 그대로 두되 구간을 넓게 잡았습니다.",
  invalid:
    "성실도 확인 문항을 모두 놓쳤습니다. 결과를 판단 근거로 쓰기 전에 다시 응시하시기를 권합니다.",
};

export default async function ReportPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const user = await requireRole(["student"]);
  const { attemptId } = await params;
  const r = await buildReport(attemptId, user.id);
  if (!r) notFound();

  const top = r.jobs[0];
  const topAreas = r.areas.slice(0, 3);
  const traitTop = [...r.traits].sort((a, b) => b.scaled - a.scaled)[0];
  const traitLow = [...r.traits].sort((a, b) => a.scaled - b.scaled)[0];
  const dated = r.learner.submittedAt
    ? new Date(r.learner.submittedAt).toLocaleDateString("ko-KR")
    : "";

  return (
    <div className="report">
      <header className="rp-cover">
        <div className="rp-cover-in">
          <span className="rp-kicker">METRI · Engineering Career Intelligence</span>
          <h1>직무적합 진단 결과지</h1>
          <p className="rp-who">
            {r.learner.name} · {r.learner.majorName ?? "기계공학"} · {dated}
          </p>
        </div>
      </header>

      <main className="rp-body">
        {/* ---- 00 종합 ---- */}
        <section className="rp-sec">
          <div className="rp-sec-head">
            <span className="rp-no">00</span>
            <h2>종합 요약</h2>
          </div>

          <div className="rp-lead">
            <p>
              250문항이 재는 것은 <b>무엇을 하고 싶은가</b>입니다. 실력이 아니라 관심의
              방향입니다. 가장 높게 나온 직무 분야는 <b>{topAreas[0]?.name}</b>이고, 그 아래
              직무로 내려가면 <b>{top?.name}</b>이 1순위입니다.
            </p>
          </div>

          <div className="rp-kpis">
            <div className="rp-kpi big">
              <span className="k-label">1순위 직무</span>
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
              <span className="k-label">1순위 직무분야</span>
              <b className="k-val">{topAreas[0]?.name}</b>
              <span className="k-num">{topAreas[0]?.scaled.toFixed(1)}</span>
            </div>
            <div className="rp-kpi">
              <span className="k-label">가장 뚜렷한 업무 성향</span>
              <b className="k-val">{traitTop?.name}</b>
              <span className="k-num">{traitTop?.scaled.toFixed(1)}</span>
            </div>
          </div>

          <p className={`notice ${r.quality.flag === "ok" ? "" : "warn"}`}>
            <b>응답 신뢰도</b> — {FLAG_NOTE[r.quality.flag]} 성실도 확인{" "}
            {r.quality.attentionPass}/{r.quality.attentionTotal} 통과 · 같은 보기 최대{" "}
            {r.quality.straightRun}연속 · 적합도 구간 ±{(r.quality.bandWidth / 2).toFixed(1)}점
          </p>
        </section>

        {/* ---- 01 직무분야 ---- */}
        <section className="rp-sec">
          <div className="rp-sec-head">
            <span className="rp-no">01</span>
            <h2>직무분야 10개</h2>
          </div>
          <p className="rp-note">
            문항이 직접 재는 단위입니다. 분야마다 25문항씩 답하셨고, 그 평균을 100점으로
            폈습니다. 아래 8축과 직무 순위는 모두 이 열 개에서 나옵니다.
          </p>
          <RankBars items={r.areas} />
        </section>

        {/* ---- 02 공학 활동 8축 ---- */}
        <section className="rp-sec">
          <div className="rp-sec-head">
            <span className="rp-no">02</span>
            <h2>공학 활동 선호</h2>
          </div>
          <p className="rp-note">
            직무분야 열 개를 공학 활동 여덟 가지로 옮긴 값입니다. 분야 이름은 나라마다
            다르지만 이 여덟 가지는 어디서나 같습니다 — 해외 직무와 비교할 때 쓰는 축입니다.
          </p>
          <div className="rp-chart-wrap">
            <Radar items={r.axes} />
          </div>
        </section>

        {/* ---- 03 업무 성향 ---- */}
        <section className="rp-sec">
          <div className="rp-sec-head">
            <span className="rp-no">03</span>
            <h2>업무 성향</h2>
          </div>
          <p className="rp-note">
            250문항 중 120문항에 성향이 심어져 있습니다. 여섯 가지의 절대 높이보다 서로의
            높낮이가 정보입니다. 가장 높은 쪽이 <b>{traitTop?.name}</b>, 가장 낮은 쪽이{" "}
            <b>{traitLow?.name}</b>입니다.
          </p>
          <div className="rp-chart-wrap">
            <Radar items={r.traits} />
          </div>
        </section>

        {/* ---- 04 직무 적합도 ---- */}
        <section className="rp-sec">
          <div className="rp-sec-head">
            <span className="rp-no">04</span>
            <h2>직무 적합도</h2>
          </div>
          <p className="rp-note">
            활동 선호 75% + 업무 성향 25%로 계산했습니다. 가는 막대는 신뢰구간입니다 —
            구간이 겹치는 직무끼리는 순위 차이를 크게 읽지 마십시오.
          </p>
          <BandBars
            items={r.jobs.map((j) => ({ name: j.name, fit: j.fit, band: j.band, sub: j.areaName }))}
          />
        </section>

        {/* ---- 05 역량 격차 ---- */}
        <section className="rp-sec">
          <div className="rp-sec-head">
            <span className="rp-no">05</span>
            <h2>1순위 직무가 요구하는 역량</h2>
          </div>
          <p className="rp-note">
            1순위로 나온 <b>{top?.name}</b>이 요구하는 역량을 중요도 순으로 놓았습니다.
          </p>
          {r.evidenceCount === 0 ? (
            <p className="notice warn">
              <b>보유 수준은 아직 비어 있습니다.</b> 이 검사는 관심의 방향을 재는 것이고, 역량
              보유 수준은 들은 과목·자격증·프로젝트에서만 나옵니다. 추정해서 채우지 않았습니다.
              수강 이력을 올리시면 아래 요구 수준과 나란히 놓입니다.
            </p>
          ) : null}
          <GapChart rows={r.gaps} />
          <p className="rp-legend">
            <span className="lg lg-req" /> 요구 수준
            <span className="lg lg-held" /> 보유 수준
            <span className="lg lg-gap" /> 채워야 할 구간
          </p>
        </section>

        {/* ---- 06 다음 여섯 달 ---- */}
        <section className="rp-sec">
          <div className="rp-sec-head">
            <span className="rp-no">06</span>
            <h2>다음 여섯 달</h2>
          </div>
          <ol className="rp-plan">
            <li>
              <b>1–2개월</b> {top?.name} 요구 역량 중 <b>필수</b>로 표시된 것부터 관련 과목을
              확인합니다. 이미 들은 과목이 있다면 증거로 올려 보유 수준을 채웁니다.
            </li>
            <li>
              <b>3–4개월</b> {topAreas[0]?.name} 쪽 프로젝트를 하나 끝냅니다. 결과물보다 과정
              기록이 증거가 됩니다.
            </li>
            <li>
              <b>5–6개월</b> 2순위였던 {r.jobs[1]?.name}과(와) 비교해 다시 봅니다. 구간이 겹쳤다면
              해 본 경험이 순위를 가릅니다.
            </li>
          </ol>
          <p className="rp-note">재검사는 여섯 달 뒤를 권합니다. 그전에는 값이 거의 움직이지 않습니다.</p>
        </section>

        <footer className="rp-foot">
          <Link className="act" href="/my">
            내 검사로 돌아가기
          </Link>
          <span className="rp-foot-note">
            응시 번호 {r.attemptId} · 점수는 산식이 계산했고 문장은 이 결과지의 해설입니다
          </span>
        </footer>
      </main>
    </div>
  );
}
