import type { MatchedPosting } from "@/lib/assistant/match";
import { daysLeft, REGION_KO, SOURCE_KO } from "@/lib/mat/stage";
import { outLink } from "@/lib/mat/out-link";
import { matAnalyzeJob } from "./actions";

/**
 * 공고 한 줄(홈 · 공고 화면이 같이 쓴다).
 *
 * - **회사 이름이 없다**(저장하지 않는다, 직업정보제공사업 범위). 출처 · 지역 · 마감 · 요구 · 겹친 낱말만
 * - 겹친 낱말은 칩으로 세운다. 이 공고가 왜 위에 왔는지가 그대로 보인다(점수를 만들지 않는다)
 * - `바로 분석` 은 서버가 이 번호의 공고를 다시 읽어 비교한다. 화면이 보낸 글은 믿지 않는다
 * - 본문이 그림이라 요구를 못 읽은 공고에는 분석 단추를 세우지 않는다(누르면 빈 결과가 나온다)
 */
export function JobCard({ p, analyze = true }: { p: MatchedPosting; analyze?: boolean }) {
  const left = daysLeft(p.closes_on);
  const title = p.requirements[0] ?? null;
  const link = outLink(p.source_url, p.source);
  return (
    <div className="mt-row">
      <div className="mt-row-b">
        <div className="mt-job-h">
          <span className="mt-meta">
            {SOURCE_KO[p.source] ?? p.source}{p.region_code ? ` · ${REGION_KO[p.region_code] ?? "그 밖"}` : ""}
          </span>
          <span className={`mt-dday${left !== null && left <= 7 ? "" : " is-quiet"}`}>
            {left === null ? "상시" : left <= 0 ? "오늘 마감" : `D-${left}`}
          </span>
        </div>
        <p style={{ marginTop: 6 }}>{title ?? "요건을 글로 읽지 못한 공고 · 원문에서 확인"}</p>
        {p.hits.length ? (
          <div className="mt-chips" aria-label="겹친 낱말">
            {p.hits.slice(0, 4).map((h) => <span key={h} className="mt-chip">{h}</span>)}
            {p.hits.length > 4 ? <span className="mt-chip is-more">+{p.hits.length - 4}</span> : null}
          </div>
        ) : null}
        <div className="mt-acts">
          {analyze && title ? (
            <form action={matAnalyzeJob}>
              <input type="hidden" name="job" value={p.id} />
              <button type="submit" className="mt-btn is-small">내 경험과 맞춰 보기</button>
            </form>
          ) : null}
          {link ? (
            <a className="mt-link" href={link} target="_blank" rel="noopener noreferrer">공고 원문 보기</a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
