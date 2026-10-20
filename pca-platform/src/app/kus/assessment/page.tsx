import Link from "next/link";
import { SectionHeader } from "@/app/me/ui";
import { requireKusStudent } from "@/lib/kus/access";
import { kusWorkspace } from "@/lib/kus/workspace";
import { kusAttempts } from "@/lib/kus/load";
import { MODE_NOTE } from "@/lib/kus/analysis";
import { KusHead, KusNote, KusShell } from "../shell";

export const dynamic = "force-dynamic";

/**
 * 검사 안내와 상태.
 *
 * **검사를 새로 만들지 않는다.** 시작 단추는 공통 학교 진입(`/campus/kus/start`)
 * 으로 가고, 거기서 학과를 다시 맞춰 본 뒤 공통 검사(`/v3/...`)가 열린다.
 * 문항 · 채점 · 저장 · 이어하기 · 제출 · 중복 제출 막기는 전부 공통 엔진의
 * 것이다. 학교 진입은 등급을 고르지 않고 늘 PRO 로 연다(공통 규칙).
 */
export default async function KusAssessment() {
  const { user, me } = await requireKusStudent();
  const [w, rows] = await Promise.all([kusWorkspace(user, me), kusAttempts(user.id)]);
  const note = MODE_NOTE[w.mode];
  const open = w.mode !== "PREPARING";
  return (
    <KusShell active="/kus/assessment" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
      <KusHead kicker="검사" title={`${w.dept} 전공 검사`}
        lead="학교에 등록된 학과 기준으로 공통 전공 검사를 봅니다. 답은 문항마다 저장되고, 나갔다가 다시 들어오면 멈춘 화면에서 이어집니다." />
      {note ? <KusNote>{note}</KusNote> : null}
      <section className="kus-panel">
        <SectionHeader icon="clipboard" title="지금 상태" />
        <dl className="kus-kv">
          <dt>검사</dt><dd>{w.st.kind === "resume" ? `진행 중 · ${w.st.answered}문항 답함` : w.st.kind === "start" ? "시작 전" : "제출 완료"}</dd>
          <dt>등급</dt><dd>PRO (학교 진입 검사는 등급을 고르지 않습니다)</dd>
          <dt>걸리는 시간</dt><dd>대략 25~35분. 한 번에 끝내지 않아도 됩니다.</dd>
          <dt>저장</dt><dd>문항마다 서버에 저장 · 이어하기 · 제출은 한 번만 반영</dd>
        </dl>
        <div className="kus-actions" style={{ marginTop: 14 }}>
          {w.st.kind === "resume" ? <Link className="cm-btn is-primary" href={`/v3/${w.st.attemptId}`}>이어서 답하기</Link>
            : w.st.kind === "start" ? (open ? <Link className="cm-btn is-primary" href="/campus/kus/start">검사 시작하기</Link> : <span className="cm-btn is-off">준비 중</span>)
              : <Link className="cm-btn is-primary" href="/kus/result">나의 분석 결과</Link>}
          {w.st.kind !== "start" && w.st.kind !== "resume" ? <Link className="cm-btn" href={`/v3/${w.st.attemptId}/result`}>공통 결과지 전체</Link> : null}
        </div>
      </section>
      <section className="kus-panel">
        <SectionHeader icon="log" title="응시 기록" />
        {rows.length ? (
          <div className="kus-scroll"><table className="kus-table">
            <thead><tr><th>응시</th><th>시작</th><th>제출</th><th>상태</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}><td>{r.tier} · {r.core_code}</td><td>{r.started_at}</td><td>{r.submitted_at ?? "—"}</td>
                <td>{r.status === "in_progress" ? <Link href={`/v3/${r.id}`}>진행 중 · 이어하기</Link> : <Link href={`/v3/${r.id}/result`}>결과</Link>}</td></tr>))}
            </tbody></table></div>
        ) : <p className="cm-shsub">아직 응시 기록이 없습니다.</p>}
      </section>
    </KusShell>
  );
}
