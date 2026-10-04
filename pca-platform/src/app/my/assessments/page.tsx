import Link from "next/link";
import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { query } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead } from "@/components/sf/shell";
import { NAV_INDIVIDUAL } from "@/components/sf/nav";
import { Card, Empty, Pill } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `검사 · ${BRAND.root}` };

const STATUS: Record<string, { ko: string; tone: "ok" | "part" | "not" }> = {
  scored: { ko: "채점 완료", tone: "ok" },
  submitted: { ko: "제출됨", tone: "part" },
  in_progress: { ko: "응시 중", tone: "part" },
  ready: { ko: "시작 전", tone: "not" },
};

/** 응시 목록. **한 줄에 상태 하나**이고 지금 누를 것이 오른쪽에 있다. */
export default async function MyAssessments({
  searchParams,
}: { searchParams: Promise<{ lang?: string }> }) {
  const user = await requireRole(["student"]);
  const { lang: q } = await searchParams;
  const L = toLang2(await resolveLang(q));
  const T = txer(L);

  const rows = await query<{
    id: string; status: string; started: string | null; submitted: string | null;
    answered: number; total: number; track: string | null;
  }>(
    `SELECT a.id, a.status,
            to_char(a.started_at, 'YYYY-MM-DD') AS started,
            to_char(a.submitted_at, 'YYYY-MM-DD') AS submitted,
            (SELECT count(*) FROM responses r WHERE r.attempt_id = a.id)::int AS answered,
            (SELECT count(*) FROM questions qq WHERE qq.instrument_id = ts.instrument_id)::int AS total,
            (SELECT i.track_code FROM instruments i WHERE i.id = ts.instrument_id) AS track
       FROM attempts a JOIN test_sessions ts ON ts.id = a.session_id
      WHERE a.user_id = $1 ORDER BY a.id DESC`,
    [user.id],
  ).catch(() => []);

  return (
    <Shell
      surface="individual" lang={L} nav={NAV_INDIVIDUAL} active="/my/assessments"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "", href: "/my/account" }}
      topTitle={T("navAssessments")} topRight={<LangSelect current={L} />}
    >
      <PageHead
        title={T("navAssessments")}
        sub="지금까지 보신 검사와 진행 상태입니다."
        actions={<Link href="/test" className="sf-btn accent">{T("myStart")}</Link>}
      />

      {rows.length ? (
        <Card pad={false}>
          <div className="sf-tw">
            <table className="sf-table">
              <thead>
                <tr>
                  <th>검사</th><th>상태</th><th>진행</th><th>시작</th><th>제출</th><th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = STATUS[r.status] ?? { ko: r.status, tone: "not" as const };
                  const pc = r.total > 0 ? Math.round((r.answered / r.total) * 100) : null;
                  return (
                    <tr key={r.id}>
                      <td>
                        <span className="sf-strong">
                          {r.track === "HS" ? "고교 진로 진단" : "공학 진로 진단"}
                        </span>
                        <div className="sf-code">#{r.id}</div>
                      </td>
                      <td><Pill tone={s.tone}>{s.ko}</Pill></td>
                      <td className="num">
                        {pc === null ? "—" : `${r.answered} / ${r.total}`}
                      </td>
                      <td>{r.started ?? "—"}</td>
                      <td>{r.submitted ?? "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        {r.status === "scored" ? (
                          <Link href={`/report/${r.id}`} className="sf-btn ghost sm">
                            {T("myOpenReport")}
                          </Link>
                        ) : (
                          <Link href="/test" className="sf-btn ghost sm">{T("myContinue")}</Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Empty
          icon="clipboard"
          title={T("myNoAssessTitle")}
          body={T("myNoAssessBody")}
          cta={{ href: "/free", label: T("myStart") }}
        />
      )}
    </Shell>
  );
}
