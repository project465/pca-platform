import Link from "next/link";
import { requireUser } from "@/lib/session";
import { activeCoreOrPick, experiencesOf } from "@/lib/me-v3/platform";
import { livePostingOf, postingsOf } from "@/lib/assistant/posting";
import { interviewPrep } from "@/lib/assistant/prep";
import { sentenceDrafts } from "@/lib/assistant/sentence";
import { askOpenFor } from "@/lib/mat/ask-open";
import { CopyButton } from "../../me/track/copy-button";
import { MatAsk } from "../ask";

export const metadata = { title: "지원서 · MAT" };

/** 뼈대의 [칸] 을 눈에 띄게. 글자는 그대로다 */
function withBlanks(s: string) {
  return s.split(/(\[[^\]]+\])/).map((x, i) => (/^\[[^\]]+\]$/.test(x) ? <mark className="mt-blank" key={i}>{x}</mark> : x));
}

/**
 * MAT 지원서(예상 화면 3번). **MAT 이 초안 · 질문을 들고, 실제 상담과 연습 예약은 커리어피크로.**
 *
 * - 공고 하나를 골라(분석한 공고) 그 공고의 필수 요구마다 **내 경험으로 지은 문장 뼈대**를 보인다.
 *   뼈대는 적어 둔 경험 칸에서만 짓는다(`sentenceDrafts`). 빈 칸은 [ ] 로 남기고 지어 채우지 않는다
 * - `문장 고치기`: 붙여 넣은 문장을 문장마다 고칠 점 + 고친 문장으로(질문 입력창과 같은 길)
 * - `면접 연습`: 이 공고에서 나올 질문을 골라 답을 적으면 구체성 · 근거 · 길이로 돌려준다
 * - 둘 다 저장하지 않는다. 처리방침 개정 전(11월 10일)에는 운영자에게만 선다
 */
export default async function MatDraft({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const user = await requireUser();
  const want = (await searchParams).p;
  const core = await activeCoreOrPick(user.id);
  const [mine, exps, ask] = await Promise.all([
    postingsOf(user.id).catch(() => []), experiencesOf(user.id, core), askOpenFor(user.id),
  ]);
  const pickId = want && mine.some((m) => m.id === want) ? want : mine[0]?.id;
  const p = pickId ? await livePostingOf(user.id, pickId) : null;
  const same = p ? (p.core_code ?? core) === core : false;
  const sd = p && same ? sentenceDrafts(p.analysis.items, exps, 6, "ko") : { drafts: [], missing: 0 };
  const asks = p && same ? interviewPrep(core, p.analysis.items, exps, 5, "ko") : [];

  return (
    <main>
      <h1 className="mt-h1">지원서</h1>
      <p className="mt-lead">분석한 공고의 요구마다 내 경험으로 문장 뼈대를 짓습니다. 빈 칸은 직접 채우세요.</p>

      {mine.length ? (
        <div className="mt-chips" aria-label="공고 고르기" style={{ marginBottom: 14 }}>
          {mine.slice(0, 6).map((m) => (
            <Link key={m.id} href={`/mat/draft?p=${m.id}`} className={`mt-chip mt-chip-btn${m.id === pickId ? " is-on" : ""}`}
              aria-current={m.id === pickId ? "true" : undefined}>{m.label}</Link>
          ))}
        </div>
      ) : (
        <p className="mt-empty">아직 분석한 공고가 없습니다. <Link href="/mat/jobs">공고</Link>에서 하나를 바로 분석하면 여기서 문장 뼈대가 생깁니다.</p>
      )}

      {p ? (
        <>
          <h2 className="mt-h2">문장 뼈대 <small>{sd.drafts.length}개</small></h2>
          {sd.drafts.length ? (
            <div className="mt-list">
              {sd.drafts.map((d, i) => {
                const text = d.sentences.join(" ");
                return (
                  <div key={i} className="mt-row">
                    <div className="mt-row-b">
                      <small>공고 요구 · {d.text}</small>
                      <p style={{ marginTop: 6, fontWeight: 500 }}>{withBlanks(text)}</p>
                      <div className="mt-chips"><span className="mt-chip">경험: {d.experience.title}</span>
                        {d.blanks.length ? <span className="mt-chip is-none">빈 칸 {d.blanks.length}개</span> : null}</div>
                      <div className="mt-acts"><CopyButton text={text} label="문장 복사" /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="mt-empty">{same ? "필수 요구에 이을 경험이 아직 적혀 있지 않습니다." : "다른 전공으로 읽은 공고라 뼈대를 짓지 않았습니다."}</p>}
          {sd.missing ? (
            <p className="mt-note">경험 기록이 없어 뼈대를 못 지은 필수 요구 {sd.missing}줄 — <Link href={`/mat/jobs/${p.id}`}>보완할 점</Link>에서 경험을 적으면 생깁니다.</p>
          ) : null}
        </>
      ) : null}

      {ask.ok ? (
        <>
          <MatAsk mode="draft" />
          {asks.length ? <MatAsk mode="interview" examples={asks.map((a) => a.question)} /> : null}
        </>
      ) : (
        <p className="mt-note" style={{ marginTop: 24 }}>문장 고치기와 면접 연습은 11월 10일부터 열립니다.</p>
      )}

      <div className="mt-box" style={{ marginTop: 24 }}>
        <h3>사람과 연습하기</h3>
        <p>지원서 첨삭과 모의면접 상담은 커리어피크로 이어집니다. 보낼 내용은 보내기 전에 직접 고릅니다.</p>
        <Link className="mt-btn is-block" href="/mat/consult" style={{ marginTop: 12 }}>상담 알아보기</Link>
      </div>
    </main>
  );
}
