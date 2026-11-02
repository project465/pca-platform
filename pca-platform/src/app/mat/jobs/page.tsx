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
import { SOURCE_KO } from "@/lib/mat/stage";

export const generateMetadata = () => matTitle("공고");

const ERR: Record<string, string> = {
  noread: "이 공고는 요건을 글로 읽지 못했어요. 원문을 열어 요건 부분을 아래에 붙여 넣어 주세요.",
  short: "공고 글이 너무 짧아요. 자격 요건 · 우대 사항 부분을 붙여 넣어 주세요.",
  save: "저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.",
};

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
  const sp = await searchParams;
  const e = sp.e;
  /* 제휴 사이트에서 보던 공고를 들고 들어왔으면(`/from/{partner}/enter`) 그 공고를 맨 위에 */
  const carried = sp.from && /^\d{1,18}$/.test(sp.from)
    ? await queryOne<MatchedPosting & { raw_requirements: string[] }>(
      `SELECT id::text, source, source_url, closes_on::text, captured_at::text, region_code, raw_requirements
         FROM v3_job_postings WHERE id = $1`, [sp.from]).catch(() => null)
    : null;
  const [jobs, mine, apps] = await Promise.all([
    pickJobs(user.id, 20),
    postingsOf(user.id).catch(() => []),
    applicationsOf(user.id).catch(() => []),
  ]);
  const list = jobs.main;
  const fromJi = [...list, ...jobs.grad].some((p) => p.source === "jobindustry");

  return (
    <main>
      <h1 className="mt-h1">공고</h1>
      <p className="mt-lead">
        {jobs.matched ? "전공 · 경험과 겹치는 공고부터 보여 드려요." : "새 공고부터 보여 드려요. 경험을 적으면 맞는 공고가 위로 와요."}
      </p>
      {e && ERR[e] ? <p className="mt-alert" role="alert">{ERR[e]}</p> : null}
      {carried ? (
        <>
          <h2 className="mt-h2">{SOURCE_KO[carried.source] ?? carried.source}에서 보던 공고</h2>
          <div className="mt-list" style={{ marginBottom: 8 }}>
            <JobCard p={{ ...carried, requirements: (carried.raw_requirements ?? []).slice(0, 8), hits: [], tdHits: [] }} />
          </div>
          <p className="mt-note">바로 분석에서 내 경험과 맞춰 보세요.</p>
        </>
      ) : null}

      {list.length ? (
        <div className="mt-list">{list.slice(0, 20).map((p) => <JobCard key={p.id} p={p} />)}</div>
      ) : (
        <p className="mt-empty">모아 둔 공고가 아직 없어요.</p>
      )}
      {jobs.grad.length ? (
        <details className="mt-more">
          <summary>대학원 · 연구실 모집 {jobs.grad.length}건</summary>
          <div className="mt-list">{jobs.grad.map((p) => <JobCard key={p.id} p={p} />)}</div>
        </details>
      ) : null}
      {fromJi ? <p className="mt-src">공고 출처 잡인더스트리 · 회사 이름은 원문에서</p> : null}
      <p className="mt-note">바로 분석은 AI 분석을 켠 경우 Anthropic(미국)의 Claude로 읽고, 꺼 두면 규칙으로 읽어요.</p>

      {mine.length ? (
        <>
          <h2 className="mt-h2">분석한 공고</h2>
          <div className="mt-list">
            {mine.slice(0, 10).map((m) => (
              <Link key={m.id} href={`/mat/jobs/${m.id}`} className="mt-row mt-row-link">
                <div className="mt-row-b">
                  <p>{m.label}</p>
                  <small>{m.deadline ? `마감 ${m.deadline}` : "마감 미기재"}</small>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <TrackBoard apps={apps} postings={mine} />

      <h2 className="mt-h2" id="paste">다른 공고 붙여 넣기</h2>
      <form action={matPasteJob} className="mt-form">
        <label className="mt-field">
          <span>공고 이름 (나만 봐요)</span>
          <input name="label" maxLength={80} placeholder="예: 품질관리 신입" />
        </label>
        <label className="mt-field">
          <span>공고 글</span>
          <textarea name="text" rows={6} required minLength={30} maxLength={12000}
            placeholder="자격 요건 · 우대 사항 · 담당 업무" />
        </label>
        <button type="submit" className="mt-btn is-main is-block">분석</button>
        <p className="mt-note">회사 이름은 저장하지 않아요. AI 분석을 켠 경우 Anthropic(미국)의 Claude로 읽고, 꺼 두면 규칙으로 읽어요.</p>
      </form>
    </main>
  );
}
