import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { listSites } from "@/lib/sites";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead } from "@/components/sf/shell";
import { NAV_ADMIN } from "@/components/sf/nav";
import { Card, Empty, Pill } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `사이트 · ${BRAND.admin}` };

/**
 * 사이트.
 *
 * **국가 묶음과 갈라 두었다.** 예전에는 둘이 한 쪽에 붙어 있어서, 도메인을
 * 보러 온 사람이 나라별 검수 상태를 먼저 읽었다. 둘은 다른 질문이다:
 * 여기는 '어느 주소로 무엇을 파는가' 이고, 국가 쪽은 '그 나라 자료가
 * 확인됐는가' 다.
 *
 * **읽기 전용이다.** 도메인을 화면에서 고치지 않는다: 한 글자가 틀리면
 * 남의 주소로 간다. 고치는 자리는 `site_configs` 한 곳뿐이다.
 */
export default async function AdminSites({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["superadmin"]);
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);
  const sites = await listSites().catch(() => []);

  return (
    <Shell
      surface="admin" lang={L} nav={NAV_ADMIN} active="/admin/sites"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={BRAND.admin} topRight={<LangSelect current={L} />}
    >
      <PageHead
        eyebrow={BRAND.admin}
        title={T("adminSitesTitle")}
        sub="도메인은 이 표 한 곳에만 있습니다. 화면에도 코드에도 적어 두지 않습니다."
        actions={<Pill tone="not">{T("readOnly")}</Pill>}
      />

      {sites.length ? (
        <div className="sf-grid sf-g2">
          {sites.map((s) => (
            <div className="sf-site" key={s.site_id}>
              <div className="sf-site-h">
                <h3>{s.site_id === "global" ? "Global" : s.site_id === "kr" ? "Korea" : s.site_id}</h3>
                <Pill tone={s.active ? "ok" : "not"}>
                  {s.active ? T("adminActive") : T("adminInactive")}
                </Pill>
              </div>
              <div className="sf-site-d">
                <div className="sf-site-dom">{s.domain}</div>
                <div className="sf-chips">
                  <Pill>{s.default_language.toUpperCase()}</Pill>
                  <Pill>{s.default_currency}</Pill>
                  <Pill>{s.payment_market}</Pill>
                  {s.site_region ? <Pill tone="accent">{s.site_region}</Pill> : null}
                </div>
                
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty icon="window" title="사이트 설정이 없습니다."
          body="site_configs 에 줄이 있어야 어느 주소로 무엇을 파는지가 정해집니다." />
      )}
    </Shell>
  );
}
