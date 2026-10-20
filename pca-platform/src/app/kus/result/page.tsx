import Link from "next/link";
import { SectionHeader } from "@/app/me/ui";
import { requireKusStudent } from "@/lib/kus/access";
import { kusWorkspace } from "@/lib/kus/workspace";
import { MODE_NOTE } from "@/lib/kus/analysis";
import { KusHead, KusNote, KusShell } from "../shell";

export const dynamic = "force-dynamic";

const ZC: Record<string, string> = {
  Z1_EVIDENCE_ESTABLISHED: "z1", Z2_EVIDENCE_INCOMPLETE: "z2",
  Z3_EVIDENCE_LOW_INTEREST: "z3", Z4_INSUFFICIENT_EVIDENCE: "z4",
};

/**
 * 개인별 결과. **공통 결과지를 대신하지 않는다**: 같은 굳은 결과를 KUS
 * 프로그램의 차례(현재 상태 → 전공 역량 → Evidence → 관심 산업·직무 →
 * 직무 요구와 연결 → 준비할 영역 → 다음 행동)로 다시 묶고, 탐방 기록을
 * 판정 밖의 관찰로 옆에 놓는다. 전체 결과지는 링크 하나로 간다.
 *
 * 검사가 재지 않은 축이나 점수를 만들지 않는다. 값은 전부 `kusAnalysis`.
 */
export default async function KusResult() {
  const { user, me } = await requireKusStudent();
  const w = await kusWorkspace(user, me);
  const a = w.bundle?.analysis ?? null;
  const note = MODE_NOTE[w.mode];

  if (!a || !w.bundle) {
    return (
      <KusShell active="/kus/result" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
        <KusHead kicker="나의 분석 결과" title="아직 결과가 없어요" lead="검사를 끝내면 이 자리에 개인별 분석이 섭니다." />
        {note ? <KusNote>{note}</KusNote> : null}
        <div className="kus-actions"><Link className="cm-btn is-primary" href="/kus/assessment">검사로 가기</Link></div>
      </KusShell>
    );
  }
  const c = a.status.counts;
  return (
    <KusShell active="/kus/result" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
      <KusHead kicker={`나의 분석 결과 · ${a.student.coreName} 검사(${a.tier}) · 결과 확정 ${w.bundle.resultAt ?? ""}`}
        title={a.status.title} lead={a.status.lead}
        actions={<>
          <a className="cm-btn is-primary" href={`/kus/report/${w.bundle.attemptId}/pdf`}>PDF 보고서</a>
          <Link className="cm-btn" href={`/v3/${w.bundle.attemptId}/result`}>공통 결과지 전체</Link>
        </>} />
      {note ? <KusNote>{note}</KusNote> : null}
      {a.status.quality.flag !== "OK" ? <KusNote tone="info">응답 품질: {a.status.quality.text}</KusNote> : null}

      <div className="kus-stats">
        <div className="kus-stat"><span className="kus-stat-k">지금 상태</span><span className="kus-stat-v">{a.status.badge}</span></div>
        <div className="kus-stat"><span className="kus-stat-k">확인된 판단</span><span className="kus-stat-v">{c.confirmed}칸</span><span className="kus-stat-s">직접 정한 판단 {c.owned}칸</span></div>
        <div className="kus-stat"><span className="kus-stat-k">근거</span><span className="kus-stat-v">{c.evidence}개</span><span className="kus-stat-s">근거가 선 영역 {c.ready_domains}개</span></div>
        <div className="kus-stat"><span className="kus-stat-k">기업탐방</span><span className="kus-stat-v">{a.visits.length}건</span><span className="kus-stat-s">판정에 들어가지 않는 관찰 기록</span></div>
      </div>
      <p className="cm-shsub">점수가 아니라 센 수입니다. 백분위 · 적합도 · 합격 가능성을 만들지 않습니다.</p>

      <section className="kus-panel">
        <SectionHeader icon="layers" title="전공 관련 역량" sub={`${a.student.coreName} 검사가 연 ${c.opened}개 영역`} />
        <div className="kus-scroll"><table className="kus-table">
          <thead><tr><th>영역</th><th>상태</th><th>확인 칸</th><th>응답에서 확인된 예</th></tr></thead>
          <tbody>{a.major.rows.map((r) => (
            <tr key={r.code}><td><b>{r.name}</b></td><td><span className={`kus-zone ${ZC[r.zone] ?? ""}`}>{r.zoneKo}</span></td>
              <td>{r.axes}{r.owned ? ` (직접 ${r.owned})` : ""}</td><td>{r.example ?? "—"}</td></tr>))}</tbody>
        </table></div>
        {a.major.notAsked.length ? <p className="cm-shsub">이번 검사에서 묻지 않은 영역: {a.major.notAsked.join(" · ")}</p> : null}
      </section>

      <div className="kus-cols">
        <section className="kus-panel">
          <SectionHeader icon="check" title="경험 및 Evidence" />
          <h3 className="kus-h3">근거가 선 것</h3>
          {a.evidence.ready.length ? <ul>{a.evidence.ready.map((g) => <li key={g.domain}><b>{g.domain}</b> — {g.picks.join(" / ")}</li>)}</ul> : <p className="cm-shsub">아직 없습니다.</p>}
          <h3 className="kus-h3">해 봤고 정리가 남은 것</h3>
          {a.evidence.partial.length ? <ul>{a.evidence.partial.map((g) => <li key={g.domain}><b>{g.domain}</b>{g.picks.length ? ` — ${g.picks.join(" / ")}` : " (고른 근거 아직 없음)"}</li>)}</ul> : <p className="cm-shsub">아직 없습니다.</p>}
          <p className="cm-shsub">공통 경험 입력 {a.evidence.experiences.length}건 · 탐방 기록 {a.evidence.visitsObserved}건(경험으로 옮김 {a.evidence.visitsLinked}건)</p>
        </section>
        <section className="kus-panel">
          <SectionHeader icon="compass" title="관심 산업·직무" />
          <h3 className="kus-h3">산업</h3>
          {a.interests.industries.length ? <ul className="kus-chips">{a.interests.industries.map((i) => <li key={i.name} className={i.from === "PICKED" ? "is-pick" : ""}>{i.name}<small>{i.from === "PICKED" ? "고름" : "판단에서 이어짐"}</small></li>)}</ul> : <p className="cm-shsub">없음</p>}
          <h3 className="kus-h3">직무</h3>
          {a.interests.roles.length ? <ul className="kus-chips">{a.interests.roles.map((r) => <li key={r.code} className={r.from === "PICKED" ? "is-pick" : ""}>{r.name}<small>{r.from === "PICKED" ? "고름" : "판단에서 이어짐"}</small></li>)}</ul> : <p className="cm-shsub">없음</p>}
          <p className="cm-shsub">관심만으로 직무를 잇지 않고, 특정 기업을 추천하지 않습니다.</p>
        </section>
      </div>

      <section className="kus-panel">
        <SectionHeader icon="ladder" title="역량과 직무 요구사항의 연결" sub={a.link.role ? `${a.link.role} 직무가 직접 정하는 영역` : "이어 볼 직무가 아직 없습니다"} />
        {a.link.rows.length ? (
          <div className="kus-scroll"><table className="kus-table">
            <thead><tr><th>영역</th><th>그 직무가 보는 판단</th><th>지금 상태</th><th>다음 할 일</th></tr></thead>
            <tbody>{a.link.rows.map((r) => (
              <tr key={r.domain}><td><b>{r.domain}</b></td><td>{r.needs}</td><td>{r.state}{r.all ? ` · ${r.hit}/${r.all}` : ""}</td><td>{r.next}</td></tr>))}</tbody>
          </table></div>
        ) : null}
      </section>

      <div className="kus-cols">
        <section className="kus-panel">
          <SectionHeader icon="alert" title="준비가 필요한 영역" />
          {a.gaps.length ? <ol className="kus-todo">{a.gaps.map((g) => <li key={g.domains + g.title}><div><b>{g.domains}</b><small>{g.title} — {g.why}</small></div></li>)}</ol> : <p className="cm-shsub">결과가 적은 빈자리가 없습니다.</p>}
        </section>
        <section className="kus-panel">
          <SectionHeader icon="bolt" title="다음 행동 제안" moreHref="/kus/plan" moreLabel="실행 계획" />
          {a.actions.length ? <ol className="kus-todo">{a.actions.slice(0, 4).map((x) => <li key={x.do}><div><b>{x.domain ?? "전체"}</b><small>{x.do}</small></div></li>)}</ol> : <p className="cm-shsub">결과 모델이 낸 할 일이 없습니다.</p>}
        </section>
      </div>

      <section className="kus-panel">
        <SectionHeader icon="building" title="탐방 경험과 직무 연결" moreHref="/kus/visits" moreLabel="기록 전체" />
        {a.visits.length ? a.visits.map((v) => (
          <div key={v.id} className="kus-visit">
            <p className="kus-visit-h"><b>{v.company}</b>
              {v.test ? <span className="kus-pill is-test">테스트</span> : null}
              {!v.confirmed ? <span className="kus-pill is-warn">기업 확인 전</span> : null}
              <span className={`kus-pill ${v.did.length ? "is-ok" : ""}`}>{v.did.length ? "직접 해 봄" : "관찰"}</span>
              {v.linked ? <span className="kus-pill is-go">경험으로 옮김</span> : null}
              <time>{v.on ?? ""}</time></p>
            <dl className="kus-kv">
              <dt>관찰한 직무</dt><dd>{v.roles.join(", ") || "—"}</dd>
              <dt>이은 전공 영역</dt><dd>{v.domains.length ? v.domains.map((d) => `${d.name}(검사: ${d.zoneKo})`).join(" · ") : "—"}</dd>
            </dl>
          </div>
        )) : <p className="cm-shsub">아직 탐방 기록이 없습니다.</p>}
        <p className="cm-shsub">탐방 기록은 검사 상태를 바꾸지 않습니다. 직접 해 본 활동은 경험으로 옮겨야 판정에 들어갑니다.</p>
      </section>
    </KusShell>
  );
}
