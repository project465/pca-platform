import Link from "next/link";
import { requireKusStudent } from "@/lib/kus/access";
import { kusWorkspace } from "@/lib/kus/workspace";
import { activityLabel, didSomething } from "@/lib/kus/visits";
import { roleName } from "@/lib/me-v3/runtime/session";
import { KusCard, KusHead, KusNote, KusShell } from "../shell";

export const dynamic = "force-dynamic";

/** 기업탐방 기록 목록. **이 사람의 기록만** 읽는다(`visitsOf` 가 `user_id` 로 거른다) */
export default async function KusVisits({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { user, me } = await requireKusStudent();
  const w = await kusWorkspace(user, me);
  const sp = await searchParams;
  return (
    <KusShell active="/kus/visits" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
      <KusHead kicker="기업탐방" title="탐방 기록" lead="본 것과 직접 해 본 것을 남겨 두면 자기소개서와 면접 준비에 쓸 수 있어요."
        actions={<Link className="kus-btn" href="/kus/visits/new">새 기록 쓰기</Link>} />
      {sp.deleted ? <KusNote tone="info">기록을 지웠어요.</KusNote> : null}
      <KusCard title={`내 기록 ${w.visits.length}건`}>
        {w.visits.length ? (
          <ul className="kus-rows">{w.visits.map((v) => {
            const roles = [...v.role_codes.map((c) => roleName(v.core_code ?? "", c)), ...(v.role_text ? [v.role_text] : [])];
            return (
              <li key={v.id}><Link className="kus-row" href={`/kus/visits/${v.id}`}>
                <span className="kus-row-main">
                  <span className="kus-row-t">{v.company_name}{v.is_test ? <> <span className="kus-chip is-red">테스트</span></> : null}</span>
                  <span className="kus-row-s">{v.visited_on ?? "날짜 미기록"}{roles.length ? ` · ${roles.join(", ")}` : ""}</span>
                  <span className="kus-row-s">{v.activities.map(activityLabel).join(", ")}</span>
                </span>
                <span className="kus-row-v">{v.experience_id ? "경험으로 옮김" : didSomething(v) ? "직접 해 봄" : "관찰"}</span>
              </Link></li>
            );
          })}</ul>
        ) : <p className="kus-muted">아직 기록이 없어요. 탐방을 다녀온 날 바로 적어 두면 좋아요.</p>}
      </KusCard>
      <KusCard title="등록된 탐방">
        {w.programs.length ? (
          <ul className="kus-rows">{w.programs.map((p) => (
            <li key={p.id}><div className="kus-row"><span className="kus-row-main">
              <span className="kus-row-t">{p.company_name}{p.is_test ? <> <span className="kus-chip is-red">테스트</span></> : null}</span>
              <span className="kus-row-s">{p.visit_date ?? "날짜 미정"}{p.source_note ? "" : " · 확인 전"}</span></span></div></li>))}</ul>
        ) : <p className="kus-muted">아직 등록된 탐방이 없어요. 담당자가 등록하면 기록할 때 고를 수 있어요.</p>}
      </KusCard>
      <p className="kus-foot">탐방에 다녀온 것만으로 역량을 판단하지 않아요. 직접 해 본 활동은 경험으로 옮기면 다음 분석에 들어가요.</p>
    </KusShell>
  );
}
