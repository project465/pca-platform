import { requireRole } from "@/lib/session";
import { redirect } from "next/navigation";
import { campusV3Only } from "@/lib/campus/org-mode";
import { resolveLang } from "@/lib/locale-server";
import { orgsOf } from "@/lib/org";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead } from "@/components/sf/shell";
import { NAV_CAMPUS } from "@/components/sf/nav";
import { NotOpen } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `settings · ${BRAND.campus}` };

/** 자리만 잡아 두었다. **없는 숫자를 지어내 채우지 않는다.** */
export default async function CampusPage({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["org_admin", "instructor"]);
  /* 학교 전용 진입으로만 운영하는 기관에는 이 화면이 읽을 자료가 없다.
     비어 있는 수를 세우지 않고 지금 검사의 집계로 보낸다(`campusV3Only`) */
  if (await campusV3Only(user.id)) redirect("/org/v3");
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);
  const orgs = await orgsOf(user.id);
  return (
    <Shell surface="campus" lang={L} nav={NAV_CAMPUS} active="/org/settings"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={orgs[0] ? orgs[0].name : BRAND.campus} topRight={<LangSelect current={L} />}>
      <PageHead eyebrow={orgs[0]?.name} title={T("navSettings")} />
      <NotOpen title={T("notOpenTitle")} body={T("notOpenBody")} />
    </Shell>
  );
}
