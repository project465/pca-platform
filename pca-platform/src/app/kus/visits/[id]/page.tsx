import Link from "next/link";
import { notFound } from "next/navigation";
import { requireKusStudent } from "@/lib/kus/access";
import { kusWorkspace } from "@/lib/kus/workspace";
import { activityLabel, didSomething, visitDraft, visitOf } from "@/lib/kus/visits";
import { domainName, roleName } from "@/lib/me-v3/runtime/session";
import { experiencesOf } from "@/lib/me-v3/platform";
import { KusCard, KusHead, KusNote, KusShell } from "../../shell";
import { deleteVisit, linkVisitExperience } from "../actions";

export const dynamic = "force-dynamic";

/**
 * 탐방 기록 한 건과 그 활용 초안.
 *
 * **남의 기록을 열지 않는다.** 번호를 주소에 넣어도 `visitOf` 가 `user_id`
 * 로 거르고, 없으면 404 다.
 */
export default async function VisitDetail({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; linked?: string; e?: string }>;
}) {
  const { user, me } = await requireKusStudent();
  const { id } = await params;
  const v = await visitOf(user.id, id);
  if (!v) notFound();
  const [w, sp] = await Promise.all([kusWorkspace(user, me), searchParams]);
  const core = v.core_code ?? "";
  const d = visitDraft(core, v);
  const exps = didSomething(v) && !v.experience_id ? await experiencesOf(user.id).catch(() => []) : [];
  const zoneOf = new Map((w.bundle?.analysis.major.rows ?? []).map((r) => [r.code, r.zoneKo]));
  return (
    <KusShell active="/kus/visits" who={w.name} dept={`${w.college} · ${w.dept}`} test={w.test}>
      <KusHead kicker={`기업탐방 · ${v.visited_on ?? "날짜 미기록"}`} title={v.company_name}
        lead={v.confirmed ? undefined : "등록된 탐방이 아니라서 회사 이름은 아직 확인 전이에요."} />
      {sp.saved ? <KusNote tone="info">저장했어요.</KusNote> : null}
      {sp.linked ? <KusNote tone="info">경험과 연결했어요. 다음 분석부터 반영돼요.</KusNote> : null}
      {sp.e ? <KusNote>연결하지 못했어요. 내 경험만 연결할 수 있어요.</KusNote> : null}
      {v.is_test ? <KusNote>테스트 기록이에요. 실제 회사가 아니에요.</KusNote> : null}

      <KusCard title="기록">
        <dl className="kus-kv">
          <dt>본 직무</dt><dd>{[...v.role_codes.map((c) => roleName(core, c)), ...(v.role_text ? [v.role_text] : [])].join(", ") || "적지 않았어요"}</dd>
          <dt>알게 된 것</dt><dd>{v.understood ?? "적지 않았어요"}</dd>
          <dt>한 활동</dt><dd>{v.activities.map(activityLabel).join(", ")}{v.activity_text ? ` (${v.activity_text})` : ""}</dd>
          <dt>새로 안 점</dt><dd>{v.learned ?? "적지 않았어요"}</dd>
          <dt>이어진 전공 영역</dt><dd>{v.td_codes.length ? v.td_codes.map((t) => `${domainName(core, t)}${zoneOf.get(t) ? ` (검사: ${zoneOf.get(t)})` : ""}`).join(", ") : "고르지 않았어요"}</dd>
        </dl>
      </KusCard>

      <KusCard title="경험으로 옮기기">
        {v.experience_id ? <p className="kus-muted">경험과 연결돼 있어요. <Link className="kus-textlink" href={`/me/experience/${v.experience_id}/edit`}>그 경험 보기</Link></p>
          : !didSomething(v) ? <p className="kus-muted">보기만 한 기록이라 경험으로 옮기지 않아요. 본 것 하나를 수업이나 프로젝트에서 직접 해 보면 그때 경험으로 적어 주세요.</p>
            : (
              <>
                <p className="kus-muted">직접 해 본 활동을 경험으로 적고 이 기록과 연결하면 다음 분석에 들어가요.</p>
                <div className="kus-actions" style={{ marginTop: 14 }}><Link className="kus-btn" href="/me/experience/new">경험 적으러 가기</Link></div>
                {exps.length ? (
                  <form action={linkVisitExperience} className="kus-actions" style={{ marginTop: 12 }}>
                    <input type="hidden" name="id" value={v.id} />
                    <select name="experience_id" className="kus-input" style={{ maxWidth: 420 }} aria-label="연결할 경험">
                      {exps.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                    </select>
                    <button type="submit" className="kus-btn is-sub">이 경험과 연결</button>
                  </form>
                ) : null}
              </>
            )}
      </KusCard>

      <KusCard title="자기소개서·면접 초안" sub={d.observeOnly ? "본 것을 중심으로 쓴 초안이에요." : "직접 해 본 활동을 넣은 초안이에요."}>
        <p className="kus-sub-h">자기소개서 문단</p>
        <p className="kus-draft">{d.letter}</p>
        <p className="kus-sub-h">면접 질문</p>
        <ol className="kus-steps">{d.interview.map((q) => <li key={q.q}><b>{q.q}</b><small>{q.frame}</small></li>)}</ol>
        <p className="kus-sub-h">포트폴리오 한 쪽</p>
        <ul className="kus-bul">{d.portfolio.map((x) => <li key={x}>{x}</li>)}</ul>
        {d.cautions.map((x) => <p key={x} className="kus-foot">{x}</p>)}
      </KusCard>

      <form action={deleteVisit} className="kus-actions" style={{ marginTop: 16 }}>
        <input type="hidden" name="id" value={v.id} />
        <Link className="kus-btn is-sub" href="/kus/visits">목록으로</Link>
        <button type="submit" className="kus-btn is-danger">기록 지우기</button>
      </form>
    </KusShell>
  );
}
