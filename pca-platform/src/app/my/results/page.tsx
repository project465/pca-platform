import Link from "next/link";
import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { query } from "@/lib/db";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { reportVersionLabel } from "@/lib/labels";
import { CmShell, CmHead } from "@/app/me/shell";
import OlderNote from "@/components/sf/older-note";

export const metadata = { title: `옛 결과 · ${BRAND.root}` };

/** 옛 검사의 결과지 목록. **등급을 숨기지 않는다**: 어느 판본을 받았는지 줄마다 적는다. */
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
    <CmShell active="/my" title={T("acOld")}>
      <CmHead kicker="계정" title={T("acOld")}
        lead="그보다 전에 보신 검사의 결과지입니다. 등급과 판본이 함께 적힙니다." />
      <OlderNote lang={L} />

      {rows.length ? (
        <div className="cm-tablewrap">
          <table className="cm-table">
            <thead><tr><th>검사</th><th>등급</th><th>채점</th><th>결과 생성</th><th>판본</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><b>{BRAND.root}</b></td>
                  <td>{r.tier ?? "BASIC"}</td>
                  <td>{r.scored ?? "—"}</td>
                  <td>{r.made ?? "—"}</td>
                  <td>{reportVersionLabel(r.version)}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      href={r.version === "ME_V2" ? `/assessment/${r.id}/report` : `/report/${r.id}`}
                      className="cm-btn">
                      {T("myOpenReport")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <section className="cm-card is-empty is-wide">
          <h2>{T("acOldNone")}</h2>
          <p>{T("acOldNoneBody")}</p>
          <div className="cm-acts">
            <Link href="/me/results" className="cm-btn is-primary">{T("acOldResults")}</Link>
          </div>
        </section>
      )}
    </CmShell>
  );
}
