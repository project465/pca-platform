import Link from "next/link";
import { requireKusStudent } from "@/lib/kus/access";
import { kusWorkspace } from "@/lib/kus/workspace";
import { kusAttempts } from "@/lib/kus/load";
import { examNameOf as examName } from "@/lib/kus/program";
import { KusCard, KusHead, KusShell } from "../shell";

export const dynamic = "force-dynamic";


/** 보고서 받기. 채점된 KUS 응시마다 PDF · 웹 두 길이 선다 */
export default async function KusReports() {
  const { user, me } = await requireKusStudent();
  const [w, rows] = await Promise.all([kusWorkspace(user, me), kusAttempts(user.id)]);
  const done = rows.filter((r) => r.status !== "in_progress");
  return (
    <KusShell active="/kus/report" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
      <KusHead kicker="보고서" title="개인 보고서"
        lead="검사 결과, 기업탐방 기록, 실행 계획을 A4 한 부로 묶었어요. 받을 때마다 최신 기록으로 다시 만들어요." />
      <KusCard>
        {done.length ? (
          <ul className="kus-rows">{done.map((r) => (
            <li key={r.id}><div className="kus-row">
              <span className="kus-row-main"><span className="kus-row-t">{examName(r.core_code)}</span><span className="kus-row-s">{r.submitted_at ?? "제출일 없음"} 제출</span></span>
              <span className="kus-actions">
                <a className="kus-btn is-sm" href={`/kus/report/${r.id}/pdf`}>PDF</a>
                <a className="kus-btn is-sm is-sub" href={`/kus/report/${r.id}`} target="_blank" rel="noreferrer">웹</a>
              </span>
            </div></li>))}</ul>
        ) : <><p className="kus-muted" style={{ marginTop: 0 }}>검사를 끝내면 보고서를 받을 수 있어요.</p>
          <div className="kus-actions" style={{ marginTop: 16 }}><Link className="kus-btn" href="/kus/assessment">검사하러 가기</Link></div></>}
      </KusCard>
    </KusShell>
  );
}
