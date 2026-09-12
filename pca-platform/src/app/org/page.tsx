import Link from "next/link";
import { requireRole } from "@/lib/session";
import { contractsOf, myOrgIds, orgNameOf, sessionsOf } from "@/lib/org";
import OrgShell from "@/components/org-shell";

export const metadata = { title: "학과 담당자 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));

export default async function OrgHome() {
  const user = await requireRole(["org_admin", "instructor"]);
  const orgIds = myOrgIds(user);

  const [contracts, sessions, orgName] = await Promise.all([
    contractsOf(orgIds),
    sessionsOf(orgIds),
    orgIds[0] ? orgNameOf(orgIds[0], user.locale) : Promise.resolve(null),
  ]);

  const canCreate = user.role === "org_admin" && contracts.some((c) => !c.expired);

  return (
    <OrgShell user={user} orgName={orgName}>
      <div className="page-head">
        <h1>회차</h1>
        <span className="count">{sessions.length}개</span>
        <div className="right">
          {canCreate ? (
            <Link className="act solid" href="/org/sessions/new">
              회차 만들기
            </Link>
          ) : null}
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="notice" style={{ marginBottom: 18 }}>
          등록된 계약이 없습니다. 운영사가 계약을 등록하면 회차를 열 수 있습니다.
        </div>
      ) : (
        <div className="stat-row" style={{ marginBottom: 22 }}>
          {contracts.slice(0, 4).map((c) => (
            <div key={c.id}>
              <dt>
                {c.title}
                {c.expired ? " (만료)" : ""}
              </dt>
              <dd className={c.free_seats === 0 ? "warn" : ""}>
                {c.free_seats.toLocaleString("ko-KR")}
                <span style={{ fontSize: 13, fontWeight: 400, color: "var(--muted)" }}>
                  {" "}
                  / {c.seat_count.toLocaleString("ko-KR")} 남음
                </span>
              </dd>
            </div>
          ))}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="empty">
          <b>연 회차가 없습니다</b>
          회차를 만들고 명단을 올리면 학생 계정이 한꺼번에 발급됩니다.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>회차</th>
                <th>기간</th>
                <th style={{ textAlign: "right" }}>명단</th>
                <th style={{ textAlign: "right" }}>제출</th>
                <th style={{ textAlign: "right" }}>채점</th>
                <th>결과 공개</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/org/sessions/${s.id}`}>{s.name}</Link>
                    <span className="sub">{s.contract_title}</span>
                  </td>
                  <td className="mono">
                    {fmt(s.opens_at)}
                    <span className="sub">~ {fmt(s.closes_at)}</span>
                  </td>
                  <td className="num">{s.roster}</td>
                  <td className="num">{s.submitted}</td>
                  <td className="num">{s.scored}</td>
                  <td>
                    {s.release_mode === "instant" ? (
                      <span className="tag active">즉시 공개</span>
                    ) : s.released_at ? (
                      <span className="tag active">공개함</span>
                    ) : (
                      <span className="tag">공개 전</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </OrgShell>
  );
}
