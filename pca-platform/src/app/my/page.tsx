import Link from "next/link";
import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { myState } from "@/lib/my-home";
import { v2State, type V2State } from "@/lib/me-v2/lifecycle";
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
  /* ME_V2 가 먼저다. 지금 파는 검사가 그것이고, 옛 검사는 이미 응시한
     사람에게만 남아 있다. 둘을 같은 칸에 섞으면 어느 결과지를 보라는
     것인지가 읽히지 않는다 */
  const v2 = await v2State(user.id);

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
      {v2.kind !== "none" ? <V2Panel T={T} v2={v2} /> : null}
      {v2.kind === "none" && st.kind === "none"
        ? <NoAssessment T={T} ready={st.seatReady} /> : null}
      {v2.kind === "none" && st.kind === "progress" ? <InProgress T={T} st={st} /> : null}
      {v2.kind === "none" && st.kind === "done" ? <Done T={T} st={st} /> : null}
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
          {/* **지금 파는 것으로 보낸다.** 좌석이 있으면 옛 검사를 이어서
              쓰고, 없으면 가격표다: `/free` 로 보내면 파는 검사가 아닌
              쪽이 첫 걸음이 된다 */}
          <Link href={ready ? "/test" : "/pricing"} className="sf-btn">
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

/* ── ME_V2 다섯 상태 ───────────────────────────────────────────────
   **주된 단추가 어느 상태에서도 하나다.** 둘을 같은 굵기로 두면 고르는
   일이 생기고, 고르는 일이 생기면 거기서 멈춘다. */
function V2Panel({ T, v2 }: { T: Tr; v2: V2State }) {
  if (v2.kind === "purchased") {
    return (
      <>
        <PageHead
          eyebrow={v2.tier}
          title={T("v2BoughtTitle")}
          sub={T("v2BoughtBody")}
          actions={
            <Link href="/assessment/start" className="sf-btn accent">{T("asStart")}</Link>
          }
        />
        <div className="sf-grid sf-g3">
          <Kpi label={T("okTier")} value={v2.tier} icon="report" />
          <Kpi label={T("v2Grants")} value={v2.grants} icon="box" />
          <Kpi label={T("myProgress")} value="0" unit="%" fill={0} icon="clipboard" />
        </div>
      </>
    );
  }

  if (v2.kind === "progress") {
    return (
      <>
        <PageHead
          eyebrow={`${v2.tier} · ${T("myInProgress")}`}
          title={T("v2ResumeTitle")}
          sub={T("v2ResumeBody")}
          actions={
            <Link href={`/assessment/${v2.attemptId}`} className="sf-btn accent">
              {T("asResume")}
            </Link>
          }
        />
        <div className="sf-grid sf-g3">
          <Kpi
            label={T("myProgress")} value={v2.percent} unit="%" fill={v2.percent}
            note={`${v2.answered.toLocaleString()} / ${v2.total.toLocaleString()}`}
            accent icon="clipboard"
          />
          <Kpi label={T("okTier")} value={v2.tier} icon="report" />
          {/* 어디까지 왔는지를 숫자만으로 적지 않는다(규격 §43) */}
          <Kpi
            label={T("asSectionOf")}
            value={v2.section ? T(SECTION_KEY(v2.section)) : "—"}
            icon="compass"
          />
        </div>
      </>
    );
  }

  if (v2.kind === "evidence") {
    return (
      <>
        <PageHead
          eyebrow={v2.tier}
          title={T("v2EvidenceTitle")}
          sub={T("v2EvidenceBody")}
          actions={
            <Link href={`/assessment/${v2.attemptId}/evidence?flow=1`}
              className="sf-btn accent">{T("asAddEvidence")}</Link>
          }
        />
        <Section>
          {/* 경험으로 막지 않는다. 지금 바로 받고 싶은 사람의 길도 둔다 */}
          <Empty
            icon="report"
            title={T("rpNoneTitle")}
            body={T("rpNoneBody")}
            cta={{ href: `/assessment/${v2.attemptId}/report`, label: T("rpMake") }}
            tight
          />
        </Section>
      </>
    );
  }

  if (v2.kind === "generating") {
    return (
      <>
        <PageHead
          eyebrow={v2.tier}
          title={v2.failedAt ? T("v2StuckTitle") : T("rpNoneTitle")}
          sub={v2.failedAt ? T("v2StuckBody") : T("rpNoneBody")}
          actions={
            <Link href={`/assessment/${v2.attemptId}/report`} className="sf-btn accent">
              {v2.failedAt ? T("rpRetry") : T("rpMake")}
            </Link>
          }
        />
        {v2.failedAt ? (
          <div className="sf-grid sf-g3">
            <Kpi label={T("v2StuckAt")} value={v2.failedAt} icon="log" />
          </div>
        ) : null}
      </>
    );
  }

  /* 끝났다 */
  const done = v2 as Extract<V2State, { kind: "done" }>;
  return (
    <>
      <PageHead
        eyebrow={`${done.tier} · ${done.generatedAt}`}
        title={T("rpTitle")}
        sub={T("v2DoneBody")}
        actions={
          <>
            <Link href={`/assessment/${done.attemptId}/report`} className="sf-btn accent">
              {T("myOpenReport")}
            </Link>
            {done.hasPdf ? (
              <a href={`/assessment/${done.attemptId}/report/pdf`} className="sf-btn ghost">
                {T("rpPdf")}
              </a>
            ) : null}
          </>
        }
      />
      <div className="sf-grid sf-g3">
        <Kpi label={T("okTier")} value={done.tier} icon="report" />
        <Kpi label={T("evHave")} value={done.evidenceItems} icon="layers" />
        <Kpi label={T("rpMadeAt")} value={done.generatedAt} icon="clipboard" />
      </div>
      <Section title={T("navEvidence")}>
        {done.evidenceItems > 0 ? (
          <div className="sf-card">
            <p className="sf-sub" style={{ fontSize: 13.5, margin: 0 }}>
              {T("rpAgainWhy")}
            </p>
            <Link href={`/assessment/${done.attemptId}/evidence`}
              className="sf-btn ghost sm" style={{ marginTop: 14 }}>
              {T("asAddEvidence")}
            </Link>
          </div>
        ) : (
          <Empty
            icon="layers"
            title={T("rpBareTitle")}
            body={T("rpBareBody")}
            cta={{ href: `/assessment/${done.attemptId}/evidence`, label: T("asAddEvidence") }}
            tight
          />
        )}
      </Section>
    </>
  );
}

/** 묶음 이름. 대시보드와 응시 화면이 같은 사전을 쓴다 */
function SECTION_KEY(key: string) {
  const m: Record<string, "secInterest" | "secExposure" | "secOwnership"
    | "secWorkMode" | "secLearning" | "secContext"> = {
    actual_work_interest: "secInterest",
    exposure: "secExposure",
    decision_ownership: "secOwnership",
    work_mode: "secWorkMode",
    learning_intent: "secLearning",
    career_context: "secContext",
  };
  return m[key] ?? "secContext";
}
