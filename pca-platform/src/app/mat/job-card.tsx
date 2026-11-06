import type { MatchedPosting } from "@/lib/assistant/match";
import { daysLeft, ddayLabel, regionName, sourceName } from "@/lib/mat/stage";
import { outLink } from "@/lib/mat/out-link";
import { matAnalyzeJob } from "./actions";
import { jobTitle } from "@/lib/mat/job-title";
import { sayOf, type MatUiLang } from "@/lib/mat/copy";
import type { PostingEn } from "@/lib/mat/posting-en";
import { CARD_TEXT as C } from "./mat-text";

/**
 * 공고 한 줄(홈 · 공고 화면이 같이 쓴다).
 *
 * - **회사 이름이 없다**(저장하지 않는다, 직업정보제공사업 범위). 출처 · 지역 · 마감 · 요구 · 겹친 분야어만
 * - 겹친 분야어은 칩으로 세운다. 이 공고가 왜 위에 왔는지가 그대로 보인다(점수를 만들지 않는다)
 * - `바로 분석` 은 서버가 이 번호의 공고를 다시 읽어 비교한다. 화면이 보낸 글은 믿지 않는다
 * - 본문이 그림이라 요구를 못 읽은 공고에는 분석 단추를 세우지 않는다(누르면 빈 결과가 나온다)
 * - 분류 · 지역은 머리 줄에, 분야 · 학위 표시는 제목 아래에(모을 때 읽은 칸, `db/schema_jobs_meta.sql`). 없으면 빼고 짐작하지 않는다
 * - 제목은 저장한 제목이 먼저다. 제목이 없는 공고는 목록에 오지 않는다(`pickJobs`). 들고 들어온 공고처럼
 *   목록을 거치지 않은 줄만 출처 이름으로 제목을 대신한다(2026-11-03 버그 ④)
 */
export function JobCard({ p, analyze = true, lang = "ko", en }: {
  p: MatchedPosting; analyze?: boolean;
  /** 화면 언어. 영어면 한국어 공고에 `Korean posting` 표시를 달고, 영어 요약(`en`)이 있으면 그 제목을 먼저 */
  lang?: MatUiLang; en?: PostingEn;
}) {
  const t = sayOf(lang);
  const left = daysLeft(p.closes_on);
  /* 첫 줄이 `고용 형태: …` 같은 항목 줄이면 건너뛴다(`jobTitle`) */
  const title = p.title?.trim() || jobTitle(p.requirements, p.role).title;
  const readable = p.requirements.length > 0;
  const link = outLink(p.source_url, p.source);
  const src = sourceName(p.source, lang);
  /* 영어 화면은 모을 때 읽은 한국어 칸(분류 · 지역 이름 · 분야)을 그대로 쓰지 않고 지역 코드 이름만 */
  const isEn = lang === "en";
  const region = isEn ? (p.region_code ? regionName(p.region_code, "en") : null)
    : p.region_label ?? (p.region_code ? regionName(p.region_code) : null);
  const head = [src, isEn ? null : p.category, region].filter(Boolean).join(" · ");
  const sub = (isEn && en ? [] : [p.field, p.degree_label]).filter(Boolean).join(" · ");
  /* 한국어 글이 든 공고. 영어 요약이 없으면 지어 옮기지 않고 한국어 제목에 표시만 단다 */
  const korean = isEn && /[가-힣]/.test([title ?? "", ...p.requirements.slice(0, 3)].join(" "));
  return (
    <div className="mt-row">
      <div className="mt-row-b">
        <div className="mt-job-h">
          <span className="mt-meta">{head}</span>
          <span className={`mt-dday${left !== null && left <= 7 ? "" : " is-quiet"}`}>
            {ddayLabel(left, lang)}
          </span>
        </div>
        {isEn && en ? (
          <>
            <p style={{ marginTop: 6 }} lang="en">{en.title}</p>
            <small><span className="mt-chip">{t(C.enSummary)}</span> <span lang="ko">{title}</span></small>
          </>
        ) : (
          <>
            <p style={{ marginTop: 6 }} lang={korean ? "ko" : undefined}>{title ?? (readable ? t(C.srcPosting, { src }) : t(C.unread))}</p>
            {korean ? <small><span className="mt-chip">{t(C.korean)}</span></small> : null}
          </>
        )}
        {sub ? <small lang={isEn ? "ko" : undefined}>{sub}</small> : null}
        {p.hits.length ? (
          <div className="mt-chips" aria-label={t(C.hitsAria)}>
            {p.hits.slice(0, 4).map((h) => <span key={h} className="mt-chip" lang={isEn && /[가-힣]/.test(h) ? "ko" : undefined}>{h}</span>)}
            {p.hits.length > 4 ? <span className="mt-chip is-more">+{p.hits.length - 4}</span> : null}
          </div>
        ) : null}
        <div className="mt-acts">
          {analyze && readable ? (
            <form action={matAnalyzeJob}>
              <input type="hidden" name="job" value={p.id} />
              <button type="submit" className="mt-btn is-small">{t(C.compare)}</button>
            </form>
          ) : null}
          {link ? (
            <a className="mt-link" href={link} target="_blank" rel="noopener noreferrer">{t(C.original)}</a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
