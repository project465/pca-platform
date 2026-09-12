import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser, roleInOrg } from "@/lib/session";
import { nameOf } from "@/lib/i18n";
import { mentorFacets } from "@/lib/anon";
import { formatSlot } from "@/lib/notify";
import { mentorsForJob } from "@/lib/mentoring";
import {
  attemptHeader,
  competencyGaps,
  courseRx,
  isReleased,
  jobFits,
} from "@/lib/report";

export const metadata = { title: "결과지 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

/** 시안(mockups/02_student_report.html)의 다섯 칸 블록. 요구 수준까지만 칸을 그린다. */
function Blocks({ required, held }: { required: number; held: number }) {
  return (
    <span className="blocks">
      {Array.from({ length: 5 }, (_, i) => {
        const level = i + 1;
        if (level <= held) return <span key={i} className="has" />;
        if (level <= required) return <span key={i} className="short" />;
        return <span key={i} />;
      })}
    </span>
  );
}

function verdictOf(required: number, held: number) {
  const gap = required - held;
  if (gap <= 0) return { cls: "ok", text: "충족" };
  if (gap >= 3) return { cls: "no", text: `${gap}단계 부족` };
  return { cls: "mid", text: `${gap}단계 부족` };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const user = await requireUser();
  const { attemptId } = await params;
  if (!/^\d+$/.test(attemptId)) notFound();

  const head = await attemptHeader(attemptId);
  if (!head) notFound();

  // 본인, 그 학과의 담당자·교수, 운영사 관리자만 연다.
  const isOwner = head.user_id === user.id;
  const staffRole = roleInOrg(user, head.org_id);
  const isStaff = staffRole !== null && staffRole !== "student";
  if (!isOwner && !isStaff) notFound();

  // 공개 전 결과지는 학생에게 보이지 않는다. 담당자는 공개 전에도 확인할 수 있다.
  if (!isReleased(head) && !isStaff) redirect("/my");

  const fits = await jobFits(attemptId, user.locale);
  if (fits.length === 0) {
    return (
      <div className="sheet-wrap">
        <div className="sheet">
          <div className="top">
            <h1>결과지</h1>
          </div>
          <section>
            <p className="lead-note">
              아직 채점 결과가 없습니다. 채점이 끝나면 이 자리에 직무 적합도가 표시됩니다.
            </p>
          </section>
        </div>
      </div>
    );
  }

  const top = fits[0];
  const orgIds = [head.org_id, head.parent_org_id].filter((v): v is string => v !== null);

  const [gaps, courses, mentors, majorName] = await Promise.all([
    competencyGaps(attemptId, top.job_id, user.locale),
    courseRx(attemptId, top.job_id, orgIds, user.locale),
    mentorsForJob(top.job_id, 3),
    nameOf("majors", head.major_id, user.locale),
  ]);

  const submitted = head.submitted_at
    ? new Date(head.submitted_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })
    : null;

  return (
    <div className="sheet-wrap">
      <div className="sheet">
        <div className="top">
          <h1>{majorName ? `${majorName} 진로지표 결과` : "진로지표 결과"}</h1>
          <div className="meta">
            <span>{head.display_name}</span>
            <span>{head.session_name}</span>
            {submitted ? <span>{submitted} 응시</span> : null}
          </div>
        </div>

        <section>
          <h2>가장 가까운 직무</h2>
          <div className="lead">
            <span className="name">{top.name}</span>
            <span className="score">
              <b>{Number(top.fit_score)}</b>/100
            </span>
          </div>
          <p className="lead-note">
            아래 직무는 이 전공 졸업자가 실제로 입직하는 분야이며, 점수는 각 직무의 요구 지표와
            {head.display_name} 님의 응답을 대조한 값입니다.
          </p>

          {fits.map((f) => (
            <div key={f.job_id} className={`gauge ${f.rank_no === 1 ? "is-top" : ""}`}>
              <span className="lab">{f.name}</span>
              <span className="track">
                <span className="ticks">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span className="bar" style={{ width: `${Number(f.fit_score)}%` }} />
              </span>
              <span className="val">{Number(f.fit_score)}</span>
              {/* 결과지에서 바로 현직자에게 가는 길. 멘토가 있는 직무에만 띄운다. */}
              <span className="gauge-link">
                {f.mentor_count > 0 ? (
                  <Link href={`/mentoring?job=${f.job_id}&from=report`}>
                    현직자 {f.mentor_count}명
                  </Link>
                ) : null}
              </span>
            </div>
          ))}
          <div className="scale">
            <span />
            <span>
              <em>0</em>
              <em>20</em>
              <em>40</em>
              <em>60</em>
              <em>80</em>
              <em>100</em>
            </span>
            <span />
            <span />
          </div>
        </section>

        <section>
          <h2>{top.name} 직무가 요구하는 역량</h2>
          {gaps.length === 0 ? (
            <p className="lead-note">이 직무의 요구 역량 데이터가 아직 등록되지 않았습니다.</p>
          ) : (
            gaps.map((g) => {
              const v = verdictOf(g.required_level, g.held_level);
              return (
                <div key={g.competency_id} className="comp">
                  <span className="lab">
                    {g.name}
                    <small>{g.type_label}</small>
                  </span>
                  <Blocks required={g.required_level} held={g.held_level} />
                  <span className={`verdict ${v.cls}`}>{v.text}</span>
                </div>
              );
            })
          )}
        </section>

        {courses.length > 0 ? (
          <section>
            <h2>다음 학기에 들을 과목</h2>
            <p className="lead-note" style={{ marginBottom: 18 }}>
              부족분이 큰 역량부터, 그것을 메우는 과목을 골랐습니다.
            </p>
            {courses.map((c) => (
              <div key={c.course_id} className="course">
                <h3>{c.name}</h3>
                <span className="code">
                  {[c.course_code, c.credit ? `${c.credit}학점` : null, c.term_hint]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span className="tags">
                  {c.fills.map((f, i) => (
                    <b key={i}>{f}</b>
                  ))}
                </span>
              </div>
            ))}
          </section>
        ) : null}

        {/*
          결과지의 마지막 칸. 역량과 과목은 학교 안에서 메우는 길이고,
          이 칸은 학교 밖에서 확인하는 길이다. 둘을 한 문서에 두는 것이 핵심이다.
        */}
        <section>
          <h2>{top.name} 현직자에게 묻기</h2>
          {mentors.length === 0 ? (
            <p className="lead-note">
              이 직무 영역에 지금 신청할 수 있는 현직자가 없습니다.{" "}
              <Link href="/mentoring">전체 멘토 보기</Link>
            </p>
          ) : (
            <>
              <p className="lead-note">
                이 직무 영역을 다루는 석·박사 현직자입니다. 멘토는 익명이고, 시간대를 고르면
                승낙 뒤 줌 링크가 자동으로 발송됩니다.
              </p>
              <ul className="rec-list">
                {mentors.map((m) => (
                  <li key={m.id}>
                    <Link href={`/mentoring/${m.handle}`}>
                      <b>{m.alias}</b>
                      <span className="rec-meta">{mentorFacets(m)}</span>
                      <span className="rec-head">{m.headline}</span>
                      <span className="rec-slot">
                        {m.next_slot
                          ? `${formatSlot(new Date(m.next_slot))} 외 ${m.open_slots}개`
                          : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="sheet-more">
                <Link href={`/mentoring?job=${top.job_id}&from=report`}>
                  이 직무 현직자 전체 보기 →
                </Link>
              </p>
            </>
          )}
        </section>

        <div className="foot">
          {isOwner ? (
            <Link href="/my">내 검사로 돌아가기</Link>
          ) : (
            <>학과 담당자 권한으로 열람 중입니다. 공개 전 결과지도 보입니다.</>
          )}
        </div>
      </div>
    </div>
  );
}
