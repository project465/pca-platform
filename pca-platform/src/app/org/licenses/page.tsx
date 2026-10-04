import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { orgsOf } from "@/lib/org";
import { query } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead, Section } from "@/components/sf/shell";
import { NAV_CAMPUS } from "@/components/sf/nav";
import { BarList, Card, Empty, Kpi, Pill, pct } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `좌석 · ${BRAND.campus}` };

type Row = {
  contract_id: number; title: string; ends_on: string;
  allowed_report_levels: string[];
  available: number; invited: number; claimed: number;
  started: number; completed: number; revoked: number; expired: number;
};

/**
 * 좌석.
 *
 * **초대를 쓴 좌석으로 세지 않는다.** 초대만 보내 놓고 아무도 안 들어온 날,
 * 쓴 좌석 숫자가 틀리면 기관이 돈을 더 냈다고 생각한다. 쓴 것은 응시를
 * 시작한 것부터다. 그래서 숫자 칸과 막대가 그 경계를 눈에 보이게 가른다.
 */
export default async function CampusLicenses({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["org_admin", "instructor"]);
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);

  const orgs = await orgsOf(user.id);
  const org = orgs[0];
  const rows = org
    ? await query<Row>(
        `SELECT c.id AS contract_id, c.title, c.ends_on::text, c.allowed_report_levels,
                count(*) FILTER (WHERE s.status='available')::int AS available,
                count(*) FILTER (WHERE s.status='invited')::int   AS invited,
                count(*) FILTER (WHERE s.status='claimed')::int   AS claimed,
                count(*) FILTER (WHERE s.status='started')::int   AS started,
                count(*) FILTER (WHERE s.status='completed')::int AS completed,
                count(*) FILTER (WHERE s.status='revoked')::int   AS revoked,
                count(*) FILTER (WHERE s.status='expired')::int   AS expired
           FROM contracts c LEFT JOIN seats s ON s.contract_id = c.id
          WHERE c.org_id = $1
          GROUP BY c.id, c.title, c.ends_on, c.allowed_report_levels
          ORDER BY c.ends_on DESC`,
        [org.id],
      ).catch(() => [] as Row[])
    : [];

  const tot = rows.reduce(
    (a, r) => ({
      seats: a.seats + r.available + r.invited + r.claimed + r.started + r.completed + r.revoked + r.expired,
      used: a.used + r.started + r.completed,
      invited: a.invited + r.invited + r.claimed,
      free: a.free + r.available,
    }),
    { seats: 0, used: 0, invited: 0, free: 0 },
  );

  return (
    <Shell
      surface="campus" lang={L} nav={NAV_CAMPUS} active="/org/licenses"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={org ? org.name : BRAND.campus} topRight={<LangSelect current={L} />}
    >
      <PageHead
        eyebrow={org?.name}
        title={T("navLicenses")}
        sub="초대는 좌석 사용으로 세지 않습니다. 쓴 것은 응시를 시작한 것부터입니다."
      />

      {rows.length ? (
        <>
          <div className="sf-grid sf-g4">
            <Kpi label={T("campusSeats")} value={tot.seats} icon="seat" accent />
            <Kpi label={T("campusUsed")} value={tot.used} fill={pct(tot.used, tot.seats)}
              note={pct(tot.used, tot.seats) === null ? undefined : `${pct(tot.used, tot.seats)}%`} />
            <Kpi label={T("campusInvited")} value={tot.invited} note="아직 쓴 것이 아닙니다" />
            <Kpi label={T("campusRemaining")} value={tot.free} />
          </div>

          <Section title="계약마다">
            <div className="sf-grid sf-g2">
              {rows.map((r) => {
                const seats = r.available + r.invited + r.claimed + r.started + r.completed + r.revoked + r.expired;
                return (
                  <Card key={r.contract_id} title={r.title} note={`~ ${r.ends_on}`}>
                    <div className="sf-chips" style={{ marginBottom: 14 }}>
                      {(r.allowed_report_levels ?? []).map((v) => (
                        <Pill key={v} tone="accent">{v}</Pill>
                      ))}
                    </div>
                    <BarList
                      max={seats}
                      hiddenLabel={T("privacyHidden")}
                      rows={[
                        { label: "쓴 좌석", value: r.started + r.completed, tone: "ok", suffix: "석" },
                        { label: "초대·받음", value: r.invited + r.claimed, tone: "part", suffix: "석" },
                        { label: "남은 좌석", value: r.available, tone: "not", suffix: "석" },
                        ...(r.revoked + r.expired > 0
                          ? [{ label: "거둠·기간 지남", value: r.revoked + r.expired, tone: "not" as const, suffix: "석" }]
                          : []),
                      ]}
                    />
                  </Card>
                );
              })}
            </div>
          </Section>
        </>
      ) : (
        <Empty
          icon="seat"
          title={T("campusNoContractTitle")}
          body={T("campusNoContractBody")}
          cta={{ href: "/org/contract", label: T("campusContractAsk") }}
        />
      )}
    </Shell>
  );
}
