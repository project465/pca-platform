import Link from "next/link";
import { requireSejong } from "@/sejong/lib/session";
import { auxAllowed, latestScored, logAccess } from "@/sejong/lib/store";
import { orgsForAreas, reportable } from "@/sejong/lib/content";
import { ResultView } from "@/sejong/ui/result-view";

export const dynamic = "force-dynamic";

export default async function ResultPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const a = await requireSejong("participant");
  const att = await latestScored(a.userId);
  const sp = await searchParams;
  if (!att?.result) {
    return (
      <div className="sj-card">
        <h1>결과</h1>
        <p>아직 제출한 진단이 없습니다.</p>
        <Link className="sj-btn" href="/sejong/diagnosis">진단 시작</Link>
      </div>
    );
  }
  await logAccess({ actorId: a.userId, actorKind: "self", targetUser: a.userId, attemptId: att.id, what: "result_web" });
  const r = att.result;
  const aux = await auxAllowed(att.program_code, r.profile);
  const orgs = orgsForAreas(r.profile.job_areas).filter((o) => aux || o.region_scope === "SEJONG");
  const ready = orgs.filter(reportable);

  return (
    <>
      <span className="sj-badge demo">DEMO · {r.instrument_version} · {r.analysis_version}</span>
      <h1 style={{ marginTop: 10 }}>진단 결과와 역량 분석</h1>
      {sp.new ? <p className="sj-note">제출했습니다. 결과가 굳었고, 아래 내용이 결과지 PDF 와 같습니다.</p> : null}
      <p className="lead">
        {r.strengths.length
          ? `경험으로 받쳐진 판단이 ${r.strengths.length}갈래 있습니다. 지원서에서는 이 근거부터 쓰세요.`
          : "아직 경험 기록이 받쳐 준 판단이 없습니다. 해 본 일을 경험 기록에 적으면 '응답만' 칸이 확인으로 바뀔 수 있습니다."}
        {" "}희망 직무에서 채울 판단은 {new Set(r.gaps.map((g) => g.axis)).size}갈래입니다.
      </p>

      <div className="sj-section"><ResultView r={r} /></div>

      <section className="sj-section sj-card">
        <h2>이어 볼 세종 사업장</h2>
        <p className="small muted">
          고른 직무와 이어지는 곳 {orgs.length}곳 중 공식 출처로 소재를 확인한 곳 {ready.length}곳.
          추천이 아니며 채용 여부는 확인하지 않았습니다.
        </p>
        <div className="sj-actions">
          <Link className="sj-btn" href="/sejong/explore?mine=1">세종 기업·기관 탐색</Link>
          <Link className="sj-btn ghost" href="/sejong/plan">실행 계획</Link>
          <Link className="sj-btn ghost" href="/sejong/report">결과지 미리보기</Link>
        </div>
      </section>
    </>
  );
}
