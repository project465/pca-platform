import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { query } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead } from "@/components/sf/shell";
import { NAV_ADMIN } from "@/components/sf/nav";
import { Card, Empty, Pill } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `국가 · ${BRAND.admin}` };

type Pack = {
  country_code: string; version: string; status: string;
  verified_at: string | null;
};

/**
 * 국가 묶음.
 *
 * **나라 자료를 지어내지 않는다.** 확인된 줄이 없으면 나라 이름만 띄우지
 * 않고 `Global Reference Mode` 라고 적는다. 임금·비자·면허를 지어내면
 * 그걸 믿고 움직이는 사람이 생긴다.
 *
 * **빈 흰 사각형에 설명만 적어 두지 않는다**(규격 §12). 비어 있을 때도
 * 무엇이 없고 그래서 지금 무엇으로 도는지를 적는다.
 */
export default async function AdminCountries({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["superadmin"]);
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);

  const packs = await query<Pack>(
    `SELECT country_code, version, status, verified_at::text
       FROM country_packs ORDER BY country_code`,
  ).catch(() => [] as Pack[]);

  return (
    <Shell
      surface="admin" lang={L} nav={NAV_ADMIN} active="/admin/countries"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={BRAND.admin} topRight={<LangSelect current={L} />}
    >
      <PageHead
        eyebrow={BRAND.admin}
        title={T("adminCountryPacks")}
        sub={T("adminGlobalRefWhy")}
        actions={<Pill tone="not">{T("readOnly")}</Pill>}
      />

      {packs.length ? (
        <Card pad={false}>
          <div className="sf-tw">
            <table className="sf-table">
              <thead>
                <tr>
                  <th>{T("adminColCountry")}</th><th>{T("adminColLocalization")}</th>
                  <th>{T("adminColTaxonomy")}</th><th>{T("adminColReportL10n")}</th>
                  <th>{T("adminColVerified")}</th><th>{T("adminColStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {packs.map((p) => {
                  const ok = p.status === "verified" && !!p.verified_at;
                  return (
                    <tr key={p.country_code}>
                      <td className="sf-strong">{p.country_code}</td>
                      <td><Pill tone={ok ? "ok" : "part"}>{ok ? "확인됨" : "검수 전"}</Pill></td>
                      <td><Pill tone={ok ? "ok" : "not"}>{ok ? "확인됨" : "아직"}</Pill></td>
                      <td><Pill tone={ok ? "ok" : "not"}>{ok ? "확인됨" : "아직"}</Pill></td>
                      <td className="sf-meta">{p.verified_at?.slice(0, 10) ?? "—"}</td>
                      <td>
                        {ok ? <Pill tone="ok">COUNTRY_PACK</Pill>
                            : <Pill tone="not">{T("adminGlobalRef")}</Pill>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Empty
          icon="globe"
          title={T("adminNoCountryPacks")}
          body={`${T("adminGlobalRefWhy")} 확인된 줄이 생기면 그 나라부터 결과지가 나라별로 갈립니다.`}
        />
      )}
    </Shell>
  );
}
