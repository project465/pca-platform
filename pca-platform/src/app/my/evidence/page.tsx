import Link from "next/link";
import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { query } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead, Section } from "@/components/sf/shell";
import { NAV_INDIVIDUAL } from "@/components/sf/nav";
import { Card, Empty, Kpi } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `경험과 증거 · ${BRAND.root}` };

/**
 * 적어 주신 경험이 어디까지 증거가 되었나.
 *
 * **고치는 화면은 따로 있다**(`/evidence`). 여기는 읽는 자리라, 지금
 * 무엇이 쌓였는지만 보여주고 고치러 가는 단추를 둔다. 한 화면에 읽기와
 * 쓰기를 섞으면 둘 다 복잡해진다.
 */
export default async function MyEvidence({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["student"]);
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);

  const rows = await query<{ label: string; source: string; grade: string | null; at: string | null }>(
    `SELECT COALESCE(le.ref_label, c.code) AS label, le.source_code AS source,
            le.grade, to_char(le.created_at, 'YYYY-MM-DD') AS at
       FROM learner_evidence le
       LEFT JOIN competencies c ON c.id = le.competency_id
      WHERE le.user_id = $1 ORDER BY le.created_at DESC NULLS LAST LIMIT 50`,
    [user.id],
  ).catch(() => []);

  const areas = new Set(rows.map((r) => r.source)).size;

  return (
    <Shell
      surface="individual" lang={L} nav={NAV_INDIVIDUAL} active="/my/evidence"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "", href: "/my/account" }}
      topTitle={T("navEvidence")} topRight={<LangSelect current={L} />}
    >
      <PageHead
        title={T("myEvidenceIntro")}
        sub={T("myEvidenceIntroBody")}
        actions={<Link href="/evidence" className="sf-btn accent">{T("myAddEvidence")}</Link>}
      />

      {rows.length ? (
        <>
          <div className="sf-grid sf-g3">
            <Kpi label="적어 주신 줄" value={rows.length} icon="layers" accent />
            <Kpi label="출처 갈래" value={areas} icon="box" />
            <Kpi label="가장 최근" value={rows[0]?.at ?? "—"} icon="clipboard" />
          </div>
          <Section title="적어 주신 것">
            <Card pad={false}>
              <div className="sf-tw">
                <table className="sf-table">
                  <thead><tr><th>내용</th><th>출처</th><th>성적</th><th>적은 날</th></tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="sf-strong">{r.label}</td>
                        <td><span className="sf-code">{r.source}</span></td>
                        <td>{r.grade ?? "—"}</td>
                        <td>{r.at ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </Section>
        </>
      ) : (
        <Empty
          icon="layers"
          title={T("myNoEvidenceTitle")}
          body={T("myNoEvidenceBody")}
          cta={{ href: "/evidence", label: T("myAddEvidence") }}
        />
      )}
    </Shell>
  );
}
