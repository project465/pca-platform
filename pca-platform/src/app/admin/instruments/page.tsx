import Link from "next/link";
import { query } from "@/lib/db";
import { namesOf } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";

export const metadata = { title: "검사 문항 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  major_id: string;
  major_code: string;
  version: string;
  status: string;
  questions: number;
  indicators: number;
  jobs: number;
  filled: number;
  attempts: number;
};

export default async function InstrumentsPage() {
  const user = await requireRole(["superadmin"]);

  const rows = await query<Row>(
    `SELECT i.id, i.major_id, m.code AS major_code, i.version, i.status,
            (SELECT count(*) FROM questions q WHERE q.instrument_id = i.id)::int AS questions,
            (SELECT count(*) FROM indicators n WHERE n.instrument_id = i.id)::int AS indicators,
            (SELECT count(*) FROM job_clusters j WHERE j.major_id = i.major_id)::int AS jobs,
            (SELECT count(*) FROM scoring_weights w
              WHERE w.instrument_id = i.id AND w.weight > 0)::int AS filled,
            (SELECT count(*) FROM test_sessions ts
               JOIN attempts a ON a.session_id = ts.id
              WHERE ts.instrument_id = i.id)::int AS attempts
       FROM instruments i
       JOIN majors m ON m.id = i.major_id
      ORDER BY i.published_at DESC NULLS LAST, i.id DESC`,
  );
  const names = await namesOf("majors", rows.map((r) => r.major_id), user.locale);

  return (
    <AdminShell user={user} current="/admin/instruments">
      <div className="page-head">
        <h1>검사 문항</h1>
        <span className="count">{rows.length}개</span>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <b>등록된 검사 도구가 없습니다</b>
          문항을 넣으면 여기에 표시됩니다.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>전공 계열</th>
                <th>버전</th>
                <th style={{ textAlign: "right" }}>문항</th>
                <th style={{ textAlign: "right" }}>지표</th>
                <th>채점 가중치</th>
                <th style={{ textAlign: "right" }}>응시</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const total = r.indicators * r.jobs;
                return (
                  <tr key={r.id}>
                    <td>{names.get(r.major_id) ?? r.major_code}</td>
                    <td className="mono">{r.version}</td>
                    <td className="num">{r.questions}</td>
                    <td className="num">{r.indicators}</td>
                    <td>
                      {r.filled === 0 ? (
                        <span className="tag" style={{ borderColor: "var(--gap)", color: "var(--gap)" }}>
                          비어 있음
                        </span>
                      ) : (
                        <span className="tag active">
                          {r.filled} / {total}
                        </span>
                      )}
                      <span className="sub">
                        <Link href={`/admin/instruments/${r.id}`}>
                          {r.filled === 0 ? "가중치 채우기" : "가중치 보기"}
                        </Link>
                      </span>
                    </td>
                    <td className="num">{r.attempts}</td>
                    <td>
                      <span className={`tag ${r.status === "published" ? "active" : ""}`}>
                        {r.status === "published" ? "공개" : r.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="foot-note">
        가중치를 채워야 채점이 돕니다. 직무 적합도는 지표 점수에 이 가중치를 곱해 더한 값입니다.
      </p>
    </AdminShell>
  );
}
