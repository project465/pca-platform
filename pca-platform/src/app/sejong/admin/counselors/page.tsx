import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireSejong } from "@/sejong/lib/session";
import { CONSENT_VERSION } from "@/sejong/lib/access";

export const dynamic = "force-dynamic";

async function assign(formData: FormData) {
  "use server";
  const a = await requireSejong("admin");
  const c = String(formData.get("counselor") ?? "");
  const p = String(formData.get("participant") ?? "");
  if (!/^\d+$/.test(c) || !/^\d+$/.test(p)) return;
  /* 상담사와 참여자가 둘 다 이 기관 사람일 때만 잇는다 */
  await query(`
    INSERT INTO sj_counselor_assignments (org_id, counselor_user_id, participant_user_id, active)
    SELECT $1, s.user_id, pp.user_id, true
      FROM sj_staff s, sj_participants pp
     WHERE s.org_id = $1 AND s.kind = 'counselor' AND s.user_id = $2 AND pp.org_id = $1 AND pp.user_id = $3
    ON CONFLICT (org_id, counselor_user_id, participant_user_id) DO UPDATE SET active = true, assigned_at = now()`,
    [a.orgId, c, p]);
  /* 한 참여자에게 활성 상담사는 한 명이다 */
  await query(`UPDATE sj_counselor_assignments SET active = false
                WHERE org_id = $1 AND participant_user_id = $3 AND counselor_user_id <> $2`, [a.orgId, c, p]);
  revalidatePath("/sejong/admin/counselors");
}

export default async function AdminCounselors() {
  const a = await requireSejong("admin");
  const counselors = await query<{ user_id: string; display_name: string; login_id: string; n: string; consented: string }>(`
    SELECT s.user_id, u.display_name, u.login_id,
           count(ca.participant_user_id) FILTER (WHERE ca.active) AS n,
           count(ca.participant_user_id) FILTER (WHERE ca.active AND (
             SELECT granted FROM consents c WHERE c.user_id = ca.participant_user_id AND c.org_id = s.org_id
               AND c.kind = 'data_visibility' ORDER BY c.created_at DESC, c.id DESC LIMIT 1)) AS consented
      FROM sj_staff s JOIN users u ON u.id = s.user_id
      LEFT JOIN sj_counselor_assignments ca ON ca.counselor_user_id = s.user_id AND ca.org_id = s.org_id
     WHERE s.org_id = $1 AND s.kind = 'counselor'
     GROUP BY s.user_id, u.display_name, u.login_id ORDER BY u.display_name`, [a.orgId]);
  const parts = await query<{ user_id: string; participant_no: string; display_name: string }>(
    `SELECT p.user_id, p.participant_no, u.display_name FROM sj_participants p JOIN users u ON u.id = p.user_id
      WHERE p.org_id = $1 ORDER BY p.participant_no`, [a.orgId]);
  const consent = await query<{ state: string; n: string }>(`
    WITH last AS (
      SELECT DISTINCT ON (user_id) user_id, granted FROM consents
       WHERE org_id = $1 AND kind = 'data_visibility' ORDER BY user_id, created_at DESC, id DESC
    )
    SELECT CASE WHEN l.granted IS NULL THEN 'none' WHEN l.granted THEN 'granted' ELSE 'withdrawn' END AS state,
           count(*) AS n
      FROM sj_participants p LEFT JOIN last l ON l.user_id = p.user_id
     WHERE p.org_id = $1 GROUP BY 1`, [a.orgId]);
  const cn = (k: string) => Number(consent.find((x) => x.state === k)?.n ?? 0);

  return (
    <>
      <h1>상담사 권한과 동의</h1>
      <p className="lead">
        상담사는 <b>배정된 참여자</b>가 <b>본인 동의</b>를 했고 <b>기관 설정이 허용</b>할 때만 그 사람의 결과를 엽니다.
        열 때마다, 그리고 거절될 때마다 기록이 남습니다. 관리자는 결과 내용을 보지 않습니다.
      </p>

      <section className="sj-section sj-grid c3">
        <div className="sj-card sj-kpi"><b>{cn("granted")}</b><span>열람 동의</span></div>
        <div className="sj-card sj-kpi"><b>{cn("withdrawn")}</b><span>동의 철회</span></div>
        <div className="sj-card sj-kpi"><b>{cn("none")}</b><span>응답 없음</span></div>
      </section>

      <section className="sj-section sj-card">
        <h2>상담사</h2>
        <table className="sj-table">
          <thead><tr><th>상담사</th><th>아이디</th><th className="num">배정</th><th className="num">그중 동의</th><th>열람 가능 조건</th></tr></thead>
          <tbody>
            {counselors.map((c) => (
              <tr key={c.user_id}>
                <td>{c.display_name}</td><td className="small">{c.login_id}</td>
                <td className="num">{Number(c.n)}</td><td className="num">{Number(c.consented)}</td>
                <td className="small">같은 기관 · 배정 · 본인 동의({CONSENT_VERSION}) · 기관 허용</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <form action={assign} className="sj-section sj-card sj-form">
        <h2>배정 바꾸기</h2>
        <div className="sj-grid c3">
          <div className="sj-field"><label htmlFor="participant">참여자</label>
            <select id="participant" name="participant">
              {parts.map((p) => <option key={p.user_id} value={p.user_id}>{p.participant_no} · {p.display_name}</option>)}
            </select></div>
          <div className="sj-field"><label htmlFor="counselor">상담사</label>
            <select id="counselor" name="counselor">
              {counselors.map((c) => <option key={c.user_id} value={c.user_id}>{c.display_name}</option>)}
            </select></div>
          <div className="sj-field"><span className="lab">&nbsp;</span><button className="sj-btn small" type="submit">배정</button></div>
        </div>
        <p className="small muted">배정은 동의를 대신하지 않습니다. 동의는 참여자 본인만 하고, 언제든 철회합니다.</p>
      </form>
    </>
  );
}
