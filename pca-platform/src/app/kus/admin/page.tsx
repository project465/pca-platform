import { SectionHeader } from "@/app/me/ui";
import { appEnv } from "@/lib/env";
import { campusV3 } from "@/lib/me-v3/campus";
import { campusStudentCount } from "@/lib/campus/students";
import { requireKusAdmin } from "@/lib/kus/access";
import { KUS_CODE, MODE_KO, kusDepartments } from "@/lib/kus/program";
import { visitCounts, visitPrograms } from "@/lib/kus/visits";
import { KusHead, KusNote } from "../shell";
import { registerProgram } from "./actions";

export const dynamic = "force-dynamic";

/**
 * KUS 담당자 화면. **집계와 탐방 등록뿐이다.**
 *
 * 개인별 결과 · 응답 · 탐방 기록 본문을 부르는 쿼리를 **이 파일이 아예
 * 갖지 않는다**(`scripts/kus/verify.ts` 가 소스로 센다). 담당자에게 개인
 * 결과를 열지는 계약과 학생 동의 범위가 정해진 뒤에 정한다. 수는 공통
 * 집계(`campusV3`)를 지나므로 다섯 명이 안 되는 칸은 값이 서지 않는다.
 */
export default async function KusAdmin({ searchParams }: { searchParams: Promise<{ added?: string; e?: string }> }) {
  const { orgId } = await requireKusAdmin();
  const sp = await searchParams;
  const [agg, roster, vc, programs] = await Promise.all([
    campusV3({ orgIds: [Number(orgId)], universityCode: KUS_CODE, withDemo: appEnv() !== "production" }),
    campusStudentCount(KUS_CODE), visitCounts(), visitPrograms({ includeCancelled: true }),
  ]);
  const depts = kusDepartments();
  const byMode = (m: string) => depts.filter((d) => d.mode === m).length;
  return (
    <div className="cm kus"><div className="cm-wrap"><main className="cm-main"><div className="cm-canvas"><div className="cm-in">
      <KusHead kicker="고려대학교 세종캠퍼스 · 담당자" title="프로그램 현황"
        lead="집계와 탐방 등록만 다룹니다. 개인별 결과는 계약과 학생 동의 범위가 정해지기 전까지 이 화면에서 열리지 않습니다." />
      {appEnv() !== "production" ? <KusNote>시연 환경입니다. 테스트 계정이 집계에 섞여 있습니다.</KusNote> : null}
      {sp.added ? <KusNote tone="info">탐방을 등록했습니다.</KusNote> : null}
      {sp.e ? <KusNote>기업 이름을 적어 주세요.</KusNote> : null}

      <div className="kus-stats">
        <div className="kus-stat"><span className="kus-stat-k">발급 학생</span><span className="kus-stat-v">{roster}명</span><span className="kus-stat-s">대상자 {agg.target}명</span></div>
        <div className="kus-stat"><span className="kus-stat-k">검사 시작</span><span className="kus-stat-v">{agg.started}명</span><span className="kus-stat-s">진행 중 {agg.in_progress}명</span></div>
        <div className="kus-stat"><span className="kus-stat-k">검사 완료</span><span className="kus-stat-v">{agg.scored}명</span><span className="kus-stat-s">{agg.completion === null ? "완료율 계산 전" : `완료율 ${agg.completion}%`}</span></div>
        <div className="kus-stat"><span className="kus-stat-k">탐방 기록</span><span className="kus-stat-v">{vc.visits}건</span><span className="kus-stat-s">기록한 학생 {vc.students}명 · 직접 해 본 활동 {vc.did}건</span></div>
      </div>

      <section className="kus-panel">
        <SectionHeader icon="layers" title="학과별 검사 준비 상태" sub={`${MODE_KO.LIVE} ${byMode("LIVE")} · ${MODE_KO.DEMO} ${byMode("DEMO")} · ${MODE_KO.PREPARING} ${byMode("PREPARING")}`} />
        <div className="kus-scroll"><table className="kus-table">
          <thead><tr><th>단과대학</th><th>학과·전공</th><th>상태</th><th>메모</th></tr></thead>
          <tbody>{depts.map((d) => (
            <tr key={d.code}><td>{d.college}</td><td><b>{d.name}</b>{d.unit ? <><br /><small>{d.unit}</small></> : null}</td>
              <td><span className={`kus-pill ${d.mode === "LIVE" ? "is-ok" : d.mode === "DEMO" ? "is-warn" : ""}`}>{MODE_KO[d.mode]}</span></td>
              <td><small>{d.note ?? ""}</small></td></tr>))}</tbody>
        </table></div>
        <p className="cm-shsub">학과 목록은 공식 주소를 출처로 든 검색 요지에서 옮겼고 원문 대조 전입니다. 참여 학생 전공이 확인되면 여는 순서를 바꿉니다.</p>
      </section>

      <section className="kus-panel">
        <SectionHeader icon="layers" title="학과별 완료(5명 이상인 칸만)" />
        {agg.by_department.length ? (
          <ul>{agg.by_department.map((c) => <li key={c.key}>{c.label}: {c.n ?? "5명 미만"}</li>)}</ul>
        ) : <p className="cm-shsub">5명이 넘는 학과가 아직 없어 칸을 세우지 않았습니다.</p>}
      </section>

      <section className="kus-panel">
        <SectionHeader icon="building" title="탐방 기업" />
        {programs.length ? (
          <div className="kus-scroll"><table className="kus-table">
            <thead><tr><th>기업</th><th>날짜</th><th>상태</th><th>확인 근거</th></tr></thead>
            <tbody>{programs.map((p) => (
              <tr key={p.id}><td><b>{p.company_name}</b>{p.is_test ? <> <span className="kus-pill is-test">테스트</span></> : null}</td>
                <td>{p.visit_date ?? "미정"}</td><td>{p.status}</td><td>{p.source_note ?? "확인 전"}</td></tr>))}</tbody>
          </table></div>
        ) : <p className="cm-shsub">등록된 탐방 기업이 없습니다.</p>}
        <form action={registerProgram} className="kus-form" style={{ marginTop: 16 }}>
          <div className="kus-field"><label htmlFor="company_name">기업 이름</label><input className="kus-input" id="company_name" name="company_name" maxLength={80} required /></div>
          <div className="kus-field"><label htmlFor="business_note">업종·사업 한 줄(확인한 것만)</label><input className="kus-input" id="business_note" name="business_note" maxLength={200} /></div>
          <div className="kus-field"><label htmlFor="visit_date">탐방 날짜</label><input className="kus-input" id="visit_date" name="visit_date" type="date" /></div>
          <div className="kus-field"><label htmlFor="status">상태</label>
            <select id="status" name="status" defaultValue="PLANNED"><option value="PLANNED">예정</option><option value="CONFIRMED">확정</option><option value="DONE">완료</option><option value="CANCELLED">취소</option></select></div>
          <div className="kus-field"><label htmlFor="source_note">확인 근거(공문 · 협약 · 담당자 확인)</label><input className="kus-input" id="source_note" name="source_note" maxLength={200} /><small>비우면 학생 화면에 `확인 전` 이 섭니다.</small></div>
          <label><input type="checkbox" name="is_test" /> 테스트 줄(학생 화면과 PDF 에 테스트 표시)</label>
          <div className="kus-actions"><button type="submit" className="cm-btn is-primary">탐방 등록</button></div>
        </form>
      </section>
    </div></div></main></div></div>
  );
}
