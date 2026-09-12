import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canEditSession, canViewSession, orgNameOf } from "@/lib/org";
import {
  competencyFill,
  courseNeeds,
  groupHeader,
  topJobSpread,
} from "@/lib/group-report";
import ReleaseButton from "../release-button";

export const metadata = { title: "단체 리포트 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

const day = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(
    new Date(iso),
  );

const SHADE = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)"];

export default async function GroupReportPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await requireUser();
  const { sessionId } = await params;
  if (!/^\d+$/.test(sessionId)) notFound();
  if (!(await canViewSession(user, sessionId))) notFound();

  const head = await groupHeader(sessionId);
  if (!head) notFound();

  const canEdit = await canEditSession(user, sessionId);
  const orgIds = [head.org_id, head.parent_org_id].filter((v): v is string => v !== null);

  const [orgName, jobs, comps, courses] = await Promise.all([
    orgNameOf(head.org_id, user.locale),
    topJobSpread(sessionId, user.locale),
    competencyFill(sessionId, user.locale),
    courseNeeds(sessionId, orgIds, user.locale),
  ]);

  const released = head.release_mode === "instant" || head.released_at !== null;
  const total = jobs.reduce((a, j) => a + j.count, 0);

  return (
    <div className="sheet-wrap">
      <div className="sheet group">
        <div className="top">
          <h1>{orgName ? `${orgName} 단체 리포트` : "단체 리포트"}</h1>
          <div className="meta">
            <span>{head.name}</span>
            <span>
              대상 {head.roster}명 · 응시 {head.submitted}명 · 채점 {head.scored}명
            </span>
          </div>
          <div className="act">
            <span className={`badge ${released ? "open" : ""}`}>
              {released
                ? head.released_at
                  ? `학생 공개됨 · ${day(head.released_at)}`
                  : "채점 즉시 공개"
                : "학생 미공개"}
            </span>
            {canEdit && head.release_mode === "manual" && head.scored > 0 ? (
              <ReleaseButton sessionId={sessionId} releasedAt={head.released_at} compact />
            ) : null}
          </div>
        </div>

        {head.scored === 0 ? (
          <section>
            <h2>아직 채점된 응시가 없습니다</h2>
            <p className="sub">
              제출된 응시를 채점하면 여기에 집계가 나옵니다.{" "}
              <Link href={`/org/sessions/${sessionId}`}>회차 화면</Link>에서 채점하세요.
            </p>
          </section>
        ) : (
          <>
            <section>
              <h2>학생들이 몰린 직무</h2>
              <p className="sub">
                각 학생에게 가장 높게 나온 직무를 기준으로 {total}명을 나눈 결과입니다.
                한쪽으로 몰려 있다면 학과 커리큘럼이 그 방향에 치우쳐 있다는 뜻일 수 있습니다.
              </p>
              <div className="band">
                {jobs.slice(0, 5).map((j, i) => (
                  <div
                    key={j.job_id}
                    style={{ width: `${(j.count / total) * 100}%`, background: SHADE[i] }}
                    title={`${j.name} ${j.count}명`}
                  >
                    {j.count}명
                  </div>
                ))}
                {jobs.length > 5 ? (
                  <div
                    style={{
                      width: `${(jobs.slice(5).reduce((a, j) => a + j.count, 0) / total) * 100}%`,
                      background: "var(--rule)",
                      color: "var(--ink)",
                    }}
                  >
                    {jobs.slice(5).reduce((a, j) => a + j.count, 0)}명
                  </div>
                ) : null}
              </div>
              <div className="legend">
                {jobs.slice(0, 5).map((j, i) => (
                  <span key={j.job_id}>
                    <i style={{ background: SHADE[i] }} />
                    {j.name} <em>평균 {j.avg}점</em>
                  </span>
                ))}
                {jobs.length > 5 ? (
                  <span>
                    <i style={{ background: "var(--rule)" }} />그 외 {jobs.length - 5}개 직무
                  </span>
                ) : null}
              </div>
            </section>

            <section>
              <h2>학과 전체에서 비어 있는 역량</h2>
              <p className="sub">
                각 학생이 자기 최적합 직무에서 요구하는 수준을 채웠는지를 세었습니다.
                충족률이 낮을수록 학과 차원에서 손을 대야 하는 역량입니다.
              </p>
              {comps.length === 0 ? (
                <p className="sub">
                  직무별 요구 역량(job_competency_map)이 등록돼 있지 않아 셀 것이 없습니다.
                </p>
              ) : (
                comps.map((c) => (
                  <div key={c.competency_id} className="cg">
                    <span className="lab">
                      {c.name}
                      <small>{c.type_label}</small>
                    </span>
                    <span className="meter">
                      <i
                        className={c.pct < 40 ? "low" : c.pct < 70 ? "mid" : "high"}
                        style={{ width: `${c.pct}%` }}
                      />
                    </span>
                    <span className="pct">
                      {c.pct}%
                      <em>
                        {c.asked}명 중 {c.met}명
                      </em>
                    </span>
                  </div>
                ))
              )}
            </section>

            {courses.length > 0 ? (
              <section>
                <h2>커리큘럼 검토가 필요한 과목</h2>
                <p className="sub">비어 있는 역량을 채워주는 과목을 학과 개설 현황과 대조했습니다.</p>
                {courses.map((c) => (
                  <div key={c.course_id} className="course">
                    <h3>
                      {c.name}
                      {c.is_offered ? null : <span className="flag">미개설</span>}
                    </h3>
                    <span className="need">{c.need}명에게 필요</span>
                    <p>
                      {[c.course_code, c.credit ? `${c.credit}학점` : null, c.term_hint]
                        .filter(Boolean)
                        .join(" · ")}
                      {" · 메우는 역량 "}
                      {c.fills.join(", ")}
                      {c.is_offered
                        ? ""
                        : ". 이번 학기 개설 목록에 없어 수강 자체가 불가능합니다."}
                    </p>
                  </div>
                ))}
              </section>
            ) : null}
          </>
        )}

        <section>
          <h2>미응시</h2>
          <p className="miss">
            <b>{head.not_taken}명</b>
            <span>
              응시 기간 종료 {day(head.closes_at)} · 남은 응시권 {head.free_seats}개
            </span>
          </p>
        </section>

        <div className="foot">
          <Link href={`/org/sessions/${sessionId}`}>회차 화면으로</Link>
          <span className="foot-right">
            익명 집계입니다. 개인별 결과는 학생 본인과 학과 담당자만 볼 수 있습니다.
          </span>
        </div>
      </div>
    </div>
  );
}
