import Link from "next/link";
import { ROLE_LABEL } from "@/lib/roles";
import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { contractsOf, orgsOf, sessionsOf } from "@/lib/org";
import { careerDistribution, orgOverview } from "@/lib/insights";
import { evidenceInsights } from "@/lib/evidence-insights";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead, Section } from "@/components/sf/shell";
import { NAV_CAMPUS } from "@/components/sf/nav";
import { BarList, Card, Empty, Funnel, Kpi, Pill, Todo, pct } from "@/components/sf/parts";
import { toBars } from "@/components/sf/cells";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `한눈에 · ${BRAND.campus}` };

/**
 * 기관 첫 화면.
 *
 * 담당자가 10초 안에 셋을 알아야 한다: 좌석을 얼마나 썼는가 · 참여자가
 * 어디까지 왔는가 · 지금 손볼 일이 무엇인가. 그래서 숫자 여섯이 맨 위에
 * 있고, 그 아래가 흐름이고, 맨 아래가 손볼 일이다.
 *
 * **계약이 없으면 빈 쪽을 내지 않는다.** 기관 상태와 계약이 열리면
 * 무엇이 생기는지를 적는다. 예전 화면은 0 / 0 / 0 만 띄웠다.
 */
export default async function CampusOverview({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["org_admin", "instructor"]);
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);

  const orgs = await orgsOf(user.id);
  const orgIds = orgs.map((o) => o.id);
  const org = orgs[0];
  const [sessions, contracts] = await Promise.all([sessionsOf(orgIds), contractsOf(orgIds)]);

  const shell = (children: React.ReactNode) => (
    <Shell
      surface="campus" lang={L} nav={NAV_CAMPUS} active="/org"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={org ? org.name : BRAND.campus}
      topRight={<LangSelect current={L} />}
    >
      {children}
    </Shell>
  );

  /* 계약이 없는 기관. **빈 화면으로 두지 않는다** */
  if (!org || contracts.length === 0) {
    return shell(
      <>
        <PageHead
          eyebrow={BRAND.campus}
          title={org ? org.name : T("navOverview")}
          sub={T("campusNoContractBody")}
        />
        <div className="sf-grid sf-g-2-1">
          <Empty
            icon="contract"
            title={T("campusNoContractTitle")}
            body={T("campusNoContractBody")}
            cta={<Link href="/org/contract" className="sf-btn accent">{T("campusContractAsk")}</Link>}
          />
          <Card title={T("campusOrgStatus")}>
            <dl className="sf-defs">
              <div className="sf-def"><dt>{T("adminColOrg")}</dt>
                <dd>{org ? org.name : "—"}</dd></div>
              <div className="sf-def"><dt>코드</dt>
                <dd><span className="sf-code">{org ? org.code : "—"}</span></dd></div>
              <div className="sf-def"><dt>{T("adminColContract")}</dt>
                <dd><Pill tone="not">{T("adminInactive")}</Pill></dd></div>
              <div className="sf-def"><dt>{T("navCohorts")}</dt>
                <dd>{sessions.length.toLocaleString()}</dd></div>
            </dl>
          </Card>
        </div>
      </>,
    );
  }

  const orgId = Number(org.id);
  const [ov, career, ev] = await Promise.all([
    orgOverview(orgId), careerDistribution(orgId), evidenceInsights(orgId),
  ]);

  /* 흐름은 `orgOverview` 가 누적으로 세어 둔 것을 그대로 쓴다. 여기서
     다시 더하면 두 곳에서 세는 것이 되고, 갈리는 순간 둘 다 못 믿는다 */
  const funnel = [
    { label: T("campusFunnelInvited"), value: ov.funnel.invited },
    { label: T("campusFunnelRegistered"), value: ov.funnel.registered },
    { label: T("campusFunnelStarted"), value: ov.funnel.started },
    { label: T("campusFunnelCompleted"), value: ov.funnel.completed },
  ];

  /* 손볼 일. **지어내지 않는다**: 실제 상태에서만 줄을 만든다 */
  const todo: { text: string; note?: string; warn?: boolean; cta?: { href: string; label: string } }[] = [];
  if (ov.remaining <= 0) {
    todo.push({ text: "남은 좌석이 없습니다.", note: "계약을 늘리거나 거둔 좌석을 확인하십시오.", warn: true,
      cta: { href: "/org/licenses", label: T("navLicenses") } });
  }
  if (ov.invited > 0) {
    todo.push({ text: `초대를 받고 아직 시작하지 않은 분이 ${ov.invited}명입니다.`,
      note: "초대는 좌석 사용으로 세지 않습니다.",
      cta: { href: "/org/participants", label: T("navParticipants") } });
  }
  const waiting = sessions.filter((s) => s.releaseMode === "manual" && !s.releasedAt && s.scored > 0);
  for (const s of waiting) {
    todo.push({ text: `${s.name} 의 결과지가 공개를 기다립니다.`,
      note: `채점 ${s.scored}건`, warn: true,
      cta: { href: `/org/sessions/${s.id}`, label: "회차 열기" } });
  }
  if (ov.cohorts === 0) {
    todo.push({ text: "아직 회차가 없습니다.", note: "회차를 열어야 명단을 올릴 수 있습니다.",
      cta: { href: "/org/sessions/new", label: T("navCohorts") } });
  }

  return shell(
    <>
      <PageHead
        eyebrow={BRAND.campus}
        title={org.name}
        sub={`${contracts.map((c) => c.title).join(" · ")} · ${T("navCohorts")} ${ov.cohorts}`}
        actions={<Link href="/org/sessions/new" className="sf-btn accent">회차 열기</Link>}
      />

      <div className="sf-grid sf-g6">
        <Kpi label={T("campusSeats")} value={ov.seats} icon="seat" accent />
        <Kpi label={T("campusUsed")} value={ov.used} fill={pct(ov.used, ov.seats)}
          note={pct(ov.used, ov.seats) === null ? undefined : `${pct(ov.used, ov.seats)}%`} />
        <Kpi label={T("campusRemaining")} value={ov.remaining} />
        <Kpi label={T("campusInvited")} value={ov.invited} />
        <Kpi label={T("campusStarted")} value={ov.started} />
        <Kpi label={T("campusCompleted")} value={ov.completed}
          note={ov.completion_rate === null ? undefined : `${ov.completion_rate}%`} />
      </div>

      <Section>
        <div className="sf-grid sf-g-2-1">
          <Card title={T("campusFunnel")}>
            <Funnel steps={funnel} />
          </Card>
          <Card title={T("campusAction")}>
            <Todo items={todo} emptyLabel="지금 손볼 일이 없습니다." />
          </Card>
        </div>
      </Section>

      <Section>
        <div className="sf-grid sf-g2">
          <Card title={T("campusCareer")} note={T("privacyHiddenWhy")}>
            {career.cells.length ? (
              <>
                <BarList rows={toBars(career.cells)} hiddenLabel={T("privacyHidden")} />
                <p className="sf-meta" style={{ marginTop: 14 }}>{T("campusCareerNote")}</p>
              </>
            ) : (
              <Empty icon="compass" tight title="아직 채점된 응시가 없습니다."
                body="참여자가 검사를 끝내면 먼저 살펴보는 직무가 여기 쌓입니다." />
            )}
          </Card>
          <Card title={T("campusGaps")} note={T("privacyHiddenWhy")}>
            {ev.core_gaps.length ? (
              <BarList rows={toBars(ev.core_gaps)} hiddenLabel={T("privacyHidden")} />
            ) : (
              <Empty icon="ladder" tight title="아직 집계할 증거가 없습니다."
                body="채점이 끝난 응시가 생기면 자주 비어 있는 증거가 여기 모입니다." />
            )}
          </Card>
        </div>
      </Section>

      <Section title={T("campusCohorts")}>
        {sessions.length ? (
          <Card pad={false}>
            <div className="sf-tw">
              <table className="sf-table">
                <thead>
                  <tr><th>{T("campusColCohort")}</th><th>기간</th><th>명단</th>
                    <th>시작</th><th>완료</th><th>공개</th><th /></tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td className="sf-strong">{s.name}</td>
                      <td className="sf-meta">{s.opensAt} ~ {s.closesAt}</td>
                      <td className="num">{s.enrolled}</td>
                      <td className="num">{s.started}</td>
                      <td className="num">{s.scored}</td>
                      <td>
                        {s.releasedAt
                          ? <Pill tone="ok">공개</Pill>
                          : s.releaseMode === "manual"
                            ? <Pill tone="part">승인 대기</Pill>
                            : <Pill tone="not">자동</Pill>}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={`/org/sessions/${s.id}`} className="sf-btn ghost sm">열기</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Empty icon="group" title="아직 회차가 없습니다."
            body="회차를 열어야 명단을 올리고 좌석을 나눠 드릴 수 있습니다."
            cta={{ href: "/org/sessions/new", label: "회차 열기" }} />
        )}
      </Section>
    </>,
  );
}
