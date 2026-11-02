import Link from "next/link";
import { requireUser } from "@/lib/session";
import { activeCoreOrPick, currentState } from "@/lib/me-v3/platform";
import { openActions } from "@/lib/me-v3/open-actions";
import { domainName } from "@/lib/me-v3/runtime/session";
import { MAT_STAGES, matStage, monthWeekKo } from "@/lib/mat/stage";
import { pickJobs } from "@/lib/mat/pick-jobs";
import { oneLine } from "@/lib/mat/short";
import { withJosa } from "@/lib/me-v3/result/josa";
import { matMoveAction } from "./actions";
import { JobCard } from "./job-card";
import { MatAsk } from "./ask";
import { askOpenFor } from "@/lib/mat/ask-open";
import { headsUp } from "@/lib/mat/heads-up";
import { postingsOf } from "@/lib/assistant/posting";
import { applicationsOf } from "@/lib/me-v3/platform";

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
  /* /me 와 같은 문: 검사도 학교 학과도 없어 전공을 정할 수 없으면 전공 목록으로 보낸다 */
  await activeCoreOrPick(user.id);
  const [st, act, jobs, ask, mine, apps] = await Promise.all([
    currentState(user.id),
    openActions(user.id),
    pickJobs(user.id, 6),
    askOpenFor(user.id),
    postingsOf(user.id).catch(() => []),
    applicationsOf(user.id).catch(() => []),
  ]);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const tips = headsUp({
    postings: mine, apps,
    freshMatches: jobs.main.filter((r) => r.hits.length && Date.parse(r.captured_at) >= weekAgo).length,
    zoneMoved: st.zoneMoved.length,
  });
  const name = (td: string) => domainName(st.core, td);
  const owned = (st.model?.domains ?? []).filter((d) => d.owned.length > 0).map((d) => d.code);
  const s = matStage(st.zoneOf, owned);
  const gap = st.gaps[0] ?? null;

  /* 상담사가 말하듯 한두 마디(2026-11-02 대표 "AI같아"). 숫자 · 판정어를 늘어놓지 않는다 */
  const diag = !st.model
    ? "검사를 마치면 이번 주 할 일을 골라 드릴게요."
    : s.established.length
      ? `${withJosa(s.established.slice(0, 2).map(name).join(" · "), "은는")} 근거가 있어요.${gap ? ` 이번엔 ${withJosa(name(gap.domain), "을를")} 채워 봐요.` : ""}`
      : gap
        ? `${name(gap.domain)}부터 하나씩 채워 봐요.`
        : "적어 둔 경험이 늘면 다음 단계가 보여요.";

  const open = act.rows.filter((r) => r.state !== "done" && r.state !== "dropped");
  const week = open.slice(0, 3);
  const shown = jobs.main.slice(0, 2);
  const fromJi = shown.some((p) => p.source === "jobindustry");

  return (
    <main>
      <div className="mt-top">
        <span className="mt-week">{monthWeekKo()}</span>
        <Link href="/mat/brief" className="mt-week">이번 주 브리핑</Link>
      </div>
      <h1 className="mt-h1">{user.name}님, 이번 주 할 일</h1>

      <section className="mt-stage" aria-label="지금 단계">
        <div className="mt-stage-h"><span>지금 단계</span><b>{s.stage}</b></div>
        <div className="mt-steps" role="img" aria-label={`${MAT_STAGES.length}단계 가운데 ${s.index + 1}번째`}>
          {MAT_STAGES.map((x, i) => <span key={x} className={i <= s.index ? "is-on" : undefined} title={x} />)}
        </div>
        <p>{diag}</p>
        {st.model ? <Link className="mt-link" href="/me/results">결과지 보기</Link> : <Link className="mt-link" href="/cores">검사 시작</Link>}
      </section>

      {tips.length ? (
        <>
          <h2 className="mt-h2">먼저 볼 것</h2>
          <div className="mt-list">
            {tips.map((t) => (
              <Link key={t.key} href={t.href} className="mt-row mt-row-link">
                <div className="mt-row-b"><p>{t.title}</p><small>{t.body}</small></div>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <h2 className="mt-h2">이번 주 할 일</h2>
      {week.length ? (
        <div className="mt-list">
          {week.map((r) => (
            <div key={r.id} className="mt-row">
              <form action={matMoveAction}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="state" value="done" />
                <input type="hidden" name="body" value={r.body} />
                <input type="hidden" name="td" value={r.td_code ?? ""} />
                <button type="submit" className="mt-check" aria-label={`끝냄: ${r.body}`}><i /></button>
              </form>
              <div className="mt-row-b">
                <p>{oneLine(r.body)}</p>
                <small>{r.td_code ? name(r.td_code) : ""}</small>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-empty">
          {st.model ? <>열린 할 일이 없어요. <Link href="/mat/jobs">공고 하나 분석하기</Link></> : <Link href="/cores">검사 시작</Link>}
        </p>
      )}

      <h2 className="mt-h2">{jobs.matched ? "맞는 공고" : "새 공고"} <Link href="/mat/jobs" className="mt-meta">전체</Link></h2>
      {shown.length ? (
        <div className="mt-list">{shown.map((p) => <JobCard key={p.id} p={p} />)}</div>
      ) : (
        <p className="mt-empty">모아 둔 공고가 아직 없어요.</p>
      )}
      <Link href="/mat/files" className="mt-row mt-row-link mt-box-link">
        <div className="mt-row-b"><p>경험 파일 올리기</p><small>성적증명서 · 수료증 · 자격증</small></div>
      </Link>
      {fromJi ? <p className="mt-src">공고 출처 잡인더스트리 · 회사 이름은 원문에서</p> : null}
      {ask.ok ? <MatAsk /> : null}
    </main>
  );
}
