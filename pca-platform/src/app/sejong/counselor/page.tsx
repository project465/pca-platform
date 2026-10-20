import Link from "next/link";
import { query } from "@/lib/db";
import { requireSejong } from "@/sejong/lib/session";

export const dynamic = "force-dynamic";

export default async function CounselorHome() {
  const a = await requireSejong("counselor");
  const rows = await query<{
    user_id: string; participant_no: string; display_name: string; program_code: string;
    attempt_status: string | null; consent: boolean | null;
  }>(`
    SELECT p.user_id, p.participant_no, u.display_name, p.program_code,
           (SELECT status FROM sj_attempts x WHERE x.user_id = p.user_id ORDER BY started_at DESC LIMIT 1) AS attempt_status,
           (SELECT granted FROM consents c WHERE c.user_id = p.user_id AND c.org_id = p.org_id
             AND c.kind = 'data_visibility' ORDER BY c.created_at DESC, c.id DESC LIMIT 1) AS consent
      FROM sj_counselor_assignments ca
      JOIN sj_participants p ON p.user_id = ca.participant_user_id AND p.org_id = ca.org_id
      JOIN users u ON u.id = p.user_id
     WHERE ca.org_id = $1 AND ca.counselor_user_id = $2 AND ca.active
     ORDER BY p.participant_no`, [a.orgId, a.userId]);

  return (
    <>
      <h1>상담사 · 내 담당 참여자</h1>
      <p className="lead">
        결과는 참여자 본인이 동의한 경우에만 열립니다. 동의가 없으면 진행 상태만 보입니다.
        여는 기록은 참여자 본인과 기관 관리자가 확인할 수 있습니다.
      </p>
      <section className="sj-card sj-section">
        <table className="sj-table">
          <thead><tr><th>참여번호</th><th>이름</th><th>사업</th><th>진단</th><th>열람 동의</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user_id}>
                <td>{r.participant_no}</td><td>{r.display_name}</td><td className="small">{r.program_code}</td>
                <td>{r.attempt_status === "scored" ? <span className="sj-badge ok">완료</span>
                  : r.attempt_status === "in_progress" ? <span className="sj-badge part">진행 중</span>
                  : <span className="sj-badge">시작 전</span>}</td>
                <td>{r.consent ? <span className="sj-badge ok">동의</span>
                  : r.consent === false ? <span className="sj-badge warn">철회</span>
                  : <span className="sj-badge">없음</span>}</td>
                <td>
                  {r.consent && r.attempt_status === "scored"
                    ? <Link className="sj-btn small" href={`/sejong/counselor/${r.user_id}`}>결과 열기</Link>
                    : <Link className="sj-btn ghost small" href={`/sejong/counselor/${r.user_id}`}>상태 보기</Link>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="muted">배정된 참여자가 없습니다.</p> : null}
      </section>
    </>
  );
}
