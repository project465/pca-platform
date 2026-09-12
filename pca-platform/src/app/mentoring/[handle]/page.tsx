import Link from "next/link";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { namesOf } from "@/lib/i18n";
import { currentUser } from "@/lib/session";
import { careerPathLabel, companyScaleLabel, degreeLabel, fieldTrackLabel } from "@/lib/anon";
import { formatSlot } from "@/lib/notify";
import {
  mentorByHandle,
  mentorForUser,
  mentorStats,
  openSlots,
  reviewsFor,
} from "@/lib/mentoring";
import { isFreeUser, priceOf } from "@/lib/billing";
import { payDryRun } from "@/lib/pay";
import { refundPolicyLines, refundRules } from "@/lib/refund";
import MentoringShell from "@/components/mentoring-shell";
import ApplyForm, { type SlotOption } from "./apply-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return { title: `${handle} — 현멘` };
}

export default async function MentorDetailPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  // 로그인 없이도 본다. 신청 버튼에서 받는다
  const user = await currentUser();
  const { handle } = await params;

  const mentor = await mentorByHandle(handle);
  // 승인 전·중지된 멘토는 본인 말고는 못 본다. 링크를 알아도 마찬가지다.
  if (!mentor || (mentor.status !== "active" && mentor.user_id !== user?.id)) notFound();

  const [slots, stats, reviews, jobs, mine, free] = await Promise.all([
    openSlots(mentor.id),
    mentorStats(mentor.id),
    reviewsFor(mentor.id),
    query<{ job_id: string }>(
      `SELECT job_id FROM mentor_job_clusters WHERE mentor_id = $1`,
      [mentor.id],
    ),
    user ? mentorForUser(user.id) : Promise.resolve(null),
    user ? isFreeUser(user.id) : Promise.resolve(false),
  ]);
  const price = free ? null : await priceOf(mentor.session_minutes);
  // 돈을 받는 경우에만 환불 규정을 보여준다. 무료 세션은 돌려줄 돈이 없다
  const refundPolicy = price === null ? [] : refundPolicyLines(await refundRules());

  const jobNames = await namesOf(
    "job_clusters",
    jobs.map((j) => j.job_id),
    user?.locale ?? "ko",
  );

  const slotOptions: SlotOption[] = slots.map((s) => ({
    id: s.id,
    label: formatSlot(new Date(s.starts_at)),
  }));

  const isSelf = mentor.user_id === user?.id;

  return (
    <MentoringShell user={user} current="/mentoring" isMentor={Boolean(mine)}>
      <div className="page-head">
        <h1>{mentor.alias}</h1>
        <span className="count mono">{mentor.handle}</span>
        <div className="right">
          <Link className="act" href="/mentoring">
            목록으로
          </Link>
        </div>
      </div>

      {mentor.status !== "active" ? (
        <div className="notice" style={{ marginBottom: 18 }}>
          아직 승인 전인 프로필입니다. 승인되면 갤러리에 표시됩니다.
        </div>
      ) : null}

      <div className="detail">
        <section className="panel">
          <div className="kv">
            <div>
              <dt>학위</dt>
              <dd>{degreeLabel(mentor.degree)}</dd>
            </div>
            <div>
              <dt>진로 경로</dt>
              <dd>{careerPathLabel(mentor.career_path)}</dd>
            </div>
            <div>
              <dt>전공 계열</dt>
              <dd>{fieldTrackLabel(mentor.field_track)}</dd>
            </div>
            <div>
              <dt>현직 경력</dt>
              <dd>{mentor.years}년차</dd>
            </div>
            <div>
              <dt>회사 규모</dt>
              <dd>{companyScaleLabel(mentor.company_scale)}</dd>
            </div>
            <div>
              <dt>근무 지역</dt>
              <dd>{mentor.region ?? "비공개"}</dd>
            </div>
            <div>
              <dt>세션</dt>
              <dd>{mentor.session_minutes}분 · 줌</dd>
            </div>
            <div>
              <dt>진행</dt>
              <dd>{stats?.done_count ?? 0}회</dd>
            </div>
            <div>
              <dt>만족도</dt>
              <dd>
                {stats?.rating_avg ? `★ ${stats.rating_avg} (${stats.review_count})` : "후기 없음"}
              </dd>
            </div>
          </div>

          <h2 className="sec-h">한 줄 소개</h2>
          <p className="body">{mentor.headline}</p>

          {mentor.bio ? (
            <>
              <h2 className="sec-h">멘토가 쓴 소개</h2>
              <p className="body pre">{mentor.bio}</p>
            </>
          ) : null}

          <h2 className="sec-h">다룰 수 있는 직무 영역</h2>
          <div className="mcard-jobs">
            {jobs.length === 0 ? (
              <span className="muted">지정되지 않았습니다</span>
            ) : (
              jobs.map((j) => (
                <span key={j.job_id} className="tag">
                  {jobNames.get(j.job_id) ?? j.job_id}
                </span>
              ))
            )}
          </div>

          {reviews.length > 0 ? (
            <>
              <h2 className="sec-h">후기</h2>
              <ul className="reviews">
                {reviews.map((r, i) => (
                  <li key={i}>
                    <span className="rating">★ {r.rating}</span>
                    <span className="mono muted"> {r.created_at}</span>
                    <p>{r.comment}</p>
                  </li>
                ))}
              </ul>
              <p className="help">후기에는 작성자를 표시하지 않습니다.</p>
            </>
          ) : null}
        </section>

        <aside className="panel apply-panel">
          <h2 className="sec-h first">신청하기</h2>
          {isSelf ? (
            <div className="notice">
              내 프로필입니다. 받은 신청은 <Link href="/mentoring/mentor">멘토 콘솔</Link>에서 봅니다.
            </div>
          ) : !user ? (
            /* 여기가 로그인을 받는 자리다. 둘러보는 데는 계정이 필요 없지만,
               신청은 결제·일정·알림이 붙으므로 누구인지 알아야 한다 */
            <div className="gate">
              <p>
                {slotOptions.length > 0 ? (
                  <>
                    지금 열린 시간대가 <b>{slotOptions.length}개</b> 있습니다.
                    <br />
                    가장 이른 시간은 {slotOptions[0].label} 입니다.
                  </>
                ) : (
                  <>지금은 열린 시간대가 없습니다. 멘토가 시간대를 열면 여기에 표시됩니다.</>
                )}
              </p>
              <p className="help">
                한 번에 {mentor.session_minutes}분
                {price !== null ? ` · ${price.toLocaleString("ko-KR")}원` : ""}. 멘토가 거절하거나
                24시간 안에 답하지 않으면 자동으로 취소되고 청구되지 않습니다.
              </p>
              {refundPolicy.length > 0 ? (
                <ul className="policy-lines">
                  {refundPolicy.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              <div className="join">
                <Link className="act solid" href="/signup">
                  가입하고 신청하기
                </Link>
                <Link
                  className="act"
                  href={`/login?next=${encodeURIComponent(`/mentoring/${mentor.handle}`)}`}
                >
                  로그인
                </Link>
              </div>
              <span className="help">
                학과 계약으로 들어온 학생은 받은 계정으로 로그인하면 무료입니다.
              </span>
            </div>
          ) : (
            <ApplyForm
              handle={mentor.handle}
              slots={slotOptions}
              minutes={mentor.session_minutes}
              price={price}
              refundPolicy={refundPolicy}
              clientKey={process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? null}
              dryRun={payDryRun()}
            />
          )}
        </aside>
      </div>
    </MentoringShell>
  );
}
