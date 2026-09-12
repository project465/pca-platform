import Link from "next/link";
import { query } from "@/lib/db";
import { namesOf } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import { listGallery, mentorForUser } from "@/lib/mentoring";
import {
  CAREER_PATHS,
  CAREER_PATH_LABEL,
  careerPathLabel,
  DEGREES,
  DEGREE_LABEL,
  degreeLabel,
  FIELD_TRACKS,
  FIELD_TRACK_LABEL,
  companyScaleLabel,
} from "@/lib/anon";
import { formatSlot } from "@/lib/notify";
import MentoringShell from "@/components/mentoring-shell";

export const metadata = { title: "멘토 둘러보기 — 현멘" };
export const dynamic = "force-dynamic";

/**
 * 갤러리. 카드에는 익명 표기와 속성만 나온다 (lib/anon.ts).
 * "지금 신청할 수 있는가"가 카드마다 보여야 해서 열린 시간대 수와 가장 가까운
 * 시간대를 같이 띄운다. 열린 시간대가 없는 멘토는 뒤로 밀린다.
 */
export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; degree?: string; path?: string; track?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const jobId = /^\d+$/.test(sp.job ?? "") ? sp.job : undefined;
  const degree = DEGREES.includes((sp.degree ?? "") as never) ? sp.degree : undefined;
  const path = CAREER_PATHS.includes((sp.path ?? "") as never) ? sp.path : undefined;
  const track = FIELD_TRACKS.includes((sp.track ?? "") as never) ? sp.track : undefined;

  const [cards, mine, clusters] = await Promise.all([
    listGallery({ jobId, degree, path, track }),
    mentorForUser(user.id),
    query<{ id: string; code: string }>(
      `SELECT id, code FROM job_clusters ORDER BY sort_no, code`,
    ),
  ]);

  // 직무 영역 이름은 translations 에서 가져온다 (설계 원칙 2).
  const jobNames = await namesOf(
    "job_clusters",
    clusters.map((c) => c.id),
    user.locale,
  );
  const jobLabel = (id: string) => jobNames.get(id) ?? clusters.find((c) => c.id === id)?.code ?? id;

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { job: jobId, degree, path, track, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/mentoring?${s}` : "/mentoring";
  };

  return (
    <MentoringShell user={user} current="/mentoring" isMentor={Boolean(mine)}>
      <div className="page-head">
        <h1>현직자 멘토링</h1>
        <span className="count">{cards.length}명</span>
      </div>

      <p className="lede">
        <b>석·박사</b>가 석·박사에게 묻는 자리입니다. 멘토는 학위 과정을 지나 지금 그
        경로에 있는 사람이고, 전원 익명입니다 — 소속 회사명과 실명은 공개되지 않습니다.
        시간대를 골라 신청하면 멘토가 <b>24시간 안에</b> 답하고, 승낙되는 순간 줌 링크가
        자동으로 만들어져 두 사람에게 발송됩니다.
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
          <span className="filter-label">학위</span>
          <Link className={`chip ${!degree ? "on" : ""}`} href={qs({ degree: undefined })}>
            전체
          </Link>
          {DEGREES.map((v) => (
            <Link key={v} className={`chip ${degree === v ? "on" : ""}`} href={qs({ degree: v })}>
              {DEGREE_LABEL[v]}
            </Link>
          ))}
        </div>
        <div className="filter-row">
          <span className="filter-label">전공 계열</span>
          <Link className={`chip ${!track ? "on" : ""}`} href={qs({ track: undefined })}>
            전체
          </Link>
          {FIELD_TRACKS.map((v) => (
            <Link key={v} className={`chip ${track === v ? "on" : ""}`} href={qs({ track: v })}>
              {FIELD_TRACK_LABEL[v]}
            </Link>
          ))}
        </div>
        <div className="filter-row">
          <span className="filter-label">직무 영역</span>
          <Link className={`chip ${!jobId ? "on" : ""}`} href={qs({ job: undefined })}>
            전체
          </Link>
          {clusters.map((c) => (
            <Link
              key={c.id}
              className={`chip ${jobId === c.id ? "on" : ""}`}
              href={qs({ job: c.id })}
            >
              {jobLabel(c.id)}
            </Link>
          ))}
        </div>
      </div>

      {clusters.length === 0 ? (
        <div className="notice" style={{ marginBottom: 18 }}>
          직무 영역 데이터(job_clusters)가 아직 없습니다. 매핑 데이터를 넣으면 필터가 채워집니다.
        </div>
      ) : null}

      {cards.length === 0 ? (
        <div className="empty">
          <b>조건에 맞는 멘토가 없습니다</b>
          필터를 지우면 전체 멘토를 볼 수 있습니다. 승인된 멘토만 여기에 나옵니다.
        </div>
      ) : (
        <ul className="gallery">
          {cards.map((c) => (
            <li key={c.id} className="mcard">
              <Link href={`/mentoring/${c.handle}`} className="mcard-link">
                <div className="mcard-top">
                  <span className="mono handle">{c.handle}</span>
                  {c.rating_avg ? (
                    <span className="rating">
                      ★ {c.rating_avg}
                      <span className="rc"> ({c.review_count})</span>
                    </span>
                  ) : (
                    <span className="rating none">후기 없음</span>
                  )}
                </div>

                <h2 className="mcard-title">{c.alias}</h2>
                <div className="mcard-meta">
                  {degreeLabel(c.degree)} · {careerPathLabel(c.career_path)} · {c.years}년차
                </div>
                <div className="mcard-meta">
                  {companyScaleLabel(c.company_scale)}
                  {c.region ? ` · ${c.region}` : ""}
                </div>
                <p className="mcard-head">{c.headline}</p>

                <div className="mcard-jobs">
                  {c.job_ids.slice(0, 3).map((id) => (
                    <span key={id} className="tag">
                      {jobLabel(id)}
                    </span>
                  ))}
                  {c.job_ids.length > 3 ? (
                    <span className="tag">+{c.job_ids.length - 3}</span>
                  ) : null}
                </div>

                <div className="mcard-foot">
                  <span>{c.session_minutes}분 · 줌</span>
                  {c.open_slots > 0 ? (
                    <b className="ok">
                      {c.next_slot ? formatSlot(new Date(c.next_slot)) : ""} 외 {c.open_slots}개
                    </b>
                  ) : (
                    <span className="muted">열린 시간대 없음</span>
                  )}
                </div>
                {c.done_count > 0 ? (
                  <div className="mcard-done">누적 {c.done_count}회 진행</div>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="foot-note">
        멘토 표기는 별명 · 학위 · 진로 경로 · 연차 형식입니다. 회사명과 실명은 운영사도
        신청자 화면에 노출하지 않습니다. 전공 계열은 지금 이공계 석·박사가 중심이고,
        인문·경상은 같은 구조에 값만 추가해 넓힙니다.
      </p>
    </MentoringShell>
  );
}
