import Link from "next/link";
import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { query } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { reportVersionLabel } from "@/lib/labels";
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

  /* **등급은 응시가 들고 있다.** `report_snapshots.report_level` 은
     무료·유료 경계를 정하는 값이고(`free`/`full`) 손님이 산 등급 이름이
     아니다. 그것으로 적으면 STANDARD 를 산 사람이 PRO 로 읽는다 */
  const rows = await query<{
    id: string; scored: string | null; tier: string | null; version: string | null;
    made: string | null;
  }>(
    `SELECT a.id, to_char(a.scored_at, 'YYYY-MM-DD') AS scored,
            a.tier, a.assessment_version AS version,
            to_char(max(rs.generated_at), 'YYYY-MM-DD') AS made
       FROM attempts a
       LEFT JOIN report_snapshots rs ON rs.attempt_id = a.id
      WHERE a.user_id = $1 AND a.status = 'scored'
      GROUP BY a.id, a.scored_at, a.tier, a.assessment_version
      ORDER BY a.id DESC`,
    [user.id],
  ).catch(() => []);

  return (
    <Shell
      surface="individual" lang={L} nav={NAV_INDIVIDUAL} active="/my/results"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "", href: "/my/account" }}
      topTitle={T("navResults")} topRight={<LangSelect current={L} />}
    >
      <PageHead title={T("navResults")} sub="받으신 결과지입니다. 등급과 판본이 함께 적힙니다." />

      {rows.length ? (
        <Card pad={false}>
          <div className="sf-tw">
            <table className="sf-table">
              <thead><tr><th>결과지</th><th>등급</th><th>채점</th><th>결과 생성</th><th>판본</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><span className="sf-strong">{BRAND.root}</span>
                      <div className="sf-meta">{r.scored ?? ""}</div></td>
                    <td><Pill tone="accent">{r.tier ?? "BASIC"}</Pill></td>
                    <td>{r.scored ?? "—"}</td>
                    <td>{r.made ?? "—"}</td>
                    <td>{reportVersionLabel(r.version)}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        href={r.version === "ME_V2" ? `/assessment/${r.id}/report` : `/report/${r.id}`}
                        className="sf-btn ghost sm">
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
