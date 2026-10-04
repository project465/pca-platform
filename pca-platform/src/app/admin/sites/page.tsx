import AdminShell from "@/components/admin-shell";
import { requireRole } from "@/lib/session";
import { listSites } from "@/lib/sites";
import { query } from "@/lib/db";

export const metadata = { title: "사이트와 나라 · Careermetri" };

/**
 * 사이트와 나라.
 *
 * **도메인을 코드에 적지 않는다.** 여기 한 표에서만 읽는다. 철자가 바뀌어도
 * 고칠 곳이 한 줄이다.
 *
 * **화면 언어 · 사이트 지역 · 목표 국가는 다른 값이다.** 한국 사이트를
 * 한국어로 쓰면서 미국 시장을 보는 사람이 가장 흔하다.
 */
export default async function Sites() {
  const user = await requireRole(["superadmin"]);
  const sites = await listSites();
  const packs = await query<{
    country_code: string; version: string; status: string; verified_at: string | null;
  }>(`SELECT country_code, version, status, verified_at::text
        FROM country_packs ORDER BY country_code, version`);

  return (
    <AdminShell user={user} current="/admin/sites">
      <h1 className="page-h1">사이트와 나라</h1>
      <p className="page-sub">
        도메인·언어·통화·결제 시장은 여기서만 정합니다. 화면 어디에도 도메인을
        적어 두지 않았습니다.
      </p>

      <section className="card">
        <h2>사이트</h2>
        <table className="table">
          <thead>
            <tr><th>id</th><th>도메인</th><th>기본 언어</th><th>통화</th>
              <th>결제 시장</th><th>사이트 지역</th><th>내놓는 언어</th></tr>
          </thead>
          <tbody>
            {sites.map((s) => (
              <tr key={s.site_id}>
                <td>{s.site_id}</td><td>{s.domain}</td>
                <td>{s.default_language}</td><td>{s.default_currency}</td>
                <td>{s.payment_market}</td><td>{s.site_region ?? "—"}</td>
                <td>{s.offered_languages.join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">
          사이트 지역은 목표 국가가 아닙니다. 응시 한 건마다 목표 국가를 따로
          담습니다.
        </p>
      </section>

      <section className="card">
        <h2>나라 묶음</h2>
        {packs.length === 0 ? (
          <>
            <p className="empty">확인된 나라 자료가 아직 없습니다.</p>
            <p className="muted">
              그래서 결과지는 전부 Global Reference Mode 로 나갑니다. 임금·비자·
              면허를 지어내지 않습니다. 확인된 자료가 생기면 여기에 줄이 늡니다.
            </p>
          </>
        ) : (
          <table className="table">
            <thead><tr><th>나라</th><th>판</th><th>상태</th><th>확인한 날</th></tr></thead>
            <tbody>
              {packs.map((p) => (
                <tr key={`${p.country_code}-${p.version}`}>
                  <td>{p.country_code}</td><td>{p.version}</td>
                  <td>{p.status}</td><td>{p.verified_at ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AdminShell>
  );
}
