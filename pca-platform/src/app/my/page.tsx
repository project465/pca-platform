import Link from "next/link";
import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { myState } from "@/lib/my-home";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { ROLE_LABEL } from "@/lib/roles";
import { Shell, PageHead, Section } from "@/components/sf/shell";
import { NAV_INDIVIDUAL } from "@/components/sf/nav";
import { Card, Defs, Empty, Kpi, Pill } from "@/components/sf/parts";
import { Icon } from "@/components/sf/icon";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `홈 · ${BRAND.root}` };

/**
 * 개인 첫 화면.
 *
 * **빈 화면을 빈 화면으로 두지 않는다.** 세 상태가 전부 완성된 화면이다.
 *
 *   아직 안 봤다  큰 칸 하나 + 무엇을 읽는가 · 등급 · 증거 소개
 *   보는 중이다   어디까지 왔는지와 이어서 가는 단추 하나
 *   끝났다        먼저 볼 직무 셋 · 가장 큰 공백 · 다음 할 일 · 결과지
 *
 * 5초 안에 셋을 알아야 한다: 여기가 어디고 · 무엇을 할 수 있고 ·
 * 지금 누를 것이 무엇인가. 그래서 어느 상태에서도 **주된 단추가 하나다.**
 */
export default async function MyHome({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  /* 역할 판단은 손대지 않는다. 개인 이용자와 기관 참여자가 같은 화면이다 */
  const user = await requireRole(["student"]);
  const { lang: q } = await searchParams;
  const lang = await resolveLang(q);
  const L = toLang2(lang);
  const T = txer(L);

  const st = await myState(user.id, lang);

  return (
    <Shell
      surface="individual"
      lang={L}
      nav={NAV_INDIVIDUAL}
      active="/my"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "", href: "/my/account" }}
      topTitle={T("navHome")}
      topRight={<LangSelect current={L} />}
    >
      {st.kind === "none" ? <NoAssessment T={T} ready={st.seatReady} /> : null}
      {st.kind === "progress" ? <InProgress T={T} st={st} /> : null}
      {st.kind === "done" ? <Done T={T} st={st} /> : null}
    </Shell>
  );
}

type Tr = ReturnType<typeof txer>;

/* ── A. 아직 응시한 검사가 없다 ─────────────────────────────────── */
function NoAssessment({ T, ready }: { T: Tr; ready: boolean }) {
  return (
    <>
      <div className="sf-hero">
        <div className="sf-eyebrow">{BRAND.root}</div>
        <h1>{T("myHeroTitle")}</h1>
        <p>{T("myHeroBody")}</p>
        <div className="sf-hero-a">
          <Link href={ready ? "/test" : "/free"} className="sf-btn">
            {T("myStart")}
          </Link>
          <Link href="/my/evidence" className="sf-btn ghost">{T("myAddEvidence")}</Link>
        </div>
      </div>

      <Section>
        <div className="sf-grid sf-g3">
          <Card>
            <span className="sf-empty-ic" style={{ marginBottom: 10 }}>
              <Icon name="compass" size={20} />
            </span>
            <h3 className="sf-h3">{T("myWhatWeRead")}</h3>
            <p className="sf-sub" style={{ fontSize: 13.5 }}>{T("myWhatWeReadBody")}</p>
          </Card>
          <Card>
            <span className="sf-empty-ic" style={{ marginBottom: 10 }}>
              <Icon name="report" size={20} />
            </span>
            <h3 className="sf-h3">{T("myTiers")}</h3>
            <p className="sf-sub" style={{ fontSize: 13.5 }}>{T("myTiersBody")}</p>
            <div className="sf-chips" style={{ marginTop: 12 }}>
              <Pill>BASIC</Pill><Pill>STANDARD</Pill><Pill tone="accent">PRO</Pill>
            </div>
          </Card>
          <Card>
            <span className="sf-empty-ic" style={{ marginBottom: 10 }}>
              <Icon name="layers" size={20} />
            </span>
            <h3 className="sf-h3">{T("myEvidenceIntro")}</h3>
            <p className="sf-sub" style={{ fontSize: 13.5 }}>{T("myEvidenceIntroBody")}</p>
          </Card>
        </div>
      </Section>

      <Section title={T("navApplications")}>
        <Empty
          icon="send"
          title={T("navApplications")}
          body={T("myApplicationsSoon")}
          tight
        />
      </Section>
    </>
  );
}

/* ── B. 응시 중 ─────────────────────────────────────────────────── */
function InProgress({
  T, st,
}: {
  T: Tr;
  st: Extract<Awaited<ReturnType<typeof myState>>, { kind: "progress" }>;
}) {
  return (
    <>
      <PageHead
        eyebrow={T("myInProgress")}
        title={st.track === "HS" ? "고교 진로 진단" : "공학 진로 진단"}
        sub={T("myHeroBody")}
        actions={
          <Link href="/test" className="sf-btn accent">{T("myContinue")}</Link>
        }
      />

      <div className="sf-grid sf-g3">
        <Kpi
          label={T("myProgress")}
          value={st.percent}
          unit="%"
          fill={st.percent}
          note={`${st.answered.toLocaleString()} / ${st.total.toLocaleString()}`}
          accent
          icon="clipboard"
        />
        <Kpi label={T("myTier")} value={st.tier === "full" ? "PRO" : "BASIC"} icon="report" />
        <Kpi label={T("myStage")} value={st.track ?? "UNIV"} icon="user" />
      </div>

      <Section title={T("navEvidence")}>
        <Empty
          icon="layers"
          title={T("myNoEvidenceTitle")}
          body={T("myNoEvidenceBody")}
          cta={{ href: "/my/evidence", label: T("myAddEvidence") }}
          tight
        />
      </Section>
    </>
  );
}

/* ── C. 결과가 있다 ─────────────────────────────────────────────── */
function Done({
  T, st,
}: {
  T: Tr;
  st: Extract<Awaited<ReturnType<typeof myState>>, { kind: "done" }>;
}) {
  return (
    <>
      <PageHead
        eyebrow={BRAND.root}
        title={T("myTop3")}
        sub={T("myHeroBody")}
        actions={
          <Link href={`/report/${st.attemptId}`} className="sf-btn accent">
            {T("myOpenReport")}
          </Link>
        }
      />

      <div className="sf-grid sf-g3">
        {st.top.length ? st.top.map((j, i) => (
          <div className="sf-kpi" key={j.code}>
            <div className="sf-kpi-l">
              <Icon name="compass" size={14} />
              {i + 1}
            </div>
            <div className="sf-kpi-v" style={{ fontSize: 20, lineHeight: 1.3 }}>{j.name}</div>
            <div className="sf-kpi-n">
              <Pill tone="accent">{j.tier}군</Pill>
            </div>
          </div>
        )) : (
          <Card>
            <p className="sf-meta" style={{ margin: 0 }}>{T("privacyHiddenWhy")}</p>
          </Card>
        )}
      </div>

      <Section>
        <div className="sf-grid sf-g-2-1">
          <Card title={T("myKeyGap")}>
            {st.gap ? (
              <>
                <p style={{ margin: "0 0 10px", fontSize: 19, fontWeight: 700, color: "var(--sf-ink)" }}>
                  {st.gap.name}
                </p>
                <Defs rows={[{ k: T("myNextAction"), v: ACTION_TEXT(st.gap.action) }]} />
              </>
            ) : (
              <p className="sf-meta" style={{ margin: 0 }}>
                핵심 영역에서 비어 있는 자리가 없습니다.
              </p>
            )}
          </Card>
          <Card title={T("myEvidenceIntro")}>
            {st.evidence.confirmed > 0 ? (
              <Defs
                rows={[
                  { k: "확인된 줄", v: `${st.evidence.confirmed.toLocaleString()}건` },
                  { k: "영역", v: `${st.evidence.areas.toLocaleString()}개` },
                ]}
              />
            ) : (
              <p className="sf-sub" style={{ fontSize: 13.5, margin: 0 }}>
                {T("myNoEvidenceBody")}
              </p>
            )}
            <Link href="/my/evidence" className="sf-btn ghost sm" style={{ marginTop: 14 }}>
              {T("myAddEvidence")}
            </Link>
          </Card>
        </div>
      </Section>

      <Section title={T("navApplications")}>
        <Empty icon="send" title={T("navApplications")} body={T("myApplicationsSoon")} tight />
      </Section>
    </>
  );
}

/** 다음 행동을 갈래 이름이 아니라 사람이 읽는 문장으로. */
function ACTION_TEXT(kind: string | null): string {
  switch (kind) {
    case "course": return "관련 수업을 한 과목 들으십시오.";
    case "cert": return "해당 자격을 하나 준비하십시오.";
    case "ncs_unit": return "그 NCS 단위에 해당하는 과제를 하나 하십시오.";
    case "camp": return "짧은 교육이나 캠프로 한 번 해보십시오.";
    case "online": return "온라인 과정을 하나 끝까지 들으십시오.";
    default: return "작은 프로젝트 하나로 직접 해보십시오.";
  }
}
