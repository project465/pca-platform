import Link from "next/link";
import { matTitle } from "@/lib/mat/title";
import { requireUser } from "@/lib/session";
import { activeCoreOrPick, experiencesOf } from "@/lib/me-v3/platform";
import { livePostingOf, postingsOf } from "@/lib/assistant/posting";
import { interviewPrep } from "@/lib/assistant/prep";
import { sentenceDrafts } from "@/lib/assistant/sentence";
import { bilingualDrafts } from "@/lib/assistant/sentence-bi";
import { askOpenFor } from "@/lib/mat/ask-open";
import { MatCopyButton } from "../copy-button";
import { MatAsk } from "../ask";
import { openDay } from "@/lib/mat/open-dates";
import { matLang } from "@/lib/mat/lang";
import { sayOf, type MatUiLang } from "@/lib/mat/copy";
import { DRAFT_TEXT as DT, TITLE_TEXT } from "../mat-text";

export const generateMetadata = () => matTitle(TITLE_TEXT.draft);

/** 뼈대의 [칸] 을 눈에 띄게. 글자는 그대로다 */
function withBlanks(s: string) {
  return s.split(/(\[[^\]]+\])/).map((x, i) => (/^\[[^\]]+\]$/.test(x) ? <mark className="mt-blank" key={i}>{x}</mark> : x));
}

/**
 * MAT 지원서(예상 화면 3번). **MAT 이 초안 · 질문을 들고, 실제 상담과 연습 예약은 커리어피크로.**
 *
 * - 공고 하나를 골라(분석한 공고) 그 공고의 필수 요구마다 **내 경험으로 지은 문장 뼈대**를 보인다.
 *   뼈대는 적어 둔 경험 칸에서만 짓는다(`sentenceDrafts`). 빈 칸은 [ ] 로 남기고 지어 채우지 않는다
 * - **영어 화면은 한국어 자기소개서 + 영어 대조본**(2026-11-03 대표 결정, `sentence-bi.ts`). 한국 회사에 낼
 *   한국어 문장과 뜻을 확인할 영어 문장을 나란히 둔다. 한국어 쪽은 검사 원고의 짝으로만 바꾼다(기계 번역 없음)
 * - `문장 고치기`: 붙여 넣은 문장을 문장마다 고칠 점 + 고친 문장으로(질문 입력창과 같은 길)
 * - `면접 연습`: 이 공고에서 나올 질문을 골라 답을 적으면 구체성 · 근거 · 길이로 돌려준다. **한국어 · 영어를
 *   고른다**(`?il=ko|en`, 기본은 화면 언어). 고른 언어로 질문이 서고 답도 그 언어로 온다
 * - 둘 다 저장하지 않는다. 처리방침 개정 전(11월 10일)에는 운영자에게만 선다
 */
export default async function MatDraft({ searchParams }: { searchParams: Promise<{ p?: string; il?: string }> }) {
  const user = await requireUser();
  const lang = await matLang();
  const t = sayOf(lang);
  const sp = await searchParams;
  const want = sp.p;
  const il: MatUiLang = sp.il === "ko" || sp.il === "en" ? sp.il : lang;
  const core = await activeCoreOrPick(user.id);
  const [mine, exps, ask] = await Promise.all([
    postingsOf(user.id).catch(() => []), experiencesOf(user.id, core), askOpenFor(user.id),
  ]);
  const pickId = want && mine.some((m) => m.id === want) ? want : mine[0]?.id;
  const p = pickId ? await livePostingOf(user.id, pickId) : null;
  const same = p ? (p.core_code ?? core) === core : false;
  const en = lang === "en";
  const sd = p && same && !en ? sentenceDrafts(p.analysis.items, exps, 6, "ko") : { drafts: [], missing: 0 };
  const bi = p && same && en ? bilingualDrafts(core, p.analysis.items, exps, 6) : { drafts: [], missing: 0 };
  const missing = en ? bi.missing : sd.missing;
  const asks = p && same ? interviewPrep(core, p.analysis.items, exps, 5, il) : [];
  const ilHref = (x: MatUiLang) => `/mat/draft?${new URLSearchParams({ ...(pickId ? { p: pickId } : {}), il: x })}#iv`;
  const lineLang = (x: string) => (en && /[가-힣]{2}/.test(x) ? "ko" : undefined);

  return (
    <main>
      <h1 className="mt-h1">{t(DT.title)}</h1>
      <p className="mt-lead">{t(DT.lead)}</p>
      {en ? <p className="mt-note">{t(DT.leadEn)}</p> : null}

      {mine.length ? (
        <div className="mt-chips" aria-label={t(DT.pickAria)} style={{ marginBottom: 14 }}>
          {mine.slice(0, 6).map((m) => (
            <Link key={m.id} href={`/mat/draft?p=${m.id}`} className={`mt-chip mt-chip-btn${m.id === pickId ? " is-on" : ""}`}
              aria-current={m.id === pickId ? "true" : undefined}>{m.name ?? m.label}</Link>
          ))}
        </div>
      ) : (
        /* 공고를 하나도 분석하지 않았으면 무엇을 하면 뼈대가 생기는지 적는다(2026-11-03 MAT 시험 M2: 링크 하나만 있는 빈 화면) */
        <p className="mt-empty">
          {t(DT.empty)}{" "}
          <Link href="/mat/jobs">{t(DT.analyzeOne)}</Link>
        </p>
      )}

      {p ? (
        <>
          <h2 className="mt-h2">{t(DT.draftTitle)}</h2>
          {en ? (
            bi.drafts.length ? (
              <div className="mt-list">
                {bi.drafts.map((d, i) => {
                  const ko = d.ko.join(" ");
                  const eng = d.en.join(" ");
                  return (
                    <div key={i} className="mt-row" data-bi-draft>
                      <div className="mt-row-b">
                        <small>{t(DT.need, { text: "" })}<span lang={lineLang(d.text)}>{d.text}</span></small>
                        <div className="mt-bi">
                          {ko ? (
                            <div>
                              <h4>{t(DT.colKo)}</h4>
                              <p lang="ko" style={{ fontWeight: 500 }}>{withBlanks(ko)}</p>
                              <div className="mt-acts"><MatCopyButton text={ko} label={t(DT.copyKo)} lang={lang} /></div>
                            </div>
                          ) : null}
                          <div>
                            <h4>{t(DT.colEn)}</h4>
                            <p lang="en">{withBlanks(eng)}</p>
                            <div className="mt-acts"><MatCopyButton text={eng} label={t(DT.copyEn)} lang={lang} /></div>
                          </div>
                        </div>
                        <div className="mt-chips"><span className="mt-chip">{t(DT.exp, { t: d.experience.title })}</span></div>
                      </div>
                    </div>
                  );
                })}
                <p className="mt-note">{t(DT.koNote)}</p>
              </div>
            ) : <p className="mt-empty">{same ? t(DT.needFirst) : t(DT.otherCore)}</p>
          ) : sd.drafts.length ? (
            <div className="mt-list">
              {sd.drafts.map((d, i) => {
                const text = d.sentences.join(" ");
                return (
                  <div key={i} className="mt-row">
                    <div className="mt-row-b">
                      <small>{t(DT.need, { text: d.text })}</small>
                      <p style={{ marginTop: 6, fontWeight: 500 }}>{withBlanks(text)}</p>
                      <div className="mt-chips"><span className="mt-chip">{t(DT.exp, { t: d.experience.title })}</span>
                        </div>
                      <div className="mt-acts"><MatCopyButton text={text} label={t(DT.copy)} lang={lang} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="mt-empty">{same ? t(DT.needFirst) : t(DT.otherCore)}</p>}
          {missing ? (
            <p className="mt-note">{t(DT.more)} <Link href={`/mat/jobs/${p.id}`}>{t(DT.toFill)}</Link></p>
          ) : null}
        </>
      ) : null}

      {ask.ok ? <MatAsk mode="draft" lang={lang} /> : null}
      {asks.length ? (
        <section id="iv" aria-label={t(DT.ivTitle)}>
          {/* 면접 연습 언어(한국 회사 면접 · 영어 면접). 고르면 질문과 답이 그 언어로. 질문 목록은 AI 없이 선다 */}
          <h2 className="mt-h2">{t(DT.ivTitle)}</h2>
          <nav className="mt-seg" aria-label={t(DT.ivLang)}>
            <a href={ilHref("ko")} className={il === "ko" ? "is-on" : undefined} aria-current={il === "ko" ? "page" : undefined}>{t(DT.ivKo)}</a>
            <a href={ilHref("en")} className={il === "en" ? "is-on" : undefined} aria-current={il === "en" ? "page" : undefined}>{t(DT.ivEn)}</a>
          </nav>
          {ask.ok ? <MatAsk mode="interview" examples={asks.map((a) => a.question)} lang={lang} answerLang={il} /> : (
            <div className="mt-list" data-iv-lang={il}>
              {asks.map((q, i) => <div key={i} className="mt-row"><div className="mt-row-b"><p lang={il}>{q.question}</p></div></div>)}
            </div>
          )}
        </section>
      ) : null}
      {ask.ok ? null : <p className="mt-note" style={{ marginTop: 24 }}>{t(DT.toolsFrom, { date: openDay("tools", lang) })}</p>}

      <div className="mt-box" style={{ marginTop: 24 }}>
        <h3>{t(DT.personTitle)}</h3>
        <p>{t(DT.personBody)}</p>
        <Link className="mt-btn is-block" href="/mat/consult" style={{ marginTop: 12 }}>{t(DT.personGo)}</Link>
      </div>
    </main>
  );
}
