import Link from "next/link";
import { Icon } from "@/components/sf/icon";
import { matTitle } from "@/lib/mat/title";
import { requireUser } from "@/lib/session";
import { queryOne } from "@/lib/db";
import { activeCoreOrPick, currentState } from "@/lib/me-v3/platform";
import { openActions } from "@/lib/me-v3/open-actions";
import { domainName } from "@/lib/me-v3/runtime/session";
import { matStage, monthWeekKo } from "@/lib/mat/stage";
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

export const generateMetadata = () => matTitle("홈");

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
  const since = await queryOne<{ s: string | null }>(
    `SELECT min(starts_at)::text AS s FROM entitlements WHERE user_id = $1 AND kind = 'track'`, [user.id]).catch(() => null);
  const tips = headsUp({
    matSince: since?.s ?? null,
    postings: mine, apps,
    freshMatches: jobs.fresh,
    zoneMoved: st.zoneMoved.length,
  });
  const name = (td: string) => domainName(st.core, td);
  const owned = (st.model?.domains ?? []).filter((d) => d.owned.length > 0).map((d) => d.code);
  const s = matStage(st.zoneOf, owned);
  /* 비어 있는 곳은 **근거를 갖춘 영역을 빼고** 고른다(2026-11-02 운영 시험: 같은 영역이 "근거를 갖췄어요" 와
     "이번엔 ○○을 채워 봐요" 에 함께 섰다. 갭은 축 · 결과물 단위라 근거를 갖춘 영역에도 남을 수 있다) */
  const gap = st.gaps.find((g) => !s.established.includes(g.domain)) ?? null;

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
  /* 맞는 공고가 없으면 조건을 넓힌 공고를 그렇다고 밝혀 보인다(0건으로 비우지 않는다) */
  const broadOnly = !jobs.main.length && jobs.broad.length > 0;
  const shown = (broadOnly ? jobs.broad : jobs.main).slice(0, 2);
  const fromJi = shown.some((p) => p.source === "jobindustry");

  return (
    <main>
      <div className="mt-top">
        <span className="mt-week">{monthWeekKo()}</span>
        <Link href="/mat/brief" className="mt-week">이번 주 브리핑</Link>
      </div>
      <h1 className="mt-h1">{user.name}님, 이번 주 할 일</h1>

      {/* 단계 막대는 점수판처럼 읽혀 걷었다(2026-11-02 대표 "AI느낌 안나게"). 글 한 줄로 */}
      <section className="mt-stage" aria-label="지금 단계">
        <p style={{ marginTop: 0 }}>지금은 <b>{s.stage}</b> 단계예요. {diag}</p>
        {st.model ? <Link className="mt-link" href="/me/results">결과지 보기</Link> : <Link className="mt-link" href="/cores">검사 시작</Link>}
      </section>

      {/* 주요 묶음 셋. 로그인 화면의 색 카드(파랑 · 초록 · 보라)와 같은 말씨 */}
      <nav className="mt-tiles" aria-label="MAT 바로 가기">
        <Link href="/mat/jobs" className="mt-tile is-blue">
          <span className="mt-tile-ico"><Icon name="search" size={18} /></span>
          <b>공고</b><small>전공에 맞는 공고와 맞춰 보기</small>
        </Link>
        <Link href="/mat/files" className="mt-tile is-green">
          <span className="mt-tile-ico"><Icon name="doc" size={18} /></span>
          <b>경험 · 파일</b><small>경험 적기 · 증명서 올리기</small>
        </Link>
        <Link href="/mat/draft" className="mt-tile is-violet">
          <span className="mt-tile-ico"><Icon name="send" size={18} /></span>
          <b>지원서 · 상담</b><small>문장 뼈대 · 면접 연습 · 상담</small>
        </Link>
      </nav>

      {tips.length ? (
        <>
          <h2 className="mt-h2">이번 주 확인할 것</h2>
          <div className="mt-list">
            {tips.map((t) => (
              <Link key={t.key} href={t.href} className="mt-row mt-row-link">
                <div className="mt-row-b"><p>{t.title}</p><small>{t.body}</small></div>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      {/* 브리핑은 이번 주 할 일 하나를 든다. 홈도 첫 줄만 `이번 주`, 나머지는 `그다음` 으로 적어 두 화면의 수가 어긋나지 않게 한다
         (2026-11-03 MAT 시험 P1: 브리핑 1개 · 홈 3개) */}
      <h2 className="mt-h2">이번 주 할 일{week.length > 1 ? " · 그다음" : ""}</h2>
      {week.length ? (
        <div className="mt-list">
          {week.map((r, wi) => (
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
                <small>{[wi === 0 ? "이번 주" : "그다음", r.td_code ? name(r.td_code) : ""].filter(Boolean).join(" · ")}</small>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-empty">
          {st.model ? <>열린 할 일이 없어요. <Link href="/mat/jobs">공고 하나 분석하기</Link></> : <Link href="/cores">검사 시작</Link>}
        </p>
      )}

      {/* 빈 칸은 칸째 숨긴다(2026-11-03 대표 "AI 느낌") */}
      {shown.length ? (
        <>
          <h2 className="mt-h2">{broadOnly ? "조건을 넓힌 공고" : jobs.matched ? "맞는 공고" : "새 공고"} <Link href="/mat/jobs" className="mt-meta">전체</Link></h2>
          <div className="mt-list">{shown.map((p) => <JobCard key={p.id} p={p} />)}</div>
        </>
      ) : null}
      {fromJi ? <p className="mt-src">공고 출처 잡인더스트리</p> : null}
      {ask.ok ? <MatAsk /> : null}
    </main>
  );
}
