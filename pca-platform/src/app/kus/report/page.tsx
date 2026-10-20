import Link from "next/link";
import { SectionHeader } from "@/app/me/ui";
import { requireKusStudent } from "@/lib/kus/access";
import { kusWorkspace } from "@/lib/kus/workspace";
import { kusAttempts } from "@/lib/kus/load";
import { KusHead, KusShell } from "../shell";

export const dynamic = "force-dynamic";

/** 보고서 내려받기. 채점된 KUS 응시마다 웹 · PDF 두 길이 선다 */
export default async function KusReports() {
  const { user, me } = await requireKusStudent();
  const [w, rows] = await Promise.all([kusWorkspace(user, me), kusAttempts(user.id)]);
  const done = rows.filter((r) => r.status !== "in_progress");
  return (
    <KusShell active="/kus/report" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
      <KusHead kicker="보고서" title="개인 리포트 내려받기"
        lead="검사 결과 · 기업탐방 기록 · 실행 계획을 여덟 장으로 묶은 A4 리포트입니다. 내려받을 때마다 지금 기록으로 다시 만듭니다." />
      <section className="kus-panel">
        <SectionHeader icon="doc" title="내 리포트" />
        {done.length ? (
          <div className="kus-scroll"><table className="kus-table">
            <thead><tr><th>검사</th><th>제출</th><th>내려받기</th></tr></thead>
            <tbody>{done.map((r) => (
              <tr key={r.id}><td>{r.tier} · {r.core_code}</td><td>{r.submitted_at ?? "—"}</td>
                <td><a className="cm-btn is-primary" href={`/kus/report/${r.id}/pdf`}>PDF</a>{" "}<a className="cm-btn" href={`/kus/report/${r.id}`} target="_blank" rel="noreferrer">웹</a></td></tr>))}</tbody>
          </table></div>
        ) : <><p className="cm-shsub">채점된 검사가 아직 없습니다.</p><Link className="cm-btn is-primary" href="/kus/assessment">검사로 가기</Link></>}
      </section>
    </KusShell>
  );
}
