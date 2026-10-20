import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeader } from "@/app/me/ui";
import { requireKusStudent } from "@/lib/kus/access";
import { kusWorkspace } from "@/lib/kus/workspace";
import { activityLabel, didSomething, visitDraft, visitOf } from "@/lib/kus/visits";
import { domainName, roleName } from "@/lib/me-v3/runtime/session";
import { experiencesOf } from "@/lib/me-v3/platform";
import { KusHead, KusNote, KusShell } from "../../shell";
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
      <KusHead kicker={`기업탐방 기록 · ${v.visited_on ?? "날짜 미기록"}`} title={v.company_name}
        lead={v.confirmed ? "담당자가 등록한 탐방입니다." : "등록된 탐방이 아니라 기업 이름이 확인 전입니다."} />
      {sp.saved ? <KusNote tone="info">저장했습니다.</KusNote> : null}
      {sp.linked ? <KusNote tone="info">경험과 이었습니다. 다음 반영 때 그 경험이 판정에 들어갑니다.</KusNote> : null}
      {sp.e ? <KusNote>잇지 못했습니다. 본인의 경험만 이을 수 있습니다.</KusNote> : null}
      {v.is_test ? <KusNote>테스트 탐방입니다. 실제 기업이 아닙니다.</KusNote> : null}

      <section className="kus-panel">
        <SectionHeader icon="building" title="기록" />
        <dl className="kus-kv">
          <dt>관찰한 직무</dt><dd>{[...v.role_codes.map((c) => roleName(core, c)), ...(v.role_text ? [v.role_text] : [])].join(", ") || "—"}</dd>
          <dt>이해한 것</dt><dd>{v.understood ?? "—"}</dd>
          <dt>한 활동</dt><dd>{v.activities.map(activityLabel).join(" / ")}{v.activity_text ? ` — ${v.activity_text}` : ""}</dd>
          <dt>새로 안 것</dt><dd>{v.learned ?? "—"}</dd>
          <dt>이은 전공 영역</dt><dd>{v.td_codes.length ? v.td_codes.map((t) => `${domainName(core, t)}${zoneOf.get(t) ? ` (검사: ${zoneOf.get(t)})` : ""}`).join(" · ") : "—"}</dd>
        </dl>
      </section>

      <section className="kus-panel">
        <SectionHeader icon="ladder" title="경험으로 옮기기" sub="판정에 들어가는 길은 이것 하나입니다." />
        {v.experience_id ? <p className="cm-shsub">공통 경험과 이어져 있습니다. <Link href={`/me/experience/${v.experience_id}/edit`}>그 경험 보기</Link></p>
          : !didSomething(v) ? <p className="cm-shsub">관찰만 한 기록이라 경험으로 옮기지 않습니다. 본 판단 하나를 수업·프로젝트에서 직접 해 보면 그때 경험으로 적습니다.</p>
            : (
              <>
                <p className="cm-shsub">직접 해 본 활동을 공통 경험 입력에 적은 뒤(무엇을 정했고 무엇이 남았는지 보기에서 고름), 그 경험을 이 기록과 잇습니다.</p>
                <div className="kus-actions"><Link className="cm-btn is-primary" href="/me/experience/new">경험 적으러 가기</Link></div>
                {exps.length ? (
                  <form action={linkVisitExperience} className="kus-actions" style={{ marginTop: 12 }}>
                    <input type="hidden" name="id" value={v.id} />
                    <select name="experience_id" className="kus-input" style={{ maxWidth: 420 }}>
                      {exps.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                    </select>
                    <button type="submit" className="cm-btn">이 경험과 잇기</button>
                  </form>
                ) : null}
              </>
            )}
      </section>

      <section className="kus-panel">
        <SectionHeader icon="doc" title="자기소개서·면접·포트폴리오 초안" sub={d.observeOnly ? "관찰 기록이라 `보았다·이해했다` 로 씁니다." : "직접 해 본 활동이 들어간 초안입니다."} />
        <h3 className="kus-h3">자기소개서 문단</h3>
        <p className="kus-draft">{d.letter}</p>
        <h3 className="kus-h3">면접 질문과 답의 뼈대</h3>
        <ol className="kus-todo">{d.interview.map((q) => <li key={q.q}><div><b>{q.q}</b><small>{q.frame}</small></div></li>)}</ol>
        <h3 className="kus-h3">포트폴리오 한 쪽</h3>
        <ul>{d.portfolio.map((x) => <li key={x}>{x}</li>)}</ul>
        {d.cautions.map((x) => <p key={x} className="cm-shsub">{x}</p>)}
      </section>

      <form action={deleteVisit} className="kus-actions" style={{ marginTop: 16 }}>
        <input type="hidden" name="id" value={v.id} />
        <Link className="cm-btn" href="/kus/visits">목록</Link>
        <button type="submit" className="cm-btn is-ghost">이 기록 지우기</button>
      </form>
    </KusShell>
  );
}
