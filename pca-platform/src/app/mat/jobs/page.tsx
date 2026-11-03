import { requireUser } from "@/lib/session";
import { matTitle } from "@/lib/mat/title";
import { pickJobs } from "@/lib/mat/pick-jobs";
import { postingsOf } from "@/lib/assistant/posting";
import { JobCard } from "../job-card";
import { matPasteJob } from "../actions";
import { TrackBoard } from "../track-board";
import { applicationsOf } from "@/lib/me-v3/platform";
import Link from "next/link";
import { queryOne } from "@/lib/db";
import type { MatchedPosting } from "@/lib/assistant/match";
import { sourceName } from "@/lib/mat/stage";
import { aiConsented } from "@/lib/assistant/settings";
import { aiReady } from "@/lib/assistant/claude";
import { planOf, researchJobs } from "@/lib/plans";
import { moneyText } from "@/lib/mat/money-text";
import { matLang } from "@/lib/mat/lang";
import { sayOf } from "@/lib/mat/copy";
import { enSummaries } from "@/lib/mat/posting-en";
import { JOBLIST_TEXT as J, TITLE_TEXT } from "../mat-text";

export const generateMetadata = () => matTitle(TITLE_TEXT.jobs);

const ERR = { noread: J.errNoread, short: J.errShort, save: J.errSave } as const;

/**
 * MAT 공고(예상 화면 2번).
 *
 * - 위: 내 경험 · 자료와 겹치는 공고(겹친 낱말 수 차례). 겹치는 것이 없으면 새로 들어온 공고
 * - 아래: 이미 분석한 공고. 열면 지금 적어 둔 경험으로 상태를 다시 단다
 * - 맨 아래: 다른 사이트 공고는 글을 붙여 넣어 분석(남의 주소를 서버가 대신 열지 않는다)
 *
 * "추천" · 합격 가능성 · 점수를 쓰지 않는다. 무엇이 겹쳤는지를 그대로 보인다.
 */
export default async function MatJobs({ searchParams }: { searchParams: Promise<{ e?: string; from?: string }> }) {
  const user = await requireUser();
  const lang = await matLang();
  const t = sayOf(lang);
  const JOBS_TEXT = moneyText(lang).JOBS_TEXT;
  const sp = await searchParams;
  const e = sp.e;
  /* 제휴 사이트에서 보던 공고를 들고 들어왔으면(`/from/{partner}/enter`) 그 공고를 맨 위에 */
  const carried = sp.from && /^\d{1,18}$/.test(sp.from)
    ? await queryOne<MatchedPosting & { raw_requirements: string[] }>(
      `SELECT id::text, source, source_url, closes_on::text, captured_at::text, region_code, raw_requirements
         FROM v3_job_postings WHERE id = $1`, [sp.from]).catch(() => null)
    : null;
  const [jobs, mine, apps, agreed] = await Promise.all([
    pickJobs(user.id, 20),
    postingsOf(user.id).catch(() => []),
    applicationsOf(user.id).catch(() => []),
    aiConsented(user.id).catch(() => false),
  ]);
  const consent = agreed && aiReady();
  /* 연구자 플랜이면 연구소 · 박사급 공고를 따로 모아 맨 위에(2026-11-03 대표 결정) */
  const research = (await planOf(user.id)) === "research" ? await researchJobs(20) : [];
  const list = jobs.main;
  const fromJi = [...list, ...jobs.grad, ...jobs.other].some((p) => p.source === "jobindustry");
  /* 영어 화면: 한국어 공고마다 저장해 둔 영어 요약(없으면 카드가 `Korean posting` 표시만 단다) */
  const en = lang === "en"
    ? await enSummaries([...(carried ? [carried.id] : []), ...[...research, ...list, ...jobs.broad, ...jobs.grad, ...jobs.other].map((p) => p.id)])
    : undefined;
  const card = (p: MatchedPosting) => <JobCard key={p.id} p={p} lang={lang} en={en?.get(p.id)} />;

  return (
    <main>
      <h1 className="mt-h1">{t(J.title)}</h1>
      <p className="mt-lead">
        {jobs.matched ? t(J.leadMatched) : t(J.leadNew)}
      </p>
      {e && e in ERR ? <p className="mt-alert" role="alert">{t(ERR[e as keyof typeof ERR])}</p> : null}
      {carried ? (
        <>
          <h2 className="mt-h2">{t(J.carried, { src: sourceName(carried.source, lang) })}</h2>
          <div className="mt-list" style={{ marginBottom: 8 }}>
            {card({ ...carried, requirements: (carried.raw_requirements ?? []).slice(0, 8), hits: [], tdHits: [] })}
          </div>
          <p className="mt-note">{t(J.carriedNote)}</p>
        </>
      ) : null}

      {research.length ? (
        <>
          <h2 className="mt-h2">{JOBS_TEXT.research} <small>{JOBS_TEXT.count(research.length)}</small></h2>
          <div className="mt-list" style={{ marginBottom: 16 }}>{research.map(card)}</div>
        </>
      ) : null}
      {list.length ? (
        <div className="mt-list">{list.slice(0, 20).map(card)}</div>
      ) : jobs.broad.length ? (
        <>
          <p className="mt-note">{t(J.broadNote)}</p>
          <h2 className="mt-h2">{t(J.broadTitle)}</h2>
          <div className="mt-list">{jobs.broad.slice(0, 10).map(card)}</div>
        </>
      ) : (
        <p className="mt-empty">{jobs.other.length ? t(J.emptyOther) : t(J.empty)}</p>
      )}
      {jobs.grad.length ? (
        <details className="mt-more">
          <summary>{t(J.grad, { n: jobs.grad.length })}</summary>
          <div className="mt-list">{jobs.grad.map(card)}</div>
        </details>
      ) : null}
      {jobs.other.length ? (
        <details className="mt-more">
          <summary>{t(J.other, { n: jobs.other.length })}</summary>
          <div className="mt-list">{jobs.other.map(card)}</div>
        </details>
      ) : null}
      {fromJi ? <p className="mt-src">{t(J.srcJi)}</p> : null}

      {mine.length ? (
        <>
          <h2 className="mt-h2">{t(J.mine)}</h2>
          <div className="mt-list">
            {mine.slice(0, 10).map((m) => (
              <Link key={m.id} href={`/mat/jobs/${m.id}`} className="mt-row mt-row-link">
                <div className="mt-row-b">
                  <p>{m.name ?? m.label}</p>
                  <small>{m.deadline ? t(J.deadline, { d: m.deadline }) : t(J.noDeadline)}</small>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <TrackBoard apps={apps} postings={mine} lang={lang} />

      <h2 className="mt-h2" id="paste">{t(J.pasteTitle)}</h2>
      <form action={matPasteJob} className="mt-form">
        <label className="mt-field">
          <span>{t(J.pasteName)}</span>
          <input name="label" maxLength={80} placeholder={t(J.pasteNameHolder)} />
        </label>
        <label className="mt-field">
          <span>{t(J.pasteText)}</span>
          <textarea name="text" rows={6} required minLength={30} maxLength={12000}
            placeholder={t(J.pasteTextHolder)} />
        </label>
        <button type="submit" className="mt-btn is-main is-block">{t(J.pasteGo)}</button>
        {/* 처리 안내는 한 화면에 한 번만(2026-11-02 운영 시험 "AI 느낌"). AI 분석을 켠 사람에게만, 보내는 자리 바로 아래에 */}
        {/* 붙여 넣은 공고 글은 다시 읽기에 쓰려고 그대로 저장된다(raw_text). 회사 이름이 든 글이므로 `저장하지 않는다` 고 쓰지 않는다(MAT 시험 M4) */}
        <p className="mt-note">{t(J.pasteNote)}{consent ? t(J.pasteAi) : ""}</p>
      </form>
    </main>
  );
}
