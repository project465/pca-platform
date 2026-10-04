import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead } from "@/components/sf/shell";
import { NAV_ADMIN } from "@/components/sf/nav";
import { NotOpen } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `users · ${BRAND.admin}` };

/** 자리만 잡아 두었다. **없는 숫자를 지어내 채우지 않는다.** */
export default async function AdminPage({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["superadmin"]);
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);
  return (
    <Shell surface="admin" lang={L} nav={NAV_ADMIN} active="/admin/users"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={BRAND.admin} topRight={<LangSelect current={L} />}>
      <PageHead eyebrow={BRAND.admin} title={T("navUsers")} />
      <NotOpen title={T("notOpenTitle")} body={T("notOpenBody")} />
    </Shell>
  );
}
