import Link from "next/link";
import type { SessionUser } from "@/lib/session";
import {
  applicationsOf, currentState, experiencesOf, type CurrentState,
} from "@/lib/me-v3/platform";
import { domainName } from "@/lib/me-v3/runtime/session";
import { openActions } from "@/lib/me-v3/open-actions";
import { mark } from "@/lib/me-v3/workspace-events";
import { majorNameOf } from "@/lib/me-v3/major-name";
import { resultMeta } from "@/lib/me-v3/result/meta";
import { queryOne } from "@/lib/db";
import { matVisible } from "@/lib/mat-public";
import { pickJobs } from "@/lib/mat/pick-jobs";
import { livePostingsOf } from "@/lib/assistant/posting";
import { daysLeft, monthWeekKo, REGION_KO, SOURCE_KO } from "@/lib/mat/stage";
import { oneLine } from "@/lib/mat/short";
import { minutesLabel, tierMinutes } from "@/lib/tier-minutes";
import { campusStudentContext } from "@/lib/campus/students";
import { InstallCard } from "@/components/install-card";
import { Icon, type IconName } from "@/components/sf/icon";
import { CmShell } from "./shell";
import { HOME_TEXT as H, say } from "./me-text";

/**
 * 한국어 홈(2026-11-03 시안 `Main.dc.html`).
 *
 * 위에서 아래로: 인사 줄(이번 주 할 일 하나 + MAT 열기) → `내 취업 준비 · 5단계 중 N단계` →
 * 이번 주 할 일 · 맞는 공고. **값은 이미 있는 함수가 낸 것만 쓴다**(`currentState` · `openActions` ·
 * `pickJobs` · `livePostingsOf` · `experiencesOf` · `applicationsOf`). 값이 없는 단계는 `시작 전` 으로 두고
 * 그 단계의 한 가지 일만 적는다. 숫자를 지어내지 않는다.
 *
 * 영어 작업공간은 이 화면을 쓰지 않는다(`page.tsx` 의 옛 홈). 번역이 붙으면 그때 옮긴다.
 */

type Step = {
  key: string; title: string; value: string; sub: string; href: string;
  done: boolean;
};

const STEP_ICON: IconName[] = ["report", "spark", "search", "layers", "send"];

export async function KoHome({ user, core }: { user: SessionUser; core: string }) {
  const [st, exps, act, apps, matOk] = await Promise.all([
    currentState(user.id), experiencesOf(user.id), openActions(user.id),
    applicationsOf(user.id), matVisible(user.id).catch(() => false),
  ]);
  /* MAT 을 볼 수 없는 사람에게는 MAT 값을 읽지도 않는다 */
  const [jobs, posts] = matOk
    ? await Promise.all([
      /* 맞는 공고의 **전체 수**가 필요해 한도를 모아 둔 공고 수(1500)로 준다. 화면에는 둘만 선다 */
      pickJobs(user.id, 1500).catch(() => null),
      livePostingsOf(user.id).then((r) => r.rows).catch(() => []),
    ])
    : [null, []];
  await mark("workspace_opened", user.id, { stage: st.stage });

  const name = (td: string) => domainName(core, td);
  const answered = st.stage === "IN_PROGRESS" && st.open
    ? Number((await queryOne<{ n: string }>(
        "SELECT count(*)::text AS n FROM v3_responses WHERE attempt_id = $1",
        [st.open.id]))?.n ?? 0)
    : 0;
  const minutes = !st.model && st.stage === "NO_ASSESSMENT"
    ? await (async () => {
      const m = tierMinutes(core);
      const campus = await campusStudentContext(user.id).catch(() => null);
      return minutesLabel(campus ? m.PRO : m.BASIC, "ko");
    })().catch(() => null)
    : null;

  const steps = stepsOf({ st, name, answered, minutes, exps, apps, jobs, posts, matOk });
  const at = steps.findIndex((s) => !s.done);
  const nowIdx = at < 0 ? steps.length - 1 : at;
  const what = whatOf(at, st);

  /* 이번 주 할 일: 결과에서 나온 열린 할 일 둘까지, 반영하지 않은 경험이 있으면 그 줄을 먼저 */
  const open = act.rows.filter((r) => r.state !== "done" && r.state !== "dropped");
  const week = open.slice(0, 2);

  const broadOnly = !!jobs && !jobs.main.length && jobs.broad.length > 0;
  const shown = jobs ? (broadOnly ? jobs.broad : jobs.main).slice(0, 2) : [];
  const fromJi = shown.some((p) => p.source === "jobindustry");

  /* 왼쪽 띠의 학교 이름(학교에서 받은 검사면 학교 · 학과) */
  const major = majorNameOf(st.core);
  const meta = st.model ? await resultMeta(String(st.model.attempt_id), st.core) : null;

  return (
    <CmShell active="/me" title={say(H.stepsTitle)} who={user.name} lang="ko"
      finds={Object.keys(st.zoneOf).map((d) => ({ label: name(d), sub: say(H.findSub), href: "/me/state" }))}
      major={meta?.school ? `${meta.school} · ${meta.department ?? major}` : major}>
      <header className="cm-hm-head">
        <div>
          <p className="cm-hm-week">{monthWeekKo()}</p>
          <h1 className="cm-h1 cm-hm-h1">{say(H.greet, "ko", { name: user.name, what })}</h1>
        </div>
        {matOk ? <Link className="cm-btn is-primary cm-hm-mat" href="/mat">{say(H.openMat)}</Link> : null}
      </header>

      <section className="cm-hm-card" aria-label={say(H.stepsTitle)}>
        <div className="cm-hm-row">
          <h2 className="cm-hm-h2">{say(H.stepsTitle)}</h2>
          <span className="cm-hm-meta">{say(H.stepsOf, "ko", { n: nowIdx + 1 })}</span>
        </div>
        <ol className="cm-hm-steps">
          {steps.map((s, i) => {
            const cls = i === nowIdx && at >= 0 ? " is-now" : s.done ? " is-done" : "";
            return (
              <li key={s.key} className={`cm-hm-step${cls}`}>
                <Link href={s.href} aria-current={i === nowIdx && at >= 0 ? "step" : undefined}>
                  <span className="cm-hm-step-h">
                    <Icon name={STEP_ICON[i]} size={15} />
                    {i + 1} · {s.title}
                    {i === nowIdx && at >= 0 ? <em>{say(H.now)}</em> : s.done ? <em>{say(H.done)}</em> : null}
                  </span>
                  <b>{s.value}</b>
                  {s.sub ? <small>{s.sub}</small> : null}
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="cm-hm-two">
        <section className="cm-hm-card" aria-label={say(H.weekTitle)}>
          <div className="cm-hm-row">
            <h2 className="cm-hm-h2">{say(H.weekTitle)}</h2>
            {open.length ? <Link className="cm-hm-more" href="/me/next">{say(H.weekAll)}</Link> : null}
          </div>
          {st.pending > 0 ? (
            <Link className="cm-hm-item" href="/me/recompute">
              <span className="cm-hm-ico is-b"><Icon name="layers" size={18} /></span>
              <span><b>{say(H.weekPending, "ko", { n: st.pending })}</b><small>{say(H.weekPendingSub)}</small></span>
            </Link>
          ) : null}
          {week.map((r, i) => (
            <Link key={r.id} className="cm-hm-item" href="/me/next">
              <span className={`cm-hm-ico${i ? " is-c" : ""}`}><Icon name={i ? "target" : "check"} size={18} /></span>
              <span>
                <b>{oneLine(r.body)}</b>
                <small>{[i === 0 ? say(H.weekFirst) : say(H.weekThen), r.td_code ? name(r.td_code) : ""].filter(Boolean).join(" · ")}</small>
              </span>
            </Link>
          ))}
          {!week.length && !(st.pending > 0) ? (
            <p className="cm-hm-empty">
              {st.model ? say(H.weekNone) : say(H.weekNoneResult)}{" "}
              {st.model
                ? <Link href="/me/experience/new">{say(H.weekAddExp)}</Link>
                : <Link href={steps[0].href}>{steps[0].value}</Link>}
            </p>
          ) : null}
        </section>

        {matOk ? (
          <section className="cm-hm-card" aria-label={say(broadOnly ? H.jobsBroad : H.jobsTitle)}>
            <div className="cm-hm-row">
              <h2 className="cm-hm-h2">{say(broadOnly ? H.jobsBroad : H.jobsTitle)}</h2>
              <Link className="cm-hm-more" href="/mat/jobs">{say(H.jobsAll)}</Link>
            </div>
            {shown.length ? shown.map((p) => {
              const left = daysLeft(p.closes_on);
              const region = p.region_label ?? (p.region_code ? REGION_KO[p.region_code] ?? null : null);
              return (
                <Link key={p.id} className="cm-hm-job" href="/mat/jobs">
                  <span>
                    <b>{p.title ?? SOURCE_KO[p.source] ?? p.source}</b>
                    <small>{[SOURCE_KO[p.source] ?? p.source, p.field, region].filter(Boolean).join(" · ")}</small>
                  </span>
                  <em className={left !== null && left <= 7 ? "is-soon" : undefined}>
                    {left === null ? say(H.jobsAlways) : left <= 0 ? say(H.jobsToday) : `D-${left}`}
                  </em>
                </Link>
              );
            }) : <p className="cm-hm-empty">{say(H.jobsNone)}</p>}
            {fromJi ? <p className="cm-hm-src">{say(H.jobsSource, "ko", { src: SOURCE_KO.jobindustry })}</p> : null}
          </section>
        ) : null}
      </div>

      <InstallCard lang="ko" />
    </CmShell>
  );
}

/** 다섯 단계. 값이 없는 단계는 `done: false` 이고 그 단계의 한 가지 일이 값 자리에 선다 */
function stepsOf(x: {
  st: CurrentState; name: (td: string) => string; answered: number; minutes: string | null;
  exps: { title: string; created_at: string }[];
  apps: { state: string }[];
  jobs: Awaited<ReturnType<typeof pickJobs>> | null;
  posts: { state: string; analysis: { counts: { empty: number } } }[];
  matOk: boolean;
}): Step[] {
  const { st } = x;
  /* 1 · 검사 결과: 강점 = 근거가 확인된 영역(결과지와 MAT 홈이 세는 같은 묶음) */
  const strong = Object.entries(st.zoneOf).filter(([, z]) => z === "Z1_EVIDENCE_ESTABLISHED").map(([d]) => d);
  const s1: Step = st.model
    ? {
      key: "result", title: say(H.s1), done: true, href: "/me/results",
      value: strong.length ? say(H.s1Strong, "ko", { n: strong.length }) : say(H.s1StrongNone),
      sub: strong.length ? strong.slice(0, 3).map(x.name).join(" · ") : say(H.s1StrongNoneSub),
    }
    : st.stage === "IN_PROGRESS"
      ? {
        key: "result", title: say(H.s1), done: false, href: st.open ? `/v3/${st.open.id}` : "/cores",
        value: say(H.s1Going),
        sub: x.answered ? say(H.s1GoingSub, "ko", { n: x.answered }) : say(H.s1GoingSub0),
      }
      : {
        key: "result", title: say(H.s1), done: false, href: "/cores",
        value: say(H.s1Start),
        sub: x.minutes ? say(H.s1StartSub, "ko", { time: x.minutes }) : say(H.s1StartSubPlain),
      };

  /* 2 · MAT 연결: 내 자료 · 전공과 겹친 공고 수(`pickJobs().main`) */
  const n = x.jobs?.main.length ?? 0;
  const srcs = [...new Set((x.jobs?.main ?? []).map((p) => SOURCE_KO[p.source] ?? p.source))];
  const s2: Step = n
    ? { key: "mat", title: say(H.s2), done: true, href: "/mat/jobs",
      value: say(H.s2Jobs, "ko", { n }), sub: srcs.slice(0, 2).join(" · ") }
    : { key: "mat", title: say(H.s2), done: false, href: x.matOk ? "/mat" : "/me/results",
      value: say(H.s2None), sub: say(H.s2NoneSub) };

  /* 3 · 공고 분석: 분석한 공고 수와, 아직 경험이 없는 요건 수(`counts.empty`) */
  const live = x.posts.filter((p) => p.state !== "closed");
  const empty = live.reduce((a, p) => a + (p.analysis?.counts?.empty ?? 0), 0);
  const s3: Step = x.posts.length
    ? { key: "analyze", title: say(H.s3), done: true, href: "/mat/jobs",
      value: say(H.s3Count, "ko", { n: x.posts.length }),
      sub: empty ? say(H.s3Gap, "ko", { n: empty }) : say(H.s3Gap0) }
    : { key: "analyze", title: say(H.s3), done: false, href: "/mat/jobs",
      value: say(H.s3None), sub: say(H.s3NoneSub) };

  /* 4 · 파일 · 경험: 적어 둔 경험 수와 가장 최근 경험 제목 */
  const s4: Step = x.exps.length
    ? { key: "exp", title: say(H.s4), done: true, href: "/me/experience",
      value: say(H.s4Count, "ko", { n: x.exps.length }), sub: oneLine(x.exps[0].title, 24) }
    : { key: "exp", title: say(H.s4), done: false, href: x.matOk ? "/mat/files" : "/me/experience/new",
      value: say(H.s4None), sub: say(H.s4NoneSub) };

  /* 5 · 지원서 · 면접: 지원한 곳 수(보는 중은 빼고 센다) */
  const sent = x.apps.filter((a) => a.state !== "watching");
  const iv = x.apps.filter((a) => a.state === "interview").length;
  const s5: Step = sent.length
    ? { key: "apply", title: say(H.s5), done: true, href: "/mat/jobs#track",
      value: say(H.s5Count, "ko", { n: sent.length }),
      sub: iv ? say(H.s5Interview, "ko", { n: iv }) : say(H.s5Board) }
    : { key: "apply", title: say(H.s5), done: false, href: "/mat/draft",
      value: say(H.s5None), sub: x.posts.length ? say(H.s5NoneSub) : say(H.s5NoneSubFirst) };

  return [s1, s2, s3, s4, s5];
}

/** 인사 줄의 할 일. 지금 단계(처음으로 끝나지 않은 단계)가 정한다 */
function whatOf(at: number, st: CurrentState): string {
  if (at === 0) return st.stage === "IN_PROGRESS" ? say(H.doFinish) : say(H.doStart);
  return say([H.doStart, H.doJobs, H.doAnalyze, H.doExperience, H.doDraft][at] ?? H.doTrack);
}
