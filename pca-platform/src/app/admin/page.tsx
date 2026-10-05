import Link from "next/link";
import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { adminOverview, isPeriod, type Period } from "@/lib/admin-overview";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead, Section } from "@/components/sf/shell";
import { NAV_ADMIN } from "@/components/sf/nav";
import { BarList, Card, Empty, Kpi, Pill, pct } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `한눈에 · ${BRAND.admin}` };

/**
 * 운영 첫 화면.
 *
 * **`/admin` 을 기관 목록으로 넘기지 않는다.** 운영자가 아침에 여는 자리가
 * 기관 목록이면, 개인 쪽이 멈춘 날을 아무도 못 본다. 네 묶음을 한 쪽에
 * 두고 10초 안에 답하게 한다: 개인이 도는가 · 기관이 도는가 · 제품이
 * 제대로 나가는가 · 어느 시장에서 오는가.
 *
 * **0 과 '아직 없다' 를 가른다.** 자료가 한 줄도 없는 묶음은 숫자 0 을
 * 늘어놓는 대신 빈 자리로 그린다.
 */
export default async function AdminOverview({
  searchParams,
}: { searchParams: Promise<{ lang?: string; p?: string; demo?: string }> }) {
  const user = await requireRole(["superadmin"]);
  const sp = await searchParams;
  const L = toLang2(await resolveLang(sp.lang));
  const T = txer(L);
  const period: Period = isPeriod(sp.p) ? sp.p : "30d";
  /* **시연 자료는 기본으로 빠진다.** 시드가 만든 48명이 지표에 섞여
     있으면 진짜 첫 손님이 온 날 아무도 못 알아본다. 눌러 볼 때만 섞는다 */
  const demo = sp.demo === "1";
  const ov = await adminOverview(period, demo);

  const money = (v: number, cur: string) =>
    `${v.toLocaleString()} ${cur}`;

  const periods: [Period, string][] = [
    ["7d", T("adminPeriod7")], ["30d", T("adminPeriod30")],
    ["90d", T("adminPeriod90")], ["all", T("adminPeriodAll")],
  ];

  return (
    <Shell
      surface="admin" lang={L} nav={NAV_ADMIN} active="/admin"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={BRAND.admin} topRight={<LangSelect current={L} />}
    >
      <PageHead
        eyebrow={BRAND.admin}
        title={T("navOverview")}
        sub={demo
          ? "시드와 검사가 만든 줄까지 섞어서 봅니다. 이 숫자는 손님이 아닙니다."
          : "개인 · 기관 · 제품 · 시장 네 묶음입니다. 시드와 검사가 만든 줄은 빠져 있습니다."}
        actions={
          <>
            <div className="sf-seg">
              {periods.map(([k, label]) => (
                <Link key={k} href={`/admin?p=${k}${demo ? "&demo=1" : ""}`}
                  aria-current={k === period}>{label}</Link>
              ))}
            </div>
            <div className="sf-seg">
              <Link href={`/admin?p=${period}`} aria-current={!demo}>실제</Link>
              <Link href={`/admin?p=${period}&demo=1`} aria-current={demo}>시연 포함</Link>
            </div>
          </>
        }
      />

      {/* **맨 위가 사람이 할 일이다.** 이 화면을 여는 이유가 그것이다:
          숫자는 그 아래에서도 읽히지만, 막힌 것은 아침에 눈에 띄어야 한다 */}
      <Section title={T("adminBlocked")}>
        {ov.blocked.open > 0 ? (
          <>
            <div className="sf-grid sf-g3">
              {ov.blocked.kinds.map((k) => (
                <Kpi
                  key={k.label}
                  label={T("adminBlockedKind")}
                  value={`${k.label} ${k.n}`}
                  note={k.last ?? undefined}
                  icon="log"
                />
              ))}
            </div>
            <Card title={T("adminBlockedRecent")} pad={false}>
              <table className="sf-table">
                <thead>
                  <tr>
                    <th>{T("adminBlockedKind")}</th>
                    <th>{T("adminBlockedWhen")}</th>
                    <th>{T("adminBlockedWhat")}</th>
                    <th>{T("adminBlockedTrace")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ov.blocked.recent.map((r) => (
                    <tr key={r.trace + r.at}>
                      <td><Pill tone="warn">{r.kind}</Pill></td>
                      <td className="sf-num">{r.at}</td>
                      <td>{r.message}</td>
                      {/* 되짚을 번호까지다. 개인 서술은 이 표에 오지 않는다 */}
                      <td className="sf-mono">{r.trace.slice(0, 8)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        ) : (
          <Empty
            icon="spark"
            title={T("adminBlockedNoneTitle")}
            body={T("adminBlockedNoneBody")}
            tight
          />
        )}
      </Section>

      <Section title={T("adminB2C")}>
        <div className="sf-grid sf-g6">
          <Kpi label={T("adminSignups")} value={ov.b2c.signups} icon="user" accent />
          <Kpi label={T("adminPurchases")} value={ov.b2c.purchases} icon="cart" />
          <Kpi label={T("adminRevenue")} value={money(ov.b2c.revenue, ov.b2c.currency)} />
          <Kpi label={T("adminStarted")} value={ov.b2c.started} icon="clipboard" />
          <Kpi label={T("adminCompleted")} value={ov.b2c.completed} />
          <Kpi
            label={T("adminCompletion")}
            /* 바닥이 0 이면 비율을 만들지 않는다 */
            value={ov.b2c.completion === null ? "—" : ov.b2c.completion}
            unit={ov.b2c.completion === null ? undefined : "%"}
            fill={ov.b2c.completion}
            note={ov.b2c.completion === null ? "아직 시작한 응시가 없습니다" : undefined}
          />
        </div>
      </Section>

      <Section title={T("adminB2B")}>
        <div className="sf-grid sf-g6">
          <Kpi label={T("adminActiveOrgs")} value={ov.b2b.orgs_active} icon="building" accent />
          <Kpi label={T("adminActiveContracts")} value={ov.b2b.contracts_active} icon="contract" />
          <Kpi label={T("adminSeats")} value={ov.b2b.seats} icon="seat" />
          <Kpi label={T("adminUsedSeats")} value={ov.b2b.seats_used}
            fill={pct(ov.b2b.seats_used, ov.b2b.seats)} />
          <Kpi label={T("adminCompleted")} value={ov.b2b.completed} />
          <Kpi
            label={T("adminCompletion")}
            value={ov.b2b.completion === null ? "—" : ov.b2b.completion}
            unit={ov.b2b.completion === null ? undefined : "%"}
            fill={ov.b2b.completion}
            note={ov.b2b.completion === null ? "아직 쓴 좌석이 없습니다" : undefined}
          />
        </div>
      </Section>

      <Section>
        <div className="sf-grid sf-g2">
          <Card title={T("adminProduct")}
            note={ov.product.report_errors > 0 ? undefined : "밀린 결과지 0"}
            actions={ov.product.report_errors > 0
              ? <Pill tone="warn">{T("adminReportErrors")} {ov.product.report_errors}</Pill>
              : undefined}>
            {ov.product.tiers.length || ov.product.majors.length ? (
              <>
                <h3 className="sf-h3" style={{ marginBottom: 10 }}>{T("adminTierUse")}</h3>
                <BarList
                  hiddenLabel={T("privacyHidden")}
                  rows={ov.product.tiers.map((t) => ({ label: t.label, value: t.n, suffix: "건" }))}
                  emptyLabel="아직 발급된 결과지가 없습니다."
                />
                <h3 className="sf-h3" style={{ margin: "20px 0 10px" }}>{T("adminMajorUse")}</h3>
                <BarList
                  hiddenLabel={T("privacyHidden")}
                  rows={ov.product.majors.map((m) => ({ label: m.label, value: m.n, suffix: "건" }))}
                  emptyLabel="아직 응시가 없습니다."
                />
              </>
            ) : (
              <Empty icon="box" tight title="아직 나간 제품이 없습니다."
                body="응시가 채점되고 결과지가 발급되면 등급과 전공이 여기 쌓입니다." />
            )}
          </Card>

          <Card title={T("adminMarket")}>
            <h3 className="sf-h3" style={{ marginBottom: 10 }}>{T("adminSitesTitle")}</h3>
            <BarList
              hiddenLabel={T("privacyHidden")}
              rows={ov.market.sites.map((s) => ({
                label: `${s.label} · ${s.domain}`, value: s.n, suffix: "건",
              }))}
              emptyLabel="사이트 설정이 없습니다."
            />
            <h3 className="sf-h3" style={{ margin: "20px 0 10px" }}>{T("navCountries")}</h3>
            <BarList
              hiddenLabel={T("privacyHidden")}
              rows={ov.market.targets.map((t) => ({ label: t.label, value: t.n, suffix: "건" }))}
              emptyLabel="아직 목표 국가를 고른 응시가 없습니다."
            />
            <p className="sf-meta" style={{ marginTop: 14 }}>{T("adminGlobalRefWhy")}</p>
          </Card>
        </div>
      </Section>
    </Shell>
  );
}
