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
const BASIS: Record<string, string> = { SELF_REPORT_ONLY: "is-b0", PARTLY_BACKED: "is-b1", BACKED: "is-b2" };

/**
 * 개인별 결과. **공통 결과지를 대신하지 않는다**: 같은 굳은 결과를 KUS 의 차례로 다시 묶는다.
 *
 * **R2 에서 차례를 바꿨다.** R1 화면은 통계 카드 넷 → 표 → 절 여섯이 같은 무게로 늘어서
 * 손전화에서 7,600px 를 넘었고, 다음 행동이 쪽 아래쪽에 있었다. 지금은
 *   1. 머리: 그 사람의 상태 한 줄과 **다음 한 가지** (3~5초 안에 읽히는 자리)
 *   2. 이 결과가 무엇에 기대는가(응답 · 근거 · 응답 품질) — CONTRA 가 여기서 갈린다
 *   3. 영역마다 지금 상태(카드). 근거 사슬은 접어 둔다
 *   4. 준비할 것 · 관심 산업과 직무 · 직무 연결 · 탐방은 그 아래
 * 표는 손전화에서 카드로 바뀐다(`kus-rows`): 칸이 잘려 뜻이 사라지는 일이 없다.
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
  const r = a.reliability;
  const a0 = a.actions[0];
  const chainOf = a.deep.filter((d) => d.chain.did.length || d.chain.decided.length || d.chain.artifacts.length || d.chain.verifications.length);
  return (
    <KusShell active="/kus/result" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
      <KusHead kicker={`나의 분석 결과 · ${a.student.coreName} 검사 · 결과 확정 ${w.bundle.resultAt ?? ""}`}
        title={a.status.title} lead={a.status.lead} />
      {note ? <KusNote>{note}</KusNote> : null}

      <section className="kus-r-next" aria-label="다음 한 가지">
        <p className="kus-r-badge"><span className="kus-pill is-go">{a.status.badge}</span></p>
        {a0 ? (
          <>
            <p className="kus-r-k">다음 한 가지{a0.domain ? ` · ${a0.domain}` : ""}</p>
            <p className="kus-r-do">{a0.do}</p>
          </>
        ) : <p className="kus-r-do">결과 모델이 낸 할 일이 없습니다. 탐방 기록부터 남겨 둘 수 있습니다.</p>}
        <div className="kus-actions">
          <Link className="cm-btn is-primary" href="/kus/plan">30·60·90일 계획</Link>
          <a className="cm-btn" href={`/kus/report/${w.bundle.attemptId}/pdf`}>PDF 보고서</a>
          <Link className="kus-r-link" href={`/v3/${w.bundle.attemptId}/result`}>공통 결과지 전체</Link>
        </div>
      </section>

      <section className={`kus-rel ${BASIS[r.basis] ?? ""}`} aria-label="이 결과가 기대고 있는 것">
        <p className="kus-rel-h">이 결과가 기대고 있는 것 · <b>{r.label}</b></p>
        <dl className="kus-rel-g">{r.lines.map((l) => <div key={l.k}><dt>{l.k}</dt><dd>{l.v}</dd></div>)}</dl>
        {r.caution ? <p className="kus-rel-c">{r.caution}</p> : null}
        <p className="kus-rel-n">점수가 아니라 센 수입니다. 백분위 · 적합도 · 합격 가능성을 만들지 않습니다.</p>
      </section>

      <section className="kus-panel">
        <SectionHeader icon="layers" title="영역마다 지금 상태" sub={`${a.student.coreName} 검사가 연 ${a.status.counts.opened}개 영역`} />
        <ul className="kus-dom">{a.deep.map((d) => {
          const shown = d.axes.filter((x) => x.state !== "NOT_OBSERVED");
          return (
            <li key={d.code}>
              <p className="kus-dom-h"><b>{d.name}</b><span className={`kus-zone ${ZC[d.zone] ?? ""}`}>{d.zoneKo}</span></p>
              <p className="kus-dom-s">응답에서 확인된 판단 {shown.length}/8{d.interest ? ` · ${d.interest}` : ""}{d.experience ? ` · ${d.experience}` : ""}</p>
              {d.missingRequired.length
                ? <p className="kus-dom-m">꼭 볼 판단 가운데 비어 있음: {d.missingRequired.join(" · ")}</p>
                : <p className="kus-dom-ok">{r.basis === "SELF_REPORT_ONLY" ? "꼭 볼 판단이 응답으로만 확인됨(근거 항목 없음)" : "꼭 볼 판단이 다 확인됨"}</p>}
              {d.roles.length ? <p className="kus-dom-r">이 영역이 중심인 직무: {d.roles.join(" · ")}</p> : null}
            </li>
          );
        })}</ul>
        {a.major.notAsked.length ? <p className="cm-shsub">이번 검사에서 묻지 않은 영역: {a.major.notAsked.join(" · ")}</p> : null}
      </section>

      <section className="kus-panel">
        <SectionHeader icon="check" title="근거 사슬" sub="한 일 → 직접 정한 것 → 남긴 것 → 무엇과 견줬나. 칸의 글은 응답에서 고른 항목 그대로입니다." />
        {chainOf.length ? chainOf.map((d, i) => (
          <details key={d.code} className="kus-chain" open={i === 0}>
            <summary><b>{d.name}</b><span className={`kus-zone ${ZC[d.zone] ?? ""}`}>{d.zoneKo}</span></summary>
            <dl className="kus-chain-g">
              <div><dt>한 일</dt><dd>{d.chain.did.join(" / ") || "고른 항목 없음"}</dd></div>
              <div><dt>직접 정한 것</dt><dd>{d.chain.decided.join(" / ") || "고른 항목 없음"}</dd></div>
              <div><dt>남긴 것</dt><dd>{d.chain.artifacts.join(" / ") || "고른 항목 없음"}</dd></div>
              <div><dt>무엇과 견줬나</dt><dd>{d.chain.verifications.join(" / ") || "고른 항목 없음"}</dd></div>
            </dl>
          </details>
        )) : <p className="cm-shsub">응답에서 고른 근거 항목이 없습니다. 해 본 과제 하나를 골라 무엇을 정했고 무엇이 남았는지 근거로 고르면 이 자리가 섭니다.</p>}
        <p className="cm-shsub">공통 경험 입력 {a.evidence.experiences.length}건 · 탐방 기록 {a.evidence.visitsObserved}건(경험으로 옮김 {a.evidence.visitsLinked}건). 탐방 기록은 판정에 들어가지 않습니다.</p>
      </section>

      <div className="kus-cols">
        <section className="kus-panel">
          <SectionHeader icon="alert" title="준비가 필요한 영역" />
          {a.gaps.length ? <ol className="kus-todo">{a.gaps.map((g) => <li key={g.domains + g.title}><div><b>{g.domains}</b><small>{g.title} — {g.why}</small></div></li>)}</ol> : <p className="cm-shsub">결과가 적은 빈자리가 없습니다.</p>}
        </section>
        <section className="kus-panel">
          <SectionHeader icon="compass" title="관심 산업·직무" />
          <h3 className="kus-h3">산업</h3>
          {a.interests.industries.length ? <ul className="kus-chips">{a.interests.industries.map((i) => <li key={i.name} className={i.from === "PICKED" ? "is-pick" : ""}>{i.name}<small>{i.from === "PICKED" ? "고름" : "확인된 영역에서 이어짐"}</small></li>)}</ul> : <p className="cm-shsub">없음</p>}
          <h3 className="kus-h3">직무</h3>
          {a.interests.roles.length ? <ul className="kus-chips">{a.interests.roles.map((x) => <li key={x.code} className={x.from === "PICKED" ? "is-pick" : ""}>{x.name}<small>{x.from === "PICKED" ? "고름" : "확인된 영역에서 이어짐"}</small></li>)}</ul> : <p className="cm-shsub">없음</p>}
          <p className="cm-shsub">관심만으로 직무를 잇지 않고, 특정 기업을 추천하지 않습니다.</p>
        </section>
      </div>

      <section className="kus-panel">
        <SectionHeader icon="ladder" title="직무 요구사항과의 연결" sub={a.link.role ? `${a.link.role} 직무의 중심 영역` : "이어 볼 직무가 아직 없습니다"} />
        {a.link.rows.length ? (
          <ul className="kus-rows">{a.link.rows.map((x) => (
            <li key={x.domain}>
              <details>
                <summary><span className="kus-rows-h"><b>{x.domain}</b>{x.all ? <span className="kus-rows-n">확인 {x.hit}/{x.all}</span> : null}</span>
                  <span className="kus-rows-next">{x.next}</span></summary>
                <dl>
                  <div><dt>그 직무가 보는 판단</dt><dd>{x.needs}</dd></div>
                  <div><dt>지금 상태</dt><dd>{x.state}</dd></div>
                </dl>
              </details>
            </li>))}</ul>
        ) : null}
        <p className="cm-shsub">중심 영역은 그 Core 의 관계표에서 왔고 기업 채용 자료가 아닙니다.</p>
      </section>

      <section className="kus-panel">
        <SectionHeader icon="building" title="탐방 경험과 직무 연결" moreHref="/kus/visits" moreLabel="기록 전체" />
        {a.visits.length ? a.visits.map((v) => (
          <div key={v.id} className="kus-visit">
            <p className="kus-visit-h"><b>{v.company}</b>
              {v.test ? <span className="kus-pill is-test">테스트</span> : null}
              {!v.confirmed ? <span className="kus-pill is-warn">기업 확인 전</span> : null}
              <span className={`kus-pill ${v.did.length ? "is-ok" : ""}`}>{v.did.length ? "직접 해 봄" : "관찰만"}</span>
              {v.linked ? <span className="kus-pill is-go">경험으로 옮김</span> : null}
              <time>{v.on ?? ""}</time></p>
            <dl className="kus-chain-g">
              <div><dt>본 것</dt><dd>{v.observed.join(" / ") || "—"}</dd></div>
              <div><dt>직접 해 본 것</dt><dd>{v.did.join(" / ") || "없음 · 관찰만 했습니다"}</dd></div>
              <div><dt>확인할 것</dt><dd>{v.verify.length ? v.verify.join(" ") : "이은 전공 영역이 없어 검사 상태와 견줄 수 없습니다."}</dd></div>
            </dl>
          </div>
        )) : <p className="cm-shsub">아직 탐방 기록이 없습니다.</p>}
        <p className="cm-shsub">탐방 기록은 검사 상태를 바꾸지 않습니다. 직접 해 본 활동은 경험으로 옮겨야 판정에 들어갑니다.</p>
      </section>
    </KusShell>
  );
}
