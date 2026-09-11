import Link from "next/link";
import { notFound } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import { requireRole } from "@/lib/session";
import { visibleOrgIds } from "@/lib/org-links";
import { groupReportFor } from "@/lib/group-report";
import { KIND_LABEL } from "@/lib/report";

export const metadata = { title: "단체 리포트 — 단체 PCA" };
export const dynamic = "force-dynamic";

/** 시안의 5단계 회색. 직무가 더 많으면 돌려 쓴다 */
const BAND = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)"];

/** 충족률이 낮을수록 붉게. 시안의 low/mid/high 기준을 따른다 */
function rateClass(pct: number) {
  if (pct < 50) return "low";
  if (pct < 75) return "mid";
  return "high";
}

export default async function GroupReportPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await requireRole(["org_admin", "instructor"]);

  const r = await groupReportFor(sessionId, visibleOrgIds(user), user.locale);
  if (!r) notFound();

  const missing = Math.max(0, r.enrolled - r.submitted);

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">단체 PCA</span>
        <div className="who">
          <span>{user.name} 님</span>
          <LogoutButton />
        </div>
      </header>

      <main style={{ padding: "32px 20px 80px" }}>
        <div className="gsheet">
          <div className="gtop">
            <h1>{r.orgName} 단체 리포트</h1>
            <div className="gmeta">
              <span>{r.sessionName}</span>
              <span>
                등록 {r.enrolled.toLocaleString("ko-KR")}명 · 제출{" "}
                {r.submitted.toLocaleString("ko-KR")}명
              </span>
            </div>
            <div className="gact">
              {r.releasedAt ? (
                <span className="badge open">학생 공개됨 · {r.releasedAt}</span>
              ) : (
                <span className="badge">학생 미공개</span>
              )}
              <Link className="act small" href="/org">회차 목록</Link>
            </div>
          </div>

          {r.submitted === 0 ? (
            <section>
              <h2>아직 제출된 응시가 없습니다</h2>
              <p className="gsub">
                학생이 검사를 제출하면 여기에 집계가 나타납니다. 지금까지{" "}
                {r.started.toLocaleString("ko-KR")}명이 응시를 시작했습니다.
              </p>
            </section>
          ) : r.jobs.length === 0 ? (
            <section>
              <h2>채점을 기다리고 있습니다</h2>
              <p className="gsub">
                {r.submitted.toLocaleString("ko-KR")}명이 제출했지만 아직 채점되지 않았습니다.
                채점이 끝나면 직무 분포와 역량 충족률이 여기에 나타납니다.
              </p>
            </section>
          ) : (
            <>
              <section>
                <h2>학생들이 몰린 직무</h2>
                <p className="gsub">
                  각 학생에게 가장 높게 나온 직무를 기준으로{" "}
                  {r.submitted.toLocaleString("ko-KR")}명을 나눈 결과입니다. 한쪽으로 몰려
                  있다면 학과 커리큘럼이 그 방향에 치우쳐 있다는 뜻일 수 있습니다.
                </p>
                <div className="band">
                  {r.jobs.map((j, i) => (
                    <div
                      key={j.id}
                      style={{
                        width: `${(j.count / r.submitted) * 100}%`,
                        background: BAND[i % BAND.length],
                        color: i >= 3 ? "var(--ink)" : "#fff",
                      }}
                    >
                      {j.count}명
                    </div>
                  ))}
                </div>
                <div className="legend">
                  {r.jobs.map((j, i) => (
                    <span key={j.id}>
                      <i style={{ background: BAND[i % BAND.length] }} />
                      {j.name} <em>평균 {j.avg}점</em>
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <h2>학과 전체에서 비어 있는 역량</h2>
                <p className="gsub">
                  각 학생이 자기 최적합 직무에서 요구하는 수준을 채웠는지를 세었습니다.
                  충족률이 낮을수록 학과 차원에서 손을 대야 하는 역량입니다.
                </p>
                {r.comps.length === 0 ? (
                  <p className="gsub">
                    직무에 연결된 역량 자료가 아직 없습니다. 매핑 데이터를 넣으면 표시됩니다.
                  </p>
                ) : (
                  r.comps.map((c) => {
                    const pct = c.total ? Math.round((c.met / c.total) * 100) : 0;
                    return (
                      <div className="cg" key={c.id}>
                        <span className="lab">
                          {c.name}
                          <small>{KIND_LABEL[c.kind] ?? c.kind}</small>
                        </span>
                        <span className="meter">
                          <i className={rateClass(pct)} style={{ width: `${pct}%` }} />
                        </span>
                        <span className="pct">
                          {pct}%
                          <em>{c.total}명 중 {c.met}명</em>
                        </span>
                      </div>
                    );
                  })
                )}
              </section>

              <section>
                <h2>커리큘럼 검토가 필요한 과목</h2>
                <p className="gsub">
                  비어 있는 역량을 채워주는 과목을 학과 개설 현황과 대조했습니다.
                </p>
                {r.courses.length === 0 ? (
                  <p className="gsub">
                    부족한 역량을 다루는 과목이 연결되지 않았습니다. 학과의 과목 자료를
                    넣으면 표시됩니다.
                  </p>
                ) : (
                  r.courses.map((c) => (
                    <div className="gcourse" key={c.id}>
                      <h3>
                        {c.name}
                        {c.offered ? null : <span className="flag">미개설</span>}
                      </h3>
                      <span className="need">{c.need.toLocaleString("ko-KR")}명에게 필요</span>
                      <p>
                        {c.code}
                        {c.offered
                          ? " · 개설되어 있습니다. 수강 안내만으로도 충족률이 올라갑니다."
                          : " · 이번 학기 개설 목록에 없습니다."}
                      </p>
                    </div>
                  ))
                )}
              </section>
            </>
          )}

          <section>
            <h2>미제출</h2>
            <p className="miss">
              <b>{missing.toLocaleString("ko-KR")}명</b>
              <span>
                응시 기간 종료 {r.closesAt} · 남은 응시권{" "}
                {r.seatsLeft.toLocaleString("ko-KR")}개
              </span>
            </p>
          </section>

          <div className="gfoot">
            집계만 보여줍니다. 개인이 무엇이 부족한지는 이 화면에 나오지 않습니다.
          </div>
        </div>
      </main>
    </div>
  );
}
