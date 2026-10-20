import { query } from "@/lib/db";
import { requireSejong } from "@/sejong/lib/session";
import { participants } from "@/sejong/lib/metrics";
import AddParticipant from "./add-form";
import { setParticipantStatus } from "./actions";

export const dynamic = "force-dynamic";

const ST: Record<string, { t: string; c: string }> = {
  none: { t: "시작 전", c: "" },
  in_progress: { t: "진행 중", c: "part" },
  scored: { t: "완료", c: "ok" },
};

export default async function AdminParticipants({ searchParams }: { searchParams: Promise<{ p?: string; s?: string }> }) {
  const a = await requireSejong("admin");
  const sp = await searchParams;
  const programs = await query<{ code: string; name: string }>(
    `SELECT code, name FROM sj_programs WHERE org_id = $1 ORDER BY code`, [a.orgId]);
  const all = await participants(a.orgId);
  const rows = all.filter((r) =>
    (!sp.p || r.program_code === sp.p) && (!sp.s || (r.attempt_status ?? "none") === sp.s));

  return (
    <>
      <h1>참여자 현황</h1>
      <p className="lead">
        진단 상태·PDF·열람·동의만 보여 줍니다. <b>개인 결과 내용은 이 화면에 없습니다.</b>
        결과는 본인이 동의한 경우 배정된 상담사만 엽니다.
      </p>

      <section className="sj-card sj-section">
        <h2>참여자 계정 발급</h2>
        <AddParticipant programs={programs} />
      </section>

      <form className="sj-card sj-section sj-form" method="get">
        <div className="sj-grid c3">
          <div className="sj-field"><label htmlFor="p">사업</label>
            <select id="p" name="p" defaultValue={sp.p ?? ""}>
              <option value="">전체</option>
              {programs.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select></div>
          <div className="sj-field"><label htmlFor="s">진단 상태</label>
            <select id="s" name="s" defaultValue={sp.s ?? ""}>
              <option value="">전체</option><option value="none">시작 전</option>
              <option value="in_progress">진행 중</option><option value="scored">완료</option>
            </select></div>
          <div className="sj-field"><span className="lab">&nbsp;</span><button className="sj-btn small" type="submit">적용</button></div>
        </div>
      </form>

      <section className="sj-card sj-section">
        <h2>{rows.length}명</h2>
        <div className="sj-scroll">
          <table className="sj-table" data-testid="participants">
            <thead>
              <tr>
                <th>참여번호</th><th>이름</th><th>사업</th><th>첫 로그인</th><th>진단</th><th>시작</th><th>완료</th>
                <th className="num">PDF</th><th>최근 PDF</th><th className="num">열람</th><th>상담 동의</th><th>상담사</th><th>계정</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = ST[r.attempt_status ?? "none"] ?? ST.none;
                return (
                  <tr key={r.user_id}>
                    <td>{r.participant_no}</td>
                    <td>{r.display_name}</td>
                    <td className="small">{r.program_code}</td>
                    <td className="small">{r.last_login_at ? r.last_login_at.slice(0, 10) : "-"}</td>
                    <td><span className={`sj-badge ${st.c}`}>{st.t}</span></td>
                    <td className="small">{r.started_at?.slice(0, 10) ?? "-"}</td>
                    <td className="small">{r.scored_at?.slice(0, 10) ?? "-"}</td>
                    <td className="num">{Number(r.pdf_ready)}</td>
                    <td className="small">{r.pdf_last?.slice(0, 16) ?? "-"}</td>
                    <td className="num">{Number(r.views)}</td>
                    <td>{r.consent === true ? <span className="sj-badge ok">동의</span>
                      : r.consent === false ? <span className="sj-badge warn">철회</span>
                      : <span className="sj-badge">없음</span>}</td>
                    <td className="small">{r.counselor ?? "-"}</td>
                    <td>
                      <form action={setParticipantStatus}>
                        <input type="hidden" name="user_id" value={r.user_id} />
                        <input type="hidden" name="status" value={r.status === "active" ? "disabled" : "active"} />
                        <button className="sj-btn ghost small" type="submit">{r.status === "active" ? "중지" : "다시 열기"}</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
