import Link from "next/link";
import { requireUser } from "@/lib/session";
import { activeCoreOrPick, currentState } from "@/lib/me-v3/platform";
import { openActions } from "@/lib/me-v3/open-actions";
import { domainName } from "@/lib/me-v3/runtime/session";
import { postingsForMe } from "@/lib/assistant/match";
import { MAT_STAGES, isoWeek, matStage, monthWeekKo } from "@/lib/mat/stage";
import { withJosa } from "@/lib/me-v3/result/josa";
import { matMoveAction } from "./actions";
import { JobCard } from "./job-card";
import { MatAsk } from "./ask";
import { askOpenFor } from "@/lib/mat/ask-open";

export const metadata = { title: "MAT 홈 · CareerMatri" };

/**
 * MAT 홈(예상 화면 1번). **실제 자료가 먼저 선다**: 진단 한 줄 · 이번 주 할 일 · 새로 겹치는 공고.
 *
 * - 진단 단계 4칸은 화면용 계산이다(`lib/mat/stage.ts`). 판정은 검사가 낸 그대로다
 * - 할 일은 웹 작업공간과 같은 줄(`openActions`)이고, 끝냄도 같은 함수로 적는다
 * - 공고는 모아 둔 공고 가운데 내 자료 · 경험과 겹치는 것(`postingsForMe`). **회사 이름은 없다**:
 *   저장하지 않는다(직업정보제공사업 범위). 지역 · 출처 · 마감 · 겹친 낱말만 적는다
 * - 화면에 `AI` 를 자랑하는 말을 두지 않는다. 근거를 그대로 적는다
 */
export default async function MatHome() {
  const user = await requireUser();
  /* /me 와 같은 문: 검사도 학교 학과도 없어 전공을 정할 수 없으면 전공 목록으로 보낸다.
     먼저 막지 않으면 아래 `currentState` 가 던져 화면이 500 이 된다(로컬 확인 11-01) */
  await activeCoreOrPick(user.id);
  const [st, act, jobs, ask] = await Promise.all([
    currentState(user.id),
    openActions(user.id),
    postingsForMe(user.id, 40).catch(() => null),
    askOpenFor(user.id),
  ]);
  const name = (td: string) => domainName(st.core, td);
  const owned = (st.model?.domains ?? []).filter((d) => d.owned.length > 0).map((d) => d.code);
  const s = matStage(st.zoneOf, owned);
  const gap = st.gaps[0] ?? null;

  const diag = !st.model
    ? "아직 검사 결과가 없습니다. 검사를 마치면 여기 진단과 할 일이 채워집니다."
    : s.established.length
      ? `${withJosa(s.established.slice(0, 2).map(name).join(" · "), "은는")} 근거를 갖췄습니다.${gap ? ` 지금 비어 있는 곳은 ${name(gap.domain)}입니다.` : ""}`
      : gap
        ? `아직 근거를 갖춘 영역이 없습니다. ${name(gap.domain)}부터 하나씩 채우면 됩니다.`
        : "아직 근거를 갖춘 영역이 없습니다.";

  const open = act.rows.filter((r) => r.state !== "done" && r.state !== "dropped");
  const week = open.slice(0, 3);
  const doneN = act.rows.filter((r) => r.state === "done").length;

  const list = jobs ? (jobs.rows.length ? jobs.rows : jobs.recent) : [];
  const matched = Boolean(jobs?.rows.length);
  const shown = list.slice(0, 2);
  const fromJi = list.some((p) => p.source === "jobindustry");

  return (
    <main>
      <div className="mt-top">
        <span className="mt-week">W{isoWeek()} · {monthWeekKo()}</span>
        <span className="mt-week">{s.stage} {s.index + 1}/4</span>
      </div>
      <h1 className="mt-h1">{user.name}님, 이번 주는<br />이것부터 하세요</h1>

      <section className="mt-diag" aria-label="지금 단계">
        <div className="mt-diag-k"><span>지금 단계</span><b>{s.stage}</b></div>
        <div className="mt-steps" aria-hidden>
          {MAT_STAGES.map((x, i) => <span key={x} className={i <= s.index ? "is-on" : undefined} />)}
        </div>
        <div className="mt-steps-l">
          {MAT_STAGES.map((x, i) => <span key={x} className={i === s.index ? "is-now" : undefined}>{x}</span>)}
        </div>
        <p>{diag}</p>
        {st.model ? <Link href="/me/results">결과지 전체 보기</Link> : <Link href="/cores">검사 시작하기</Link>}
      </section>

      <h2 className="mt-h2">이번 주 할 일 <small>{week.length ? `남은 일 ${open.length}개 · 끝낸 일 ${doneN}개` : ""}</small></h2>
      {week.length ? (
        <div className="mt-list">
          {week.map((r) => (
            <div key={r.id} className="mt-row">
              <form action={matMoveAction}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="state" value="done" />
                <input type="hidden" name="body" value={r.body} />
                <input type="hidden" name="td" value={r.td_code ?? ""} />
                <button type="submit" className="mt-check" aria-label={`끝냈어요: ${r.body}`}><i /></button>
              </form>
              <div className="mt-row-b">
                <p>{r.body}</p>
                <small>
                  {r.td_code ? `${name(r.td_code)} · ` : ""}
                  {r.horizon <= 30 ? "이번 달 안" : r.horizon <= 90 ? "석 달 안" : "올해 안"}
                </small>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-empty">
          {st.model ? "지금 열린 할 일이 없습니다. 경험을 하나 더 적으면 새 할 일이 생깁니다." : "검사를 마치면 할 일이 여기 섭니다."}
        </p>
      )}

      <h2 className="mt-h2">{matched ? "내 경험과 겹치는 공고" : "새로 들어온 공고"} <Link href="/mat/jobs" className="mt-meta">전체 보기</Link></h2>
      {shown.length ? (
        <div className="mt-list">{shown.map((p) => <JobCard key={p.id} p={p} />)}</div>
      ) : (
        <p className="mt-empty">아직 모아 둔 공고가 없습니다.</p>
      )}
      {fromJi ? <p className="mt-src">공고 출처 잡인더스트리 · 10분마다 새로 모읍니다 · 회사 이름은 원문에서 확인하세요</p> : null}
      {ask.ok ? <MatAsk /> : null}
    </main>
  );
}
