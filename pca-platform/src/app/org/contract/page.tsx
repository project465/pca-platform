import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { contractsOf, orgsOf } from "@/lib/org";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead, Section } from "@/components/sf/shell";
import { NAV_CAMPUS } from "@/components/sf/nav";
import { Card, Defs, Empty, Pill } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `계약 · ${BRAND.campus}` };

/**
 * 계약.
 *
 * **읽기 전용이다.** 계약을 여기서 만들거나 고치지 않는다: 좌석과 돈이
 * 움직이는 자리라 운영사(`/admin/contracts`)가 적고 감사 기록이 남는다.
 * 그 사실을 화면에 적어 둔다. 눌리지 않는 단추를 그려 두는 것보다 낫다.
 */
export default async function CampusContract({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["org_admin", "instructor"]);
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);

  const orgs = await orgsOf(user.id);
  const org = orgs[0];
  const contracts = await contractsOf(orgs.map((o) => o.id));

  return (
    <Shell
      surface="campus" lang={L} nav={NAV_CAMPUS} active="/org/contract"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={org ? org.name : BRAND.campus} topRight={<LangSelect current={L} />}
    >
      <PageHead
        eyebrow={org?.name}
        title={T("navContract")}
        sub="계약과 좌석은 운영사가 적습니다. 이 화면은 읽기 전용입니다."
        actions={<Pill tone="not">{T("readOnly")}</Pill>}
      />

      {contracts.length ? (
        <Section>
          <div className="sf-grid sf-g2">
            {contracts.map((c) => (
              <Card key={c.id} title={c.title} note={`~ ${c.endsOn}`}>
                <Defs
                  rows={[
                    { k: T("campusSeats"), v: `${c.seatCount.toLocaleString()}석` },
                    { k: T("campusRemaining"), v: `${c.seatsFree.toLocaleString()}석` },
                    { k: T("adminColStatus"), v: <Pill tone="ok">{T("adminActive")}</Pill> },
                  ]}
                />
              </Card>
            ))}
          </div>
        </Section>
      ) : (
        <>
          <Empty
            icon="contract"
            title={T("campusNoContractTitle")}
            body={T("campusNoContractBody")}
          />
          <Section title={T("campusOrgStatus")}>
            <Card>
              <Defs
                rows={[
                  { k: T("adminColOrg"), v: org?.name ?? "—" },
                  { k: "코드", v: <span className="sf-code">{org?.code ?? "—"}</span> },
                  { k: T("adminColContract"), v: <Pill tone="not">{T("adminInactive")}</Pill> },
                ]}
              />
            </Card>
          </Section>
        </>
      )}
    </Shell>
  );
}
