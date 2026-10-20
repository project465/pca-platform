import Link from "next/link";
import { SectionHeader } from "@/app/me/ui";
import { requireKusStudent } from "@/lib/kus/access";
import { kusWorkspace } from "@/lib/kus/workspace";
import { kusAttempts } from "@/lib/kus/load";
import { core } from "@/lib/me-v3/core-registry";
import { KusHead, KusShell } from "../shell";

export const dynamic = "force-dynamic";

/**
 * 줄에 적는 검사 이름. Core 코드와 등급을 학생에게 적지 않는다: 학교 진입은 등급을 고르지 않고,
 * 코드는 우리 쪽 이름이다. 등록부에 없는 코드면 이름을 지어내지 않고 `전공 검사` 로 적는다.
 */
function examName(code: string | null): string {
  if (!code) return "전공 검사";
  /* 등록부에 없으면 이름을 지어내지 않는다 */
  try { return `${core(code).name_ko} 검사`; } catch { return "전공 검사"; }
}

/** 보고서 내려받기. 채점된 KUS 응시마다 웹 · PDF 두 길이 선다 */
export default async function KusReports() {
  const { user, me } = await requireKusStudent();
  const [w, rows] = await Promise.all([kusWorkspace(user, me), kusAttempts(user.id)]);
  const done = rows.filter((r) => r.status !== "in_progress");
  return (
    <KusShell active="/kus/report" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
      <KusHead kicker="보고서" title="개인 리포트 내려받기"
        lead="검사 결과 · 기업탐방 기록 · 실행 계획을 한 벌로 묶은 A4 리포트입니다. 내려받을 때마다 지금 기록으로 다시 만듭니다." />
      <section className="kus-panel">
        <SectionHeader icon="doc" title="내 리포트" />
        {done.length ? (
          <div className="kus-scroll"><table className="kus-table">
            <thead><tr><th>검사</th><th>제출</th><th>내려받기</th></tr></thead>
            <tbody>{done.map((r) => (
              <tr key={r.id}><td>{examName(r.core_code)}</td><td>{r.submitted_at ?? "—"}</td>
                <td><a className="cm-btn is-primary" href={`/kus/report/${r.id}/pdf`}>PDF</a>{" "}<a className="cm-btn" href={`/kus/report/${r.id}`} target="_blank" rel="noreferrer">웹</a></td></tr>))}</tbody>
          </table></div>
        ) : <><p className="cm-shsub">채점된 검사가 아직 없습니다.</p><Link className="cm-btn is-primary" href="/kus/assessment">검사로 가기</Link></>}
      </section>
    </KusShell>
  );
}
