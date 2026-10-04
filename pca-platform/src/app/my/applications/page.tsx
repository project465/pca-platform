import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead } from "@/components/sf/shell";
import { NAV_INDIVIDUAL } from "@/components/sf/nav";
import { Empty } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `지원 준비 · ${BRAND.root}` };

/**
 * 지원 준비.
 *
 * **자리만 잡아 두고 가짜 기능을 만들지 않는다.** 서류·면접·포트폴리오로
 * 옮길 문장은 결과지가 이미 만들고 있고, 그것을 이 화면으로 옮겨 오는
 * 일은 ME_V2 가 서버에 붙은 뒤다. 그 전에 빈 목록과 눌리지 않는 단추를
 * 그려 두면 되는 것처럼 보인다.
 */
export default async function MyApplications({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["student"]);
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);
  return (
    <Shell
      surface="individual" lang={L} nav={NAV_INDIVIDUAL} active="/my/applications"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "", href: "/my/account" }}
      topTitle={T("navApplications")} topRight={<LangSelect current={L} />}
    >
      <PageHead title={T("navApplications")} sub={T("myApplicationsSoon")} />
      <Empty icon="send" title={T("notOpenTitle")} body={T("notOpenBody")} />
    </Shell>
  );
}
