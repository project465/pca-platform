import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { orgsOf } from "@/lib/org";
import { careerDistribution, orgOverview } from "@/lib/insights";
import { breakdowns } from "@/lib/evidence-insights";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead, Section } from "@/components/sf/shell";
import { NAV_CAMPUS } from "@/components/sf/nav";
import { BarList, Card, Empty, Kpi, pct } from "@/components/sf/parts";
import { toBars } from "@/components/sf/cells";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `직무 집계 · ${BRAND.campus}` };

const SEAT_KO: Record<string, string> = {
  available: "미배정", invited: "초대", claimed: "받음",
  started: "응시 중", completed: "완료", revoked: "거둠", expired: "기간 지남",
};

/**
 * 직무 집계.
 *
 * **등수를 매기지 않는다.** "32% 가 CAE 에 적합" 이 아니라 "32명이 지금
 * CAE 를 먼저 살펴보고 있다" 로 적는다. 그래서 도넛도 파이도 쓰지 않고
 * 가로 막대만 쓴다: 길이는 사람 수이고 그 이상 읽히지 않는다.
 */
export default async function CampusCareerInsights({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["org_admin", "instructor"]);
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);

  const orgs = await orgsOf(user.id);
  const org = orgs[0];

  if (!org) {
    return (
      <Shell surface="campus" lang={L} nav={NAV_CAMPUS} active="/org/insights"
        who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
        topTitle={BRAND.campus} topRight={<LangSelect current={L} />}>
        <PageHead title={T("navCareerInsights")} />
        <Empty icon="compass" title={T("campusNoContractTitle")} body={T("campusNoContractBody")} />
      </Shell>
    );
  }

  const orgId = Number(org.id);
  const [ov, career, bd] = await Promise.all([
    orgOverview(orgId), careerDistribution(orgId), breakdowns(orgId),
  ]);

  return (
    <Shell
      surface="campus" lang={L} nav={NAV_CAMPUS} active="/org/insights"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={org.name} topRight={<LangSelect current={L} />}
    >
      <PageHead
        eyebrow={org.name}
        title={T("navCareerInsights")}
        sub={T("campusCareerNote")}
      />

      <div className="sf-grid sf-g4">
        <Kpi label={T("campusCompleted")} value={ov.completed} icon="clipboard" accent
          note={ov.completion_rate === null ? undefined : `완료율 ${ov.completion_rate}%`} />
        <Kpi label={T("campusStarted")} value={ov.started} />
        <Kpi label={T("campusUsed")} value={ov.used} fill={pct(ov.used, ov.seats)} />
        <Kpi label={T("navCohorts")} value={ov.cohorts} icon="group" />
      </div>

      <Section>
        <div className="sf-grid sf-g-2-1">
          <Card title={T("campusCareer")} note={T("privacyHiddenWhy")}>
            {career.cells.length ? (
              <BarList rows={toBars(career.cells)} hiddenLabel={T("privacyHidden")} />
            ) : (
              <Empty icon="compass" tight title="아직 채점된 응시가 없습니다."
                body="참여자가 검사를 끝내면 먼저 살펴보는 직무가 여기 쌓입니다." />
            )}
          </Card>
          <Card title={T("campusStage")} note={T("privacyHiddenWhy")}>
            {bd.stages.length ? (
              <BarList rows={toBars(bd.stages)} hiddenLabel={T("privacyHidden")} />
            ) : (
              <p className="sf-meta" style={{ margin: 0 }}>아직 집계할 자료가 없습니다.</p>
            )}
          </Card>
        </div>
      </Section>

      <Section>
        <div className="sf-grid sf-g2">
          <Card title={T("campusExplorationStatus")}>
            <BarList
              hiddenLabel={T("privacyHidden")}
              rows={bd.status.map((s) => ({
                label: SEAT_KO[s.label] ?? s.label, value: s.n, suffix: "명",
              }))}
            />
          </Card>
          <Card title={T("campusCohortCompare")}>
            {bd.cohorts.length ? (
              <BarList
                hiddenLabel={T("privacyHidden")}
                max={Math.max(1, ...bd.cohorts.map((c) => c.total))}
                rows={bd.cohorts.map((c) => ({
                  label: `${c.label} (${c.total}명)`,
                  value: c.completed,
                  suffix: c.rate === null ? "명" : `명 · ${c.rate}%`,
                  tone: "ok" as const,
                }))}
              />
            ) : (
              <p className="sf-meta" style={{ margin: 0 }}>견줄 기수가 아직 없습니다.</p>
            )}
          </Card>
        </div>
      </Section>
    </Shell>
  );
}
