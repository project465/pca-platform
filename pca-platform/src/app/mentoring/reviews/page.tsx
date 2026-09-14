import Link from "next/link";
import { currentUser } from "@/lib/session";
import { allReviews, mentorForUser, reviewSummary } from "@/lib/mentoring";
import { CAREER_PATHS, CAREER_PATH_LABEL, mentorTitle } from "@/lib/anon";
import MentoringShell from "@/components/mentoring-shell";

export const metadata = { title: "후기 — 현멘" };
export const dynamic = "force-dynamic";

/**
 * 후기 모음.
 *
 * 멘토별 상세에 흩어져 있던 것을 한자리에 모은다. 처음 온 사람이 판단할 근거가
 * 카드의 별점 숫자뿐이면 약하다 — 무슨 이야기를 듣고 왔는지가 보여야 한다.
 *
 * 작성자는 여기서도 표시하지 않는다. 익명은 멘토 쪽만의 문제가 아니다.
 * 별점만 있고 글이 없는 후기는 싣지 않는다. 읽을 것이 없기 때문이다.
 */
export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ path?: string; min?: string }>;
}) {
  const user = await currentUser();
  const sp = await searchParams;
  const path = CAREER_PATHS.includes((sp.path ?? "") as never) ? sp.path : undefined;
  const minRating = sp.min === "5" || sp.min === "4" ? Number(sp.min) : undefined;

  const [mine, reviews, summary] = await Promise.all([
    user ? mentorForUser(user.id) : Promise.resolve(null),
    allReviews({ path, minRating }),
    reviewSummary(),
  ]);

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { path, min: minRating ? String(minRating) : undefined, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/mentoring/reviews?${s}` : "/mentoring/reviews";
  };

  return (
    <MentoringShell user={user} current="/mentoring/reviews" isMentor={Boolean(mine)}>
      <div className="page-head">
        <h1>후기</h1>
        <span className="count">{reviews.length}건</span>
      </div>

      <p className="lede">
        세션을 마친 사람만 남길 수 있습니다. 작성자는 표시하지 않고, 운영사가 고르거나
        지우지 않습니다 — 낮은 별점도 그대로 남습니다.
        {summary && summary.total > 0 ? (
          <>
            {" "}
            지금까지 <b>{summary.total}건</b>이 들어왔고 평균은 <b>★ {summary.avg}</b>입니다.
            {summary.total > summary.with_comment ? (
              <>
                {" "}
                그중 글이 있는 <b>{summary.with_comment}건</b>만 아래에 싣습니다.
              </>
            ) : null}
          </>
        ) : null}
      </p>

      <div className="filters">
        <div className="filter-row">
          <span className="filter-label">진로 경로</span>
          <Link className={`chip ${!path ? "on" : ""}`} href={qs({ path: undefined })}>
            전체
          </Link>
          {CAREER_PATHS.map((v) => (
            <Link key={v} className={`chip ${path === v ? "on" : ""}`} href={qs({ path: v })}>
              {CAREER_PATH_LABEL[v]}
            </Link>
          ))}
        </div>
        <div className="filter-row">
          <span className="filter-label">별점</span>
          <Link className={`chip ${!minRating ? "on" : ""}`} href={qs({ min: undefined })}>
            전체
          </Link>
          <Link className={`chip ${minRating === 4 ? "on" : ""}`} href={qs({ min: "4" })}>
            ★4 이상
          </Link>
          <Link className={`chip ${minRating === 5 ? "on" : ""}`} href={qs({ min: "5" })}>
            ★5
          </Link>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="empty">
          <b>{path || minRating ? "조건에 맞는 후기가 없습니다" : "아직 후기가 없습니다"}</b>
          {path || minRating ? (
            <Link href="/mentoring/reviews">필터 지우고 전체 보기</Link>
          ) : (
            "세션이 끝나면 신청자가 별점과 한 줄을 남깁니다."
          )}
        </div>
      ) : (
        <ul className="review-list">
          {reviews.map((r, i) => (
            <li key={`${r.handle}-${r.created_at}-${i}`}>
              <div className="stars-line">
                <span className="score">{"★".repeat(r.rating)}</span>
                <span className="mono muted">{r.created_at}</span>
              </div>
              <p className="body">{r.comment}</p>
              <Link className="who" href={`/mentoring/${r.handle}`}>
                {mentorTitle(r)}
                <span className="mono"> {r.handle}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="foot-note">
        후기는 세션이 끝난 뒤 신청자가 직접 남깁니다. 대가를 받고 쓰거나 사실과 다르게
        쓰는 것은 <Link href="/terms">이용약관</Link>에서 금지하고 있습니다.
      </p>
    </MentoringShell>
  );
}
