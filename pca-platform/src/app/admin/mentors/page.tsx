import { query } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { careerPathLabel, companyScaleLabel, degreeLabel } from "@/lib/anon";
import AdminShell from "@/components/admin-shell";
import { ApproveForm, PauseForm } from "./mentor-rows";

export const metadata = { title: "현직자 멘토 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  handle: string;
  alias: string;
  years: number;
  degree: string;
  career_path: string;
  company_scale: string;
  region: string | null;
  headline: string;
  status: string;
  verify_note: string | null;
  display_name: string;
  email: string | null;
  job_count: number;
  done_count: number;
  created_at: string;
};

/**
 * 운영사만 보는 화면. 여기서만 멘토의 실명·이메일이 보인다.
 * 현직 인증을 하려면 누구인지 알아야 하기 때문이고, 그 대신 이 화면은
 * superadmin 으로 닫혀 있다 (admin/layout.tsx).
 */
export default async function AdminMentorsPage() {
  const user = await requireRole(["superadmin"]);

  const rows = await query<Row>(
    `SELECT m.id, m.handle, m.alias, m.years, m.degree, m.career_path,
            m.company_scale, m.region, m.headline,
            m.status, m.verify_note, u.display_name, u.email,
            (SELECT count(*) FROM mentor_job_clusters j WHERE j.mentor_id = m.id)::int AS job_count,
            (SELECT count(*) FROM mentoring_requests r
              WHERE r.mentor_id = m.id AND r.status = 'completed')::int AS done_count,
            to_char(m.created_at, 'YYYY-MM-DD') AS created_at
       FROM mentors m
       JOIN users u ON u.id = m.user_id
      ORDER BY m.status <> 'pending',   -- 심사할 것이 위로
               m.created_at DESC`,
  );

  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <AdminShell user={user} current="/admin/mentors">
      <div className="page-head">
        <h1>현직자 멘토</h1>
        <span className="count">
          {rows.length}명 {pending > 0 ? `· 승인 대기 ${pending}명` : ""}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <b>등록된 멘토가 없습니다</b>
          현직자가 <span className="mono">/mentoring/mentor</span> 에서 프로필을 만들면 여기에 뜹니다.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>handle</th>
                <th>별명 · 속성</th>
                <th>실명 / 연락처</th>
                <th>직무</th>
                <th style={{ textAlign: "right" }}>완료</th>
                <th>상태</th>
                <th>인증 근거 · 처리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.handle}</td>
                  <td>
                    {r.alias}
                    <span className="sub">
                      {degreeLabel(r.degree)} · {careerPathLabel(r.career_path)} · {r.years}년차
                    </span>
                    <span className="sub">
                      {companyScaleLabel(r.company_scale)}
                      {r.region ? ` · ${r.region}` : ""}
                    </span>
                  </td>
                  <td>
                    {r.display_name}
                    <span className="sub">{r.email ?? "이메일 없음 — 화면 알림으로 전달"}</span>
                  </td>
                  <td className="num">{r.job_count}</td>
                  <td className="num">{r.done_count}</td>
                  <td>
                    <span className={`tag ${r.status === "active" ? "active" : ""}`}>
                      {r.status === "active"
                        ? "승인"
                        : r.status === "pending"
                          ? "대기"
                          : "중지"}
                    </span>
                  </td>
                  <td>
                    {r.status === "active" ? (
                      <>
                        <span className="sub" style={{ marginBottom: 6 }}>
                          {r.verify_note}
                        </span>
                        <PauseForm mentorId={r.id} />
                      </>
                    ) : (
                      <ApproveForm mentorId={r.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
