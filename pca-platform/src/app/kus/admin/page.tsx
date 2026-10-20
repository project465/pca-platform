import { appEnv } from "@/lib/env";
import { campusV3 } from "@/lib/me-v3/campus";
import { campusStudentCount } from "@/lib/campus/students";
import { requireKusAdmin } from "@/lib/kus/access";
import { COMPAT_KO, KUS_CODE, MODE_KO, kusDepartments } from "@/lib/kus/program";
import { visitCounts, visitPrograms } from "@/lib/kus/visits";
import { KusCard, KusHead, KusNote } from "../shell";
import { registerProgram } from "./actions";

export const dynamic = "force-dynamic";

const VISIT_STATUS_KO: Record<string, string> = { PLANNED: "예정", CONFIRMED: "확정", DONE: "완료", CANCELLED: "취소" };

/**
 * 담당자 표의 메모. 등록부의 `note` 는 우리 쪽 작업 기록(Core 코드 · 문서 경로)이라 담당자에게
 * 그대로 세우지 않는다. 적는 것은 어느 전공 검사로 재는가와 교육과정 대조 등급뿐이다.
 */
function memoOf(d: { core_name: string | null; compat: string | null }): string {
  const what = d.core_name ? `${d.core_name} 검사` : "연결한 검사 없음";
  return d.compat && COMPAT_KO[d.compat] ? `${what} · ${COMPAT_KO[d.compat]}` : what;
}

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
    <div className="kus-admin">
      <KusHead kicker="고려대학교 세종캠퍼스 · 담당자" title="프로그램 현황"
        lead="참여 현황과 탐방 등록을 볼 수 있어요. 학생 개인 결과는 계약과 학생 동의 범위가 정해지기 전까지 열리지 않아요." />
      {appEnv() !== "production" ? <KusNote>시연 환경이에요. 테스트 계정이 집계에 섞여 있어요.</KusNote> : null}
      {sp.added ? <KusNote tone="info">탐방을 등록했어요.</KusNote> : null}
      {sp.e ? <KusNote>기업 이름을 적어 주세요.</KusNote> : null}

      <KusCard>
        <div className="kus-nums">
          <div className="kus-num"><b>{roster}명</b><span>계정을 받은 학생</span></div>
          <div className="kus-num"><b>{agg.started}명</b><span>검사 시작 · 진행 중 {agg.in_progress}명</span></div>
          <div className="kus-num"><b>{agg.scored}명</b><span>검사 완료 · {agg.completion === null ? "완료율 계산 전" : `완료율 ${agg.completion}%`}</span></div>
          <div className="kus-num"><b>{vc.visits}건</b><span>탐방 기록 · 학생 {vc.students}명</span></div>
        </div>
      </KusCard>

      <KusCard title="학과별 검사 상태" sub={`${MODE_KO.LIVE} ${byMode("LIVE")} · ${MODE_KO.DEMO} ${byMode("DEMO")} · ${MODE_KO.PREPARING} ${byMode("PREPARING")}`}>
        <div className="kus-scroll"><table className="kus-table">
          <thead><tr><th>단과대학</th><th>학과·전공</th><th>상태</th><th>검사 · 대조 등급</th></tr></thead>
          <tbody>{depts.map((d) => (
            <tr key={d.code}><td>{d.college}</td><td><b>{d.name}</b>{d.unit ? <><br /><small>{d.unit}</small></> : null}</td>
              <td><span className={`kus-chip ${d.mode === "LIVE" ? "is-green" : d.mode === "DEMO" ? "is-amber" : ""}`}>{MODE_KO[d.mode]}</span></td>
              <td><small>{memoOf(d)}</small></td></tr>))}</tbody>
        </table></div>
        <p className="kus-foot">학과 목록은 공식 홈페이지 검색 결과에서 옮겼고 원문 대조 전이에요. 대조 등급은 교육과정과 검사 영역을 맞춰 본 것이고, 측정 타당도 검증은 아니에요.</p>
      </KusCard>

      <KusCard title="학과별 완료" sub="5명이 안 되는 학과는 한 사람이 드러나지 않게 숫자를 적지 않아요.">
        {agg.by_department.length ? (
          <div className="kus-scroll"><table className="kus-table">
            <thead><tr><th>학과·전공</th><th>완료</th></tr></thead>
            <tbody>{agg.by_department.map((c) => (
              <tr key={c.key}><td><b>{depts.find((d) => d.code === c.key)?.name ?? c.label}</b></td>
                <td>{c.n === null ? "5명 미만" : `${c.n}명`}</td></tr>))}</tbody>
          </table></div>
        ) : <p className="kus-muted">아직 완료한 학생이 없어요.</p>}
      </KusCard>

      <KusCard title="탐방 기업">
        {programs.length ? (
          <div className="kus-scroll"><table className="kus-table">
            <thead><tr><th>기업</th><th>날짜</th><th>상태</th><th>확인 근거</th></tr></thead>
            <tbody>{programs.map((p) => (
              <tr key={p.id}><td><b>{p.company_name}</b>{p.is_test ? <> <span className="kus-chip is-red">테스트</span></> : null}</td>
                <td>{p.visit_date ?? "미정"}</td><td>{VISIT_STATUS_KO[p.status] ?? p.status}</td><td>{p.source_note ?? "확인 전"}</td></tr>))}</tbody>
          </table></div>
        ) : <p className="kus-muted">등록된 탐방 기업이 없어요.</p>}
      </KusCard>

      <KusCard title="탐방 등록">
        <form action={registerProgram} className="kus-form" style={{ marginTop: 12 }}>
          <div className="kus-field"><label htmlFor="company_name">기업 이름</label><input className="kus-input" id="company_name" name="company_name" maxLength={80} required /></div>
          <div className="kus-field"><label htmlFor="business_note">업종·사업 한 줄</label><input className="kus-input" id="business_note" name="business_note" maxLength={200} placeholder="확인한 내용만 적어 주세요" /></div>
          <div className="kus-field"><label htmlFor="visit_date">탐방 날짜</label><input className="kus-input" id="visit_date" name="visit_date" type="date" /></div>
          <div className="kus-field"><label htmlFor="status">상태</label>
            <select id="status" name="status" defaultValue="PLANNED"><option value="PLANNED">예정</option><option value="CONFIRMED">확정</option><option value="DONE">완료</option><option value="CANCELLED">취소</option></select></div>
          <div className="kus-field"><label htmlFor="source_note">확인 근거</label><span className="kus-help">공문, 협약, 담당자 확인 등. 비워 두면 학생 화면에 ‘확인 전’으로 보여요.</span><input className="kus-input" id="source_note" name="source_note" maxLength={200} /></div>
          <div className="kus-checks"><label><input type="checkbox" name="is_test" /> 테스트 기록 (학생 화면과 PDF에 테스트로 표시)</label></div>
          <div className="kus-actions"><button type="submit" className="kus-btn">탐방 등록</button></div>
        </form>
      </KusCard>
    </div>
  );
}
