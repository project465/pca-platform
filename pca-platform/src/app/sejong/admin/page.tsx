import Link from "next/link";
import { requireSejong } from "@/sejong/lib/session";
import { areaInterest, axisConfirmed, funnel, mask, minCell, regionRange, recentAccess, type Cell } from "@/sejong/lib/metrics";
import { sejongContent, areaName } from "@/sejong/lib/content";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

function N({ c }: { c: Cell }) {
  return c.masked ? <span className="muted" title="5명 미만은 가립니다">5명 미만</span> : <>{c.n}</>;
}

function pct(a: number, b: number): string {
  return b > 0 ? `${Math.round((a / b) * 100)}%` : "-";
}

export default async function AdminHome() {
  const a = await requireSejong("admin");
  const min = await minCell(a.orgId);
  const rows = await funnel(a.orgId);
  const areas = await areaInterest(a.orgId);
  const ranges = await regionRange(a.orgId);
  const axes = await axisConfirmed(a.orgId);
  const access = await recentAccess(a.orgId, 8);
  const { instrument, axisInfo } = sejongContent();
  const virt = await queryOne<{ n: string }>(
    `SELECT count(*) AS n FROM sj_participants p JOIN users u ON u.id = p.user_id
      WHERE p.org_id = $1 AND u.display_name LIKE '가상 참여자%'`, [a.orgId]);
  const tot = rows.reduce((s, r) => ({
    issued: s.issued + r.issued, logged_in: s.logged_in + r.logged_in, started: s.started + r.started,
    scored: s.scored + r.scored, pdf: s.pdf + r.pdf, consented: s.consented + r.consented,
  }), { issued: 0, logged_in: 0, started: 0, scored: 0, pdf: 0, consented: 0 });
  const maxArea = Math.max(1, ...areas.map((x) => x.n));
  const rangeLabel = Object.fromEntries(instrument.region_ranges.options.map((o) => [o.code, o.label]));

  return (
    <>
      <h1>관리자 대시보드</h1>
      <p className="lead">세종일자리경제진흥원 (시연) · 사업 {rows.length}개 · 참여자 {tot.issued}명</p>
      <p className="sj-note warn">
        시연 자료입니다. 참여자 {tot.issued}명 중 {Number(virt?.n ?? 0)}명은 시드로 만든 <b>가상 참여자</b>이고 응답도 가짜입니다.
        PDF 생성 수는 실제로 뽑은 것만 셉니다. 5명 미만 칸은 가립니다(기준 {min}명).
      </p>

      <section className="sj-section sj-grid c4">
        <div className="sj-card sj-kpi"><b>{tot.issued}</b><span>계정 발급</span></div>
        <div className="sj-card sj-kpi"><b>{tot.started}</b><span>진단 시작 ({pct(tot.started, tot.issued)})</span></div>
        <div className="sj-card sj-kpi"><b>{tot.scored}</b><span>진단 완료 ({pct(tot.scored, tot.issued)})</span></div>
        <div className="sj-card sj-kpi"><b>{tot.pdf}</b><span>결과지 PDF 생성 인원</span></div>
      </section>

      <section className="sj-section sj-card">
        <h2>사업 단위 참여 현황</h2>
        <div className="sj-scroll">
          <table className="sj-table">
            <thead>
              <tr>
                <th>사업</th><th className="num">발급</th><th className="num">첫 로그인</th><th className="num">진단 시작</th>
                <th className="num">진단 완료</th><th className="num">PDF 생성</th><th className="num">상담 열람 동의</th><th className="num">완료율</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.program}>
                  <td><b>{r.name}</b><div className="small muted">{r.program}</div></td>
                  <td className="num"><N c={mask(r.issued, min)} /></td>
                  <td className="num"><N c={mask(r.logged_in, min)} /></td>
                  <td className="num"><N c={mask(r.started, min)} /></td>
                  <td className="num"><N c={mask(r.scored, min)} /></td>
                  <td className="num"><N c={mask(r.pdf, min)} /></td>
                  <td className="num"><N c={mask(r.consented, min)} /></td>
                  <td className="num">{r.issued >= min ? pct(r.scored, r.issued) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>
          취업 여부·지역 정주 같은 결과 성과는 이 플랫폼이 산출하지 않습니다. 진흥원 행정 자료로 확정합니다.
        </p>
      </section>

      <div className="sj-grid c2 sj-section">
        <section className="sj-card">
          <h2>희망 직무 관심 분야 (완료자)</h2>
          {areas.length === 0 ? <p className="muted">아직 완료한 사람이 없습니다.</p> : null}
          {instrument.job_areas.map((j) => {
            const n = areas.find((x) => x.code === j.code)?.n ?? 0;
            const c = mask(n, min);
            return (
              <div key={j.code} className="sj-bar">
                <span>{areaName(j.code)}</span>
                <span className="track"><i style={{ width: c.masked ? "0%" : `${(n / maxArea) * 100}%` }} /></span>
                <span className="small" style={{ textAlign: "right" }}><N c={c} /></span>
              </div>
            );
          })}
        </section>
        <section className="sj-card">
          <h2>희망 근무 지역 범위 (완료자)</h2>
          {ranges.map((x) => (
            <div key={x.code} className="sj-bar">
              <span>{rangeLabel[x.code] ?? x.code}</span>
              <span className="track"><i style={{ width: mask(x.n, min).masked ? "0%" : `${(x.n / Math.max(1, tot.scored)) * 100}%` }} /></span>
              <span className="small" style={{ textAlign: "right" }}><N c={mask(x.n, min)} /></span>
            </div>
          ))}
          <h2 style={{ marginTop: 18 }}>판단별 '경험으로 확인' 인원</h2>
          {axes.map((x) => (
            <div key={x.axis} className="sj-bar">
              <span>{axisInfo[x.axis]?.name ?? x.axis}</span>
              <span className="track"><i style={{ width: mask(x.n, min).masked ? "0%" : `${(x.n / Math.max(1, x.of)) * 100}%` }} /></span>
              <span className="small" style={{ textAlign: "right" }}><N c={mask(x.n, min)} /></span>
            </div>
          ))}
        </section>
      </div>

      <section className="sj-section sj-card">
        <h2>최근 결과 열람 기록 (상담사·관리자)</h2>
        {access.length === 0 ? <p className="muted small">아직 없습니다.</p> : (
          <table className="sj-table">
            <thead><tr><th>시각</th><th>누가</th><th>대상</th><th>무엇</th><th>비고</th></tr></thead>
            <tbody>
              {access.map((x, i) => (
                <tr key={i}>
                  <td className="small">{x.at.slice(0, 16)}</td><td>{x.actor} ({x.actor_kind})</td>
                  <td>{x.target_no ?? "-"}</td><td>{x.what === "denied" ? <span className="sj-badge warn">거절</span> : x.what}</td>
                  <td className="small muted">{x.reason ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="sj-actions">
          <Link className="sj-btn ghost" href="/sejong/admin/participants">참여자 현황</Link>
          <Link className="sj-btn ghost" href="/sejong/admin/counselors">상담사 권한·동의</Link>
        </div>
      </section>
    </>
  );
}
