import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { CmShell, CmHead } from "@/app/me/shell";

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
  await requireRole(["student"]);
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);
  return (
    <CmShell active="/my" title={T("navApplications")}>
      <CmHead kicker="계정" title={T("navApplications")} lead={T("myApplicationsSoon")} />
      <section className="cm-card is-empty is-wide">
        <h2>{T("notOpenTitle")}</h2>
        <p>{T("notOpenBody")}</p>
      </section>
    </CmShell>
  );
}
