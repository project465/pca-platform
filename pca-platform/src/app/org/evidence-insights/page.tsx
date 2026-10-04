import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { orgsOf } from "@/lib/org";
import { evidenceInsights } from "@/lib/evidence-insights";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead, Section } from "@/components/sf/shell";
import { NAV_CAMPUS } from "@/components/sf/nav";
import { BarList, Card, Empty, Kpi } from "@/components/sf/parts";
import { toBars } from "@/components/sf/cells";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `증거 집계 · ${BRAND.campus}` };

/**
 * 증거 집계.
 *
 * 직무 집계가 "어디를 보고 있는가" 라면 여기는 "그 직무가 보고 싶어 하는
 * 증거 가운데 무엇이 비어 있는가" 다. **모자라다고 쓰지 않는다**: 칸 이름이
 * `아직 확인되지 않음` 이다.
 *
 * **5명 미만 칸은 숫자를 내지 않고 0 으로도 적지 않는다.** 감춘 칸은
 * 빗금으로 그린다: 빈 막대는 0 으로 읽힌다.
 */
export default async function CampusEvidenceInsights({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["org_admin", "instructor"]);
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);

  const orgs = await orgsOf(user.id);
  const org = orgs[0];
  const ev = org ? await evidenceInsights(Number(org.id)) : null;

  const shell = (children: React.ReactNode) => (
    <Shell surface="campus" lang={L} nav={NAV_CAMPUS} active="/org/evidence-insights"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={org ? org.name : BRAND.campus} topRight={<LangSelect current={L} />}>
      {children}
    </Shell>
  );

  if (!ev || ev.attempts === 0) {
    return shell(
      <>
        <PageHead eyebrow={org?.name} title={T("navEvidenceInsights")} />
        <Empty
          icon="ladder"
          title="아직 집계할 증거가 없습니다."
          body="참여자가 검사를 끝내면 어느 증거가 자주 비어 있는지가 여기 모입니다. 개인 서술은 담기지 않습니다."
          cta={{ href: "/org/participants", label: T("navParticipants") }}
        />
      </>,
    );
  }

  const total = ev.states.reduce((a, s) => a + s.n, 0);
  return shell(
    <>
      <PageHead
        eyebrow={org?.name}
        title={T("navEvidenceInsights")}
        sub={`채점이 끝난 응시 ${ev.attempts.toLocaleString()}건에서 모았습니다. ${T("privacyHiddenWhy")}`}
      />

      <div className="sf-grid sf-g4">
        {ev.states.map((s) => (
          <Kpi
            key={s.label}
            label={s.label}
            value={s.n}
            fill={total > 0 ? Math.round((s.n / total) * 100) : null}
            note={total > 0 ? `${Math.round((s.n / total) * 100)}%` : undefined}
            accent={s.tone === "ok"}
          />
        ))}
        <Kpi label="집계한 응시" value={ev.attempts} icon="clipboard" />
      </div>

      <Section>
        <div className="sf-grid sf-g2">
          <Card title={T("campusGaps")} note={T("privacyHiddenWhy")}>
            <BarList rows={toBars(ev.core_gaps)} hiddenLabel={T("privacyHidden")} />
          </Card>
          <Card title={T("campusNextActions")}>
            <BarList rows={toBars(ev.next_actions)} hiddenLabel={T("privacyHidden")} />
          </Card>
        </div>
      </Section>

      <Section>
        <div className="sf-grid sf-g2">
          <Card title={T("campusToolExposure")}>
            {ev.tools.length ? (
              <BarList rows={toBars(ev.tools)} hiddenLabel={T("privacyHidden")} />
            ) : (
              <p className="sf-meta" style={{ margin: 0 }}>아직 적어 주신 도구가 없습니다.</p>
            )}
          </Card>
          <Card title={T("campusToolLinked")}
            note="이름만 적은 것과 경험에 걸린 것을 가릅니다">
            {ev.tools_linked.length ? (
              <BarList rows={toBars(ev.tools_linked)} hiddenLabel={T("privacyHidden")} />
            ) : (
              <p className="sf-meta" style={{ margin: 0 }}>
                아직 경험에 걸린 도구가 없습니다. 도구 이름만으로는 설명할 근거가 되지 않습니다.
              </p>
            )}
          </Card>
        </div>
      </Section>
    </>,
  );
}
