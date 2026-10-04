import Link from "next/link";
import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { query } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead } from "@/components/sf/shell";
import { NAV_ADMIN } from "@/components/sf/nav";
import { Card, Empty, Kpi, Pill, pct } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `계약 · ${BRAND.admin}` };

type Row = {
  id: string; title: string; org: string; code: string; status: string;
  starts_on: string | null; ends_on: string | null;
  seats: number; used: number;
};

/** 계약 목록. 만드는 자리는 `/admin/contracts/new` 이고 여기는 읽는 자리다. */
export default async function AdminContracts({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["superadmin"]);
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);

  const rows = await query<Row>(
    `SELECT c.id::text, c.title, o.name AS org, o.code, c.status,
            c.starts_on::text, c.ends_on::text,
            (SELECT count(*) FROM seats s WHERE s.contract_id = c.id)::int AS seats,
            (SELECT count(*) FROM seats s WHERE s.contract_id = c.id
               AND s.status IN ('started','completed'))::int AS used
       FROM contracts c JOIN organizations o ON o.id = c.org_id
      ORDER BY (c.status = 'active') DESC, c.ends_on DESC NULLS LAST`,
  ).catch(() => [] as Row[]);

  const active = rows.filter((r) => r.status === "active");
  const seats = rows.reduce((a, r) => a + r.seats, 0);
  const used = rows.reduce((a, r) => a + r.used, 0);

  return (
    <Shell
      surface="admin" lang={L} nav={NAV_ADMIN} active="/admin/contracts"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={BRAND.admin} topRight={<LangSelect current={L} />}
    >
      <PageHead
        eyebrow={BRAND.admin}
        title={T("navContracts")}
        actions={<Link href="/admin/contracts/new" className="sf-btn accent">계약 등록</Link>}
      />

      <div className="sf-grid sf-g4">
        <Kpi label={T("adminActiveContracts")} value={active.length} icon="contract" accent />
        <Kpi label="전체 계약" value={rows.length} />
        <Kpi label={T("adminSeats")} value={seats} icon="seat" />
        <Kpi label={T("adminUsedSeats")} value={used} fill={pct(used, seats)}
          note={pct(used, seats) === null ? "아직 쓴 좌석이 없습니다" : `${pct(used, seats)}%`} />
      </div>

      <div className="sf-section">
        {rows.length ? (
          <Card pad={false}>
            <div className="sf-tw">
              <table className="sf-table">
                <thead>
                  <tr><th>계약</th><th>{T("adminColOrg")}</th><th>기간</th>
                    <th>{T("adminColSeats")}</th><th>{T("adminUsedSeats")}</th>
                    <th>{T("adminColStatus")}</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="sf-strong">{r.title}</td>
                      <td>{r.org}<div className="sf-code">{r.code}</div></td>
                      <td className="sf-meta">{r.starts_on ?? "—"} ~ {r.ends_on ?? "—"}</td>
                      <td className="num">{r.seats.toLocaleString()}</td>
                      <td className="num">{r.used.toLocaleString()}</td>
                      <td>
                        <Pill tone={r.status === "active" ? "ok" : "not"}>
                          {r.status === "active" ? T("adminActive") : r.status}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Empty icon="contract" title="아직 계약이 없습니다."
            body="계약을 등록하면 그 자리에서 좌석이 만들어지고 기관이 명단을 올릴 수 있습니다."
            cta={{ href: "/admin/contracts/new", label: "계약 등록" }} />
        )}
      </div>
    </Shell>
  );
}
