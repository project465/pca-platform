import Link from "next/link";
import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { query } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { countOf, profileOf } from "@/lib/me-v2/evidence";
import { Shell, PageHead, Section } from "@/components/sf/shell";
import { NAV_INDIVIDUAL } from "@/components/sf/nav";
import { Card, Empty, Kpi } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `경험과 증거 · ${BRAND.root}` };

/** 사람이 읽는 갈래 이름. **안쪽 열쇠를 화면에 내보이지 않는다** */
const KIND: Record<string, { ko: string; en: string }> = {
  projects: { ko: "프로젝트", en: "Projects" },
  courses: { ko: "수업", en: "Courses" },
  tools: { ko: "도구", en: "Tools" },
  certifications: { ko: "자격", en: "Certifications" },
  publications: { ko: "논문·발표", en: "Publications" },
  patents: { ko: "특허", en: "Patents" },
  presentations: { ko: "발표", en: "Presentations" },
  awards: { ko: "수상", en: "Awards" },
  leadership: { ko: "맡아서 끌고 간 일", en: "Leadership" },
  mentoring: { ko: "가르친 일", en: "Mentoring" },
  internships: { ko: "인턴", en: "Internships" },
  employment: { ko: "일한 곳", en: "Employment" },
};

type Row = { kind: string; title: string };

/** 적어 주신 묶음을 한 줄씩 꺼낸다. **뜻을 지어내지 않는다** */
function rowsOf(evidence: Record<string, unknown>, lang: "ko" | "en"): Row[] {
  const out: Row[] = [];
  for (const [key, label] of Object.entries(KIND)) {
    const list = evidence?.[key];
    if (!Array.isArray(list)) continue;
    for (const it of list) {
      const t = typeof it === "string"
        ? it
        : String((it as { title?: unknown; name?: unknown })?.title
          ?? (it as { name?: unknown })?.name ?? "").trim();
      out.push({
        kind: label[lang],
        /* 제목을 안 적으셨어도 줄은 있다. 그 사실을 적는다 */
        title: t || (lang === "en" ? "(untitled)" : "(제목 없이 적으신 항목)"),
      });
    }
  }
  return out;
}

/**
 * 적어 주신 경험이 어디까지 증거가 되었나.
 *
 * **두 가지가 다른 것이다.**
 *
 *   검사에서 확인된 경험 신호   `해본 경험` 문항(Q17~)의 답. 응시의 일부다
 *   상세 경험으로 등록된 항목   경험 화면에서 직접 적어 주신 것
 *
 * 앞엣것은 **상세 경험이 되지 않는다.** 문항은 "해 본 적이 있는가" 까지만
 * 묻고, 무엇을 했는지·무엇을 정했는지·무엇이 남았는지는 묻지 않는다.
 * 그것을 이력으로 올리면 응시자가 적지 않은 경력을 우리가 지어내는 셈이다.
 *
 * 이 쪽이 **옛 표(`learner_evidence`)를 읽고 있었다.** ME_V2 경험은
 * `evidence_profiles` 에 담기는데 저쪽을 보고 있어서, 결과지에는 경험이
 * 적혀 나가는 동안 이 쪽은 "아직 없습니다" 라고 적었다. 받는 사람에게는
 * 둘 중 하나가 거짓이다.
 */
export default async function MyEvidence({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["student"]);
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);

  const prof = await profileOf(user.id);
  const n = countOf(prof);
  const rows = rowsOf(prof.evidence ?? {}, L);

  /* 검사에서 확인된 신호. **경험 응답이 있는 응시가 몇 건인지만 센다** */
  const sig = await query<{ n: string }>(
    `SELECT count(DISTINCT a.id)::text AS n
       FROM attempts a
      WHERE a.user_id = $1 AND a.assessment_version = 'ME_V2'
        AND a.status IN ('submitted', 'scored')`,
    [user.id],
  ).catch(() => []);
  const attempts = Number(sig[0]?.n ?? 0);

  /* 고치러 가는 자리. **ME_V2 응시가 있으면 그 응시의 경험 화면으로 간다**:
     `/evidence` 는 옛 검사의 화면이라 여기서 적은 것이 결과지에 닿지 않는다 */
  const last = await query<{ id: string }>(
    `SELECT id::text FROM attempts
      WHERE user_id = $1 AND assessment_version = 'ME_V2'
      ORDER BY id DESC LIMIT 1`,
    [user.id],
  ).catch(() => []);
  const editHref = last[0]?.id ? `/assessment/${last[0].id}/evidence` : "/evidence";

  return (
    <Shell
      surface="individual" lang={L} nav={NAV_INDIVIDUAL} active="/my/evidence"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "", href: "/my/account" }}
      topTitle={T("navEvidence")} topRight={<LangSelect current={L} />}
    >
      <PageHead
        title={T("myEvidenceIntro")}
        sub={T("myEvidenceIntroBody")}
        actions={<Link href={editHref} className="sf-btn accent">{T("myAddEvidence")}</Link>}
      />

      {/* **두 종류를 한 줄로 적는다.** 검사에서 확인된 신호가 있는데 상세
          경험이 비어 있는 것은 모순이 아니라 서로 다른 두 가지다 */}
      {attempts > 0 ? (
        <div className="sf-note">
          {L === "en"
            ? `The assessment picked up experience signals from your answers (${attempts} attempt${attempts > 1 ? "s" : ""}). Those stay inside the report. Detailed experience is what you write below, and ${rows.length === 0 ? "none is recorded yet" : `${rows.length} item${rows.length > 1 ? "s are" : " is"} recorded`}.`
            : `검사 응답에서 확인된 경험 신호가 있습니다(응시 ${attempts}건). 그 신호는 결과지 안에서만 쓰입니다. 아래의 상세 경험은 직접 적어 주셔야 쌓이고, 지금 ${rows.length === 0 ? "등록된 항목이 없습니다" : `${rows.length}건이 등록돼 있습니다`}.`}
        </div>
      ) : null}

      {rows.length || n.research ? (
        <>
          <div className="sf-grid sf-g3">
            <Kpi label="상세 경험" value={rows.length} icon="layers" accent />
            <Kpi label="연구 과제" value={n.research} icon="box" />
            <Kpi label="검사에서 확인된 신호" value={attempts > 0 ? "있음" : "없음"} icon="clipboard" />
          </div>
          <Section title="적어 주신 것">
            <Card pad={false}>
              <div className="sf-tw">
                <table className="sf-table">
                  <thead><tr><th>내용</th><th>갈래</th></tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="sf-strong">{r.title}</td>
                        <td>{r.kind}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </Section>
        </>
      ) : (
        <Empty
          icon="layers"
          title={T("myNoEvidenceTitle")}
          body={T("myNoEvidenceBody")}
          cta={{ href: editHref, label: T("myAddEvidence") }}
        />
      )}
    </Shell>
  );
}
