import Link from "next/link";
import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { query } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead } from "@/components/sf/shell";
import { NAV_INDIVIDUAL } from "@/components/sf/nav";
import { Card, Empty, Pill } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `결과 · ${BRAND.root}` };

/** 결과지 목록. **등급을 숨기지 않는다**: 어느 판본을 받았는지 줄마다 적는다. */
export default async function MyResults({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["student"]);
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);

  const rows = await query<{
    id: string; scored: string | null; level: string | null; engine: string | null;
  }>(
    `SELECT a.id, to_char(a.scored_at, 'YYYY-MM-DD') AS scored,
            rs.report_level AS level, rs.scoring_engine_version AS engine
       FROM attempts a
       LEFT JOIN report_snapshots rs ON rs.attempt_id = a.id
      WHERE a.user_id = $1 AND a.status = 'scored'
      ORDER BY a.id DESC`,
    [user.id],
  ).catch(() => []);

  return (
    <Shell
      surface="individual" lang={L} nav={NAV_INDIVIDUAL} active="/my/results"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "", href: "/my/account" }}
      topTitle={T("navResults")} topRight={<LangSelect current={L} />}
    >
      <PageHead title={T("navResults")} sub="받으신 결과지입니다. 판본이 함께 적힙니다." />

      {rows.length ? (
        <Card pad={false}>
          <div className="sf-tw">
            <table className="sf-table">
              <thead><tr><th>결과지</th><th>등급</th><th>채점</th><th>판본</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><span className="sf-strong">공학 진로 진단</span>
                      <div className="sf-code">#{r.id}</div></td>
                    <td><Pill tone="accent">{r.level === "full" ? "PRO" : r.level ?? "BASIC"}</Pill></td>
                    <td>{r.scored ?? "—"}</td>
                    <td className="sf-code">{r.engine ?? "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/report/${r.id}`} className="sf-btn ghost sm">
                        {T("myOpenReport")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Empty
          icon="report"
          title={T("myNoAssessTitle")}
          body={T("myNoAssessBody")}
          cta={{ href: "/free", label: T("myStart") }}
        />
      )}
    </Shell>
  );
}
