import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { orgsOf } from "@/lib/org";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead } from "@/components/sf/shell";
import { NAV_CAMPUS } from "@/components/sf/nav";
import { NotOpen } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `reports · ${BRAND.campus}` };

/** 자리만 잡아 두었다. **없는 숫자를 지어내 채우지 않는다.** */
export default async function CampusPage({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["org_admin", "instructor"]);
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);
  const orgs = await orgsOf(user.id);
  return (
    <Shell surface="campus" lang={L} nav={NAV_CAMPUS} active="/org/reports"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={orgs[0] ? orgs[0].name : BRAND.campus} topRight={<LangSelect current={L} />}>
      <PageHead eyebrow={orgs[0]?.name} title={T("navReports")} />
      <NotOpen title={T("notOpenTitle")} body={T("notOpenBody")} />
    </Shell>
  );
}
