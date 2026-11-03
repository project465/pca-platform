import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";
import {
  MAT_SOURCES, MAT_SOURCE_KO, MAT_STEPS, MAT_STEP_KO, matFunnelReport, syncAssessmentComplete,
} from "@/lib/funnel-v3";

export const metadata = { title: "MAT 수치 · CareerMatri" };
export const dynamic = "force-dynamic";

/**
 * MAT 수익화 수치(2026-11-03 대표 결정). 가입 → 검사 완료 → MAT 열기 → 무료 분석 → 결제 → 갱신 · 해지를
 * 날짜 · 유입 경로별 **사람 수**로 본다. 사람 이름 · 메일 · 번호는 표에도 화면에도 없다.
 *
 * **비율을 만들지 않는다.** 근거 수는 검사 전 · 후의 합계만 보인다. "검사하면 몇 % 더" 같은 말은
 * 표시광고법상 근거가 쌓이고 검토가 끝난 뒤에만 쓴다.
 */
export default async function MatFunnelPage({
  searchParams,
}: { searchParams: Promise<{ days?: string }> }) {
  const user = await requireRole(["superadmin"]);
  const sp = await searchParams;
  const days = Math.max(1, Math.min(90, Number(sp.days ?? 14) || 14));
  await syncAssessmentComplete(days + 1).catch(() => 0);
  const r = await matFunnelReport(days);
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

  return (
    <AdminShell user={user} current="/admin/mat-funnel">
      <h1>MAT 수치</h1>
      <p className="sub">
        최근 {r.days}일 · 사람 수 · 같은 날 같은 걸음은 한 번으로 셉니다.
        {" "}<a href="?days=7">7일</a> · <a href="?days=14">14일</a> · <a href="?days=30">30일</a> · <a href="?days=90">90일</a>
      </p>

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>기간 합계 · 유입 경로별</h2>
        <div className="sf-tw">
          <table className="sf-table">
            <thead>
              <tr><th>걸음</th>{MAT_SOURCES.map((s) => <th key={s} className="num">{MAT_SOURCE_KO[s]}</th>)}<th className="num">합</th></tr>
            </thead>
            <tbody>
              {MAT_STEPS.map((st) => (
                <tr key={st}>
                  <td className="sf-strong">{MAT_STEP_KO[st]}</td>
                  {MAT_SOURCES.map((s) => <td key={s} className="num">{r.total[st][s]}</td>)}
                  <td className="num">{sum(r.total[st])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>날짜별</h2>
        {r.byDay.length === 0 ? <p className="sub">아직 쌓인 것이 없습니다.</p> : (
          <div className="sf-tw">
            <table className="sf-table">
              <thead><tr><th>날짜</th>{MAT_STEPS.map((st) => <th key={st} className="num">{MAT_STEP_KO[st]}</th>)}</tr></thead>
              <tbody>
                {r.byDay.map((d) => (
                  <tr key={d.day}>
                    <td className="sf-strong">{d.day}</td>
                    {MAT_STEPS.map((st) => (
                      <td key={st} className="num" title={MAT_SOURCES.map((s) => `${MAT_SOURCE_KO[s]} ${d.counts[st][s]}`).join(" · ")}>
                        {sum(d.counts[st])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <h2>잡인더스트리 공고별</h2>
        {r.postings.length === 0 ? <p className="sub">공고 입구로 들어온 사람이 아직 없습니다.</p> : (
          <div className="sf-tw">
            <table className="sf-table">
              <thead><tr><th>공고 idx</th>{MAT_STEPS.map((st) => <th key={st} className="num">{MAT_STEP_KO[st]}</th>)}</tr></thead>
              <tbody>
                {r.postings.map((p) => (
                  <tr key={p.idx}>
                    <td className="sf-strong">{p.idx}</td>
                    {MAT_STEPS.map((st) => <td key={st} className="num">{p.counts[st] ?? 0}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>공고 분석에 붙은 근거 수 · 검사 전 / 후</h2>
        <p className="sub">합계만 둡니다. 비교 문장이나 비율은 화면에 내지 않습니다.</p>
        <div className="sf-tw">
          <table className="sf-table">
            <thead><tr><th>구분</th><th className="num">분석</th><th className="num">요구 항목</th><th className="num">근거가 붙은 항목</th><th className="num">붙은 근거</th></tr></thead>
            <tbody>
              {[false, true].map((w) => {
                const e = r.evidence.find((x) => x.withAssessment === w);
                return (
                  <tr key={String(w)}>
                    <td className="sf-strong">{w ? "검사 후" : "검사 전"}</td>
                    <td className="num">{e?.analyses ?? 0}</td>
                    <td className="num">{e?.requirementItems ?? 0}</td>
                    <td className="num">{e?.backedItems ?? 0}</td>
                    <td className="num">{e?.evidenceItems ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
