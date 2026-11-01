import Link from "next/link";
import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { orgRows, orgSummary } from "@/lib/admin-overview";
import { namesOf } from "@/lib/i18n";
import { orgTypeKo } from "@/lib/org-type";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead, Section } from "@/components/sf/shell";
import { NAV_ADMIN } from "@/components/sf/nav";
import { BarList, Card, Empty, Kpi, Pill } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `기관 · ${BRAND.admin}` };


/**
 * 기관 목록.
 *
 * **내부 코드를 첫 칸에 두지 않는다.** 예전 화면은 `HYU` 가 맨 앞이었는데,
 * 운영자가 찾는 것은 '한양대학교' 이고 코드는 그 다음이다. 코드는 이름
 * 아래 메타로 내린다.
 */
export default async function AdminOrganizations({
  searchParams,
}: { searchParams: Promise<{ lang?: string; q?: string }> }) {
  const user = await requireRole(["superadmin"]);
  const sp = await searchParams;
  const L = toLang2(await resolveLang(sp.lang));
  const T = txer(L);

  const [sum, raw] = await Promise.all([orgSummary(), orgRows()]);
  /* **이름은 상세 화면과 같은 자리에서 읽는다**(2026-11-01 전주대 등록: 목록에만 `JJU` 가
     섰다). 등록 화면은 이름을 번역 표에 적고, 목록은 기관 표의 이름 칸을 읽고 있었다 */
  const names = await namesOf("organizations", raw.map((r) => r.id), L === "en" ? "en" : "ko")
    .catch(() => new Map<string, string>());
  const ko = L === "en"
    ? await namesOf("organizations", raw.map((r) => r.id), "ko").catch(() => new Map<string, string>())
    : names;
  const rows = raw.map((r) => ({ ...r, name: names.get(r.id) ?? ko.get(r.id) ?? r.name ?? r.code }));
  const q = (sp.q ?? "").trim().toLowerCase();
  const shown = q
    ? rows.filter((r) =>
        r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q))
    : rows;

  return (
    <Shell
      surface="admin" lang={L} nav={NAV_ADMIN} active="/admin/organizations"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={BRAND.admin} topRight={<LangSelect current={L} />}
    >
      <PageHead
        eyebrow={BRAND.admin}
        title={T("navOrganizations")}
        actions={
          <Link href="/admin/organizations/new" className="sf-btn accent">기관 추가</Link>
        }
      />

      <div className="sf-grid sf-g4">
        <Kpi label={T("adminOrgsTotal")} value={sum.total} icon="building" accent />
        <Kpi label={T("adminActiveContracts")} value={sum.with_active_contract}
          icon="contract" />
        <Kpi label={T("adminOrgTypes")} value={sum.types.length} />
        <Kpi label={T("adminCountries")} value={sum.countries.length} icon="globe" />
      </div>

      <Section>
        <div className="sf-grid sf-g2">
          <Card title={T("adminOrgTypes")}>
            <BarList
              hiddenLabel={T("privacyHidden")}
              rows={sum.types.map((t) => ({
                label: orgTypeKo(t.label), value: t.n, suffix: "곳",
              }))}
              emptyLabel="아직 기관이 없습니다."
            />
          </Card>
          <Card title={T("adminCountries")}>
            <BarList
              hiddenLabel={T("privacyHidden")}
              rows={sum.countries.map((c) => ({ label: c.label, value: c.n, suffix: "곳" }))}
              emptyLabel="아직 기관이 없습니다."
            />
          </Card>
        </div>
      </Section>

      <Section>
        {rows.length ? (
          <Card pad={false}>
            <form className="sf-toolbar" method="get">
              <input className="sf-input" type="search" name="q" defaultValue={sp.q ?? ""}
                placeholder={`${T("search")}: 이름 · 코드`} />
              <button type="submit" className="sf-btn ghost sm">{T("search")}</button>
              <span className="sf-meta">
                {shown.length.toLocaleString()} / {rows.length.toLocaleString()}
              </span>
            </form>
            <div className="sf-tw">
              <table className="sf-table">
                <thead>
                  <tr>
                    <th>{T("adminColOrg")}</th><th>{T("adminColType")}</th>
                    <th>{T("adminColCountry")}</th><th>{T("adminColContract")}</th>
                    <th>{T("adminColSeats")}</th><th>{T("adminColUsers")}</th>
                    <th>{T("adminColStatus")}</th><th>{T("adminColUpdated")}</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/admin/organizations/${r.id}`} className="sf-strong">
                          {r.name}
                        </Link>
                        <div className="sf-code">{r.code}</div>
                      </td>
                      <td>{orgTypeKo(r.org_type)}</td>
                      <td>{r.country ?? "—"}</td>
                      <td>
                        {r.active_contract
                          ? <Pill tone="ok">{T("adminActive")}</Pill>
                          : <Pill tone="not">{T("adminInactive")}</Pill>}
                      </td>
                      <td className="num">{r.seats.toLocaleString()}</td>
                      <td className="num">{r.users.toLocaleString()}</td>
                      <td><Pill tone={r.active_contract ? "ok" : "not"}>
                        {r.active_contract ? "운영 중" : "대기"}</Pill></td>
                      <td className="sf-meta">{r.updated ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Empty icon="building" title="아직 기관이 없습니다."
            body="기관을 만들고 계약을 등록하면 좌석이 생기고 참여자가 응시할 수 있습니다."
            cta={{ href: "/admin/organizations/new", label: "기관 추가" }} />
        )}
      </Section>
    </Shell>
  );
}
