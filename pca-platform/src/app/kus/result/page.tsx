import Link from "next/link";
import { requireKusStudent } from "@/lib/kus/access";
import { kusWorkspace } from "@/lib/kus/workspace";
import { MODE_NOTE } from "@/lib/kus/analysis";
import { KusCard, KusHead, KusNote, KusShell } from "../shell";

export const dynamic = "force-dynamic";

const ZONE_CHIP: Record<string, string> = {
  Z1_EVIDENCE_ESTABLISHED: "is-green", Z2_EVIDENCE_INCOMPLETE: "is-blue",
  Z3_EVIDENCE_LOW_INTEREST: "", Z4_INSUFFICIENT_EVIDENCE: "is-amber",
};

/**
 * 개인별 결과. **공통 결과지를 대신하지 않는다**: 같은 굳은 결과를 KUS 의 차례로 다시 묶는다.
 *
 * 차례(R3): 머리 → 다음에 할 일 → 결과의 근거(센 수 넷) → 영역별 상태 → 내가 남긴 근거(접음)
 * → 더 준비할 것 → 관심 산업·직무 → 직무와 맞춰 보기 → 기업탐방 기록.
 * 카드마다 제목 하나 · 설명은 한 줄을 넘기지 않고, 읽는 법 같은 안내는 맨 아래 한 줄로 모은다.
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
        <KusHead kicker="분석 결과" title="아직 결과가 없어요" lead="검사를 끝내면 여기에서 볼 수 있어요." />
        {note ? <KusNote>{note}</KusNote> : null}
        <div className="kus-actions"><Link className="kus-btn" href="/kus/assessment">검사하러 가기</Link></div>
      </KusShell>
    );
  }
  const r = a.reliability;
  const c = a.status.counts;
  const a0 = a.actions[0];
  const chainOf = a.deep.filter((d) => d.chain.did.length || d.chain.decided.length || d.chain.artifacts.length || d.chain.verifications.length);
  const list = (xs: string[]) => xs.length ? xs.join(" / ") : "아직 없어요";
  return (
    <KusShell active="/kus/result" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
      <KusHead kicker={`${a.student.coreName} 검사 · ${w.bundle.resultAt ?? ""}`}
        badge={<span className={`kus-chip ${a.status.badge === "근거 확인 전" ? "is-red" : "is-blue"}`}>{a.status.badge}</span>}
        title={a.status.title} lead={a.status.lead} />
      {note ? <KusNote>{note}</KusNote> : null}

      <section className="kus-card kus-next" aria-label="다음에 할 일">
        <p className="kus-next-k">다음에 할 일{a0?.domain ? ` · ${a0.domain}` : ""}</p>
        <p className="kus-next-do">{a0 ? a0.do : "지금은 정해진 할 일이 없어요. 기업탐방 기록부터 남겨 보세요."}</p>
        <div className="kus-actions">
          <Link className="kus-btn" href="/kus/plan">30·60·90일 계획 보기</Link>
          <a className="kus-btn is-sub" href={`/kus/report/${w.bundle.attemptId}/pdf`}>PDF 받기</a>
          <Link className="kus-textlink" href={`/v3/${w.bundle.attemptId}/result`}>공통 결과지</Link>
        </div>
      </section>

      <KusCard title="결과의 근거" sub={r.label}>
        <div className="kus-nums">
          <div className="kus-num"><b>{c.confirmed}개</b><span>해 봤다고 답한 판단</span></div>
          <div className="kus-num"><b>{c.owned}개</b><span>직접 정했고 근거도 있는 판단</span></div>
          <div className="kus-num"><b>{c.evidence}개</b><span>고른 근거</span></div>
          <div className="kus-num"><b>{c.ready_domains}개</b><span>근거가 충분한 영역</span></div>
        </div>
        <dl className="kus-kv">
          <dt>응답 패턴</dt><dd>{a.status.quality.text}</dd>
          {a.status.badge !== a.status.coreBadge || r.basis === "SELF_REPORT_ONLY"
            ? <><dt>공통 결과지 표기</dt><dd>{a.status.coreBadge}</dd></> : null}
        </dl>
        {r.caution ? <p className="kus-caution">{r.caution}</p> : null}
      </KusCard>

      <KusCard title="영역별 상태" sub={`이번 검사에서 본 영역 ${c.opened}개`}>
        <ul className="kus-rows">{a.deep.map((d) => {
          const shown = d.axes.filter((x) => x.state !== "NOT_OBSERVED").length;
          return (
            <li key={d.code} className="kus-row" style={{ display: "block" }}>
              <p className="kus-dom-line"><b>{d.name}</b><span className={`kus-chip ${ZONE_CHIP[d.zone] ?? ""}`}>{d.zoneKo}</span></p>
              <p className="kus-dom-s">확인된 판단 {shown}/8{d.interest ? ` · ${d.interest}` : ""}{d.experience ? ` · ${d.experience}` : ""}</p>
              {d.missingRequired.length
                ? <p className="kus-dom-m">더 필요한 판단: {d.missingRequired.join(", ")}</p>
                : <p className="kus-dom-ok">{r.basis === "SELF_REPORT_ONLY" ? "꼭 볼 판단은 응답으로만 있어요" : "꼭 볼 판단은 다 있어요"}</p>}
              {d.roles.length ? <p className="kus-dom-s">관련 직무: {d.roles.join(", ")}</p> : null}
            </li>
          );
        })}</ul>
        {a.major.notAsked.length ? <p className="kus-foot">이번에 묻지 않은 영역: {a.major.notAsked.join(", ")}</p> : null}
      </KusCard>

      <KusCard title="내가 남긴 근거" sub="검사에서 직접 고른 항목 그대로예요.">
        {chainOf.length ? chainOf.map((d, i) => (
          <details key={d.code} className="kus-fold" open={i === 0}>
            <summary><b>{d.name}</b><span className={`kus-chip ${ZONE_CHIP[d.zone] ?? ""}`}>{d.zoneKo}</span></summary>
            <div className="kus-fold-body">
              <dl className="kus-chain">
                <dt>한 일</dt><dd>{list(d.chain.did)}</dd>
                <dt>직접 정한 것</dt><dd>{list(d.chain.decided)}</dd>
                <dt>남은 결과</dt><dd>{list(d.chain.artifacts)}</dd>
                <dt>견줘 본 것</dt><dd>{list(d.chain.verifications)}</dd>
              </dl>
            </div>
          </details>
        )) : <p className="kus-muted">아직 고른 근거가 없어요. 해 본 과제 하나를 떠올려 직접 정한 것과 남은 결과를 골라 보세요.</p>}
        <p className="kus-foot">경험 입력 {a.evidence.experiences.length}건 · 기업탐방 기록 {a.evidence.visitsObserved}건</p>
      </KusCard>

      <KusCard title="더 준비할 것">
        {a.gaps.length ? (
          <ul className="kus-rows">{a.gaps.map((g) => (
            <li key={g.domains + g.title} className="kus-row" style={{ display: "block" }}>
              <span className="kus-row-t">{g.title}</span>
              <span className="kus-row-s">{g.domains}</span>
              <span className="kus-row-s">{g.why}</span>
            </li>))}</ul>
        ) : <p className="kus-muted">크게 비어 있는 곳은 없어요.</p>}
      </KusCard>

      <KusCard title="관심 산업·직무">
        <p className="kus-sub-h">산업</p>
        {a.interests.industries.length ? <ul className="kus-tags">{a.interests.industries.map((i) => <li key={i.name} className={i.from === "PICKED" ? "is-pick" : ""}>{i.name}</li>)}</ul> : <p className="kus-muted">아직 없어요</p>}
        <p className="kus-sub-h">직무</p>
        {a.interests.roles.length ? <ul className="kus-tags">{a.interests.roles.map((x) => <li key={x.code} className={x.from === "PICKED" ? "is-pick" : ""}>{x.name}</li>)}</ul> : <p className="kus-muted">아직 없어요</p>}
        <p className="kus-foot">파란 칸은 직접 고른 것이고, 회색 칸은 확인된 영역에서 이어진 것이에요.</p>
      </KusCard>

      <KusCard title="직무와 맞춰 보기" sub={a.link.role ? `${a.link.role} 직무가 중요하게 보는 영역` : "맞춰 볼 직무가 아직 없어요"}>
        {a.link.rows.length ? a.link.rows.map((x) => (
          <details key={x.domain} className="kus-fold">
            <summary><span className="kus-row-main"><span className="kus-row-t">{x.domain}{x.all ? <> <span className="kus-chip">{x.hit}/{x.all}</span></> : null}</span>
              <span className="kus-row-s">{x.next}</span></span></summary>
            <div className="kus-fold-body">
              <dl className="kus-chain">
                <dt>보는 판단</dt><dd>{x.needs}</dd>
                <dt>지금 상태</dt><dd>{x.state}</dd>
              </dl>
            </div>
          </details>
        )) : null}
      </KusCard>

      <KusCard title="기업탐방 기록" more={{ href: "/kus/visits", label: "전체" }}>
        {a.visits.length ? a.visits.map((v) => (
          <details key={v.id} className="kus-fold">
            <summary>
              <span className="kus-row-main"><span className="kus-row-t">{v.company}{v.test ? <> <span className="kus-chip is-red">테스트</span></> : null}</span>
                <span className="kus-row-s">{v.on ?? "날짜 미기록"} · {v.did.length ? "직접 해 봄" : "관찰"}{v.confirmed ? "" : " · 기업 확인 전"}{v.linked ? " · 경험으로 옮김" : ""}</span></span>
            </summary>
            <div className="kus-fold-body">
              <dl className="kus-chain">
                <dt>본 것</dt><dd>{list(v.observed)}</dd>
                <dt>해 본 것</dt><dd>{v.did.length ? v.did.join(" / ") : "관찰만 했어요"}</dd>
                <dt>확인할 것</dt><dd>{v.verify.length ? v.verify.join(" ") : "이어 둔 전공 영역이 없어요."}</dd>
              </dl>
            </div>
          </details>
        )) : <p className="kus-muted">아직 탐방 기록이 없어요.</p>}
      </KusCard>

      <p className="kus-foot">숫자는 점수가 아니라 개수예요. 백분위, 적합도, 합격 가능성은 계산하지 않아요. 기업탐방 기록은 결과에 바로 들어가지 않고, 경험으로 옮긴 활동만 다음 분석에 들어가요.</p>
    </KusShell>
  );
}
