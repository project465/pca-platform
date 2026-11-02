import { requireUser } from "@/lib/session";
import { postingsForMe } from "@/lib/assistant/match";
import { postingsOf } from "@/lib/assistant/posting";
import { JobCard } from "../job-card";
import { matPasteJob } from "../actions";
import Link from "next/link";

export const metadata = { title: "공고 · MAT" };

const ERR: Record<string, string> = {
  noread: "이 공고는 요구 항목을 글로 읽지 못해 분석할 수 없습니다. 원문을 열어 글을 붙여 넣어 주세요.",
  short: "공고 글이 너무 짧습니다. 자격 요건과 우대 사항이 들어간 부분을 붙여 넣어 주세요.",
  save: "분석을 저장하지 못했습니다. 잠시 뒤 다시 눌러 주세요.",
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
export default async function MatJobs({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const user = await requireUser();
  const e = (await searchParams).e;
  const [jobs, mine] = await Promise.all([
    postingsForMe(user.id, 40).catch(() => null),
    postingsOf(user.id).catch(() => []),
  ]);
  const list = jobs ? (jobs.rows.length ? jobs.rows : jobs.recent) : [];
  const matched = Boolean(jobs?.rows.length);
  const fromJi = list.some((p) => p.source === "jobindustry");

  return (
    <main>
      <h1 className="mt-h1">공고</h1>
      <p className="mt-lead">
        {matched
          ? `내 경험 · 자료와 겹치는 공고 ${list.length}건입니다. 겹친 낱말이 많은 차례입니다.`
          : "아직 겹치는 공고가 없어 새로 들어온 공고부터 보여 드립니다. 경험을 적을수록 겹치는 공고가 생깁니다."}
      </p>
      {e && ERR[e] ? <p className="mt-alert" role="alert">{ERR[e]}</p> : null}

      {list.length ? (
        <div className="mt-list">{list.slice(0, 20).map((p) => <JobCard key={p.id} p={p} />)}</div>
      ) : (
        <p className="mt-empty">아직 모아 둔 공고가 없습니다.</p>
      )}
      {fromJi ? <p className="mt-src">공고 출처 잡인더스트리 · 10분마다 새로 모읍니다 · 회사 이름은 원문에서 확인하세요</p> : null}

      {mine.length ? (
        <>
          <h2 className="mt-h2">분석한 공고 <small>{mine.length}건</small></h2>
          <div className="mt-list">
            {mine.slice(0, 10).map((m) => (
              <Link key={m.id} href={`/mat/jobs/${m.id}`} className="mt-row mt-row-link">
                <div className="mt-row-b">
                  <p>{m.label}</p>
                  <small>
                    설명할 경험 있음 {m.analysis.counts.ready} · 덜 됨 {m.analysis.counts.partial} · 없음 {m.analysis.counts.empty}
                    {m.deadline ? ` · 마감 ${m.deadline}` : ""}
                  </small>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <h2 className="mt-h2" id="paste">다른 공고 붙여 넣기</h2>
      <form action={matPasteJob} className="mt-form">
        <label className="mt-field">
          <span>공고 이름(나만 봅니다)</span>
          <input name="label" maxLength={80} placeholder="예: 품질관리 신입" />
        </label>
        <label className="mt-field">
          <span>공고 글</span>
          <textarea name="text" rows={6} required minLength={30} maxLength={12000}
            placeholder="자격 요건 · 우대 사항 · 담당 업무 부분을 붙여 넣으세요" />
        </label>
        <button type="submit" className="mt-btn is-block">분석하기</button>
        <p className="mt-note">회사 이름은 저장하지 않습니다. AI 분석을 켜 둔 경우에만 글이 Anthropic(미국)의 Claude로 보내져 읽히고, 꺼 두면 규칙으로 읽습니다.</p>
      </form>
    </main>
  );
}
