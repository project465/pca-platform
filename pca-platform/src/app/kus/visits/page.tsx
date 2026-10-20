import Link from "next/link";
import { SectionHeader } from "@/app/me/ui";
import { requireKusStudent } from "@/lib/kus/access";
import { kusWorkspace } from "@/lib/kus/workspace";
import { activityLabel, didSomething } from "@/lib/kus/visits";
import { domainName, roleName } from "@/lib/me-v3/runtime/session";
import { KusHead, KusNote, KusShell } from "../shell";

export const dynamic = "force-dynamic";

/** 기업탐방 기록 목록. **이 사람의 기록만** 읽는다(`visitsOf` 가 `user_id` 로 거른다) */
export default async function KusVisits({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { user, me } = await requireKusStudent();
  const w = await kusWorkspace(user, me);
  const sp = await searchParams;
  return (
    <KusShell active="/kus/visits" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
      <KusHead kicker="기업탐방 프로그램" title="기업탐방 기록"
        lead="방문한 기업 · 관찰한 직무 · 이해한 것 · 직접 해 본 활동 · 새로 알게 된 것을 남기고, 전공과 관심 직무에 잇습니다."
        actions={<Link className="cm-btn is-primary" href="/kus/visits/new">새 탐방 기록</Link>} />
      {sp.deleted ? <KusNote tone="info">기록을 지웠습니다.</KusNote> : null}
      <KusNote tone="info">방문했다는 사실만으로 직무 역량을 판정하지 않습니다. 직접 해 본 활동은 공통 경험 입력으로 옮겨야 판정에 들어갑니다.</KusNote>
      <section className="kus-panel">
        <SectionHeader icon="building" title={`내 기록 ${w.visits.length}건`} />
        {w.visits.length ? w.visits.map((v) => (
          <Link key={v.id} href={`/kus/visits/${v.id}`} className="kus-visit" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <p className="kus-visit-h"><b>{v.company_name}</b>
              {v.is_test ? <span className="kus-pill is-test">테스트</span> : null}
              {!v.confirmed ? <span className="kus-pill is-warn">기업 확인 전</span> : null}
              <span className={`kus-pill ${didSomething(v) ? "is-ok" : ""}`}>{didSomething(v) ? "직접 해 봄" : "관찰"}</span>
              {v.experience_id ? <span className="kus-pill is-go">경험으로 옮김</span> : null}
              <time>{v.visited_on ?? "날짜 미기록"}</time></p>
            <dl className="kus-kv">
              <dt>관찰한 직무</dt><dd>{[...v.role_codes.map((c) => roleName(v.core_code ?? "", c)), ...(v.role_text ? [v.role_text] : [])].join(", ") || "—"}</dd>
              <dt>한 활동</dt><dd>{v.activities.map(activityLabel).join(" / ")}</dd>
              <dt>이은 영역</dt><dd>{v.td_codes.map((t) => domainName(v.core_code ?? "", t)).join(" · ") || "—"}</dd>
            </dl>
          </Link>
        )) : <p className="cm-shsub">아직 남긴 기록이 없습니다. 탐방을 다녀온 날 바로 적어 두면 자기소개서·면접 초안으로 쓸 수 있습니다.</p>}
      </section>
      <section className="kus-panel">
        <SectionHeader icon="clock" title="등록된 탐방" />
        {w.programs.length ? (
          <ul>{w.programs.map((p) => <li key={p.id}><b>{p.company_name}</b>{p.is_test ? " [테스트]" : ""} · {p.visit_date ?? "날짜 미정"}{p.source_note ? "" : " · 확인 전"}</li>)}</ul>
        ) : <p className="cm-shsub">아직 등록된 탐방 기업이 없습니다. 담당자가 등록하면 기록할 때 고를 수 있습니다.</p>}
      </section>
    </KusShell>
  );
}
