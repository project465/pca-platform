import Link from "next/link";
import { requireKusStudent } from "@/lib/kus/access";
import { kusWorkspace } from "@/lib/kus/workspace";
import { kusAttempts } from "@/lib/kus/load";
import { MODE_NOTE, UNSUPPORTED_NOTE } from "@/lib/kus/analysis";
import { examNameOf as examName } from "@/lib/kus/program";
import { KusCard, KusHead, KusNote, KusShell } from "../shell";

export const dynamic = "force-dynamic";


/**
 * 검사 안내와 상태.
 *
 * **검사를 새로 만들지 않는다.** 시작 단추는 공통 학교 진입(`/campus/kus/start`)
 * 으로 가고, 거기서 학과를 다시 맞춰 본 뒤 공통 검사(`/v3/...`)가 열린다.
 * 문항 · 채점 · 저장 · 이어하기 · 제출 · 중복 제출 막기는 전부 공통 엔진의
 * 것이다. 학교 진입은 등급을 고르지 않는다(학생에게 등급을 적지 않는다).
 */
export default async function KusAssessment() {
  const { user, me } = await requireKusStudent();
  const [w, rows] = await Promise.all([kusWorkspace(user, me), kusAttempts(user.id)]);
  const note = w.unsupported ? UNSUPPORTED_NOTE : MODE_NOTE[w.mode];
  const open = w.mode !== "PREPARING";
  const state = w.st.kind === "resume" ? `${w.st.answered}문항까지 답했어요` : w.st.kind === "start" ? "아직 시작 전이에요" : "제출했어요";
  return (
    <KusShell active="/kus/assessment" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
      <KusHead kicker="검사" title={`${w.dept} 전공 검사`} lead={state} />
      {note ? <KusNote>{note}</KusNote> : null}
      <KusCard>
        <dl className="kus-kv" style={{ marginTop: 0 }}>
          <dt>걸리는 시간</dt><dd>30분쯤</dd>
          <dt>저장</dt><dd>답할 때마다 저장돼요. 나갔다 와도 이어서 할 수 있어요.</dd>
        </dl>
        <div className="kus-actions" style={{ marginTop: 20 }}>
          {w.st.kind === "resume" ? <Link className="kus-btn" href={`/v3/${w.st.attemptId}`}>이어서 답하기</Link>
            : w.st.kind === "start" ? (open ? <Link className="kus-btn" href="/campus/kus/start">검사 시작하기</Link> : <span className="kus-btn is-off">{w.unsupported ? "검사가 없어요" : "준비 중이에요"}</span>)
              : <Link className="kus-btn" href="/kus/result">분석 결과 보기</Link>}
        </div>
      </KusCard>
      {rows.length ? (
        <KusCard title="검사 기록">
          <ul className="kus-rows">{rows.map((r) => (
            <li key={r.id}><Link className="kus-row" href={r.status === "in_progress" ? `/v3/${r.id}` : `/v3/${r.id}/result`}>
              <span className="kus-row-main"><span className="kus-row-t">{examName(r.core_code)}</span>
                <span className="kus-row-s">{r.started_at} 시작{r.submitted_at ? ` · ${r.submitted_at} 제출` : ""}</span></span>
              <span className="kus-row-v">{r.status === "in_progress" ? "이어하기" : "공통 결과지"}</span>
            </Link></li>))}</ul>
        </KusCard>
      ) : null}
    </KusShell>
  );
}
