import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { orgsOf } from "@/lib/org";
import { query } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead } from "@/components/sf/shell";
import { NAV_CAMPUS } from "@/components/sf/nav";
import { Card, Empty } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `회차 · ${BRAND.campus}` };

type Row = {
  id: number; name: string; description: string | null;
  starts_on: string | null; ends_on: string | null; members: number;
  done: number;
};

/**
 * 기수.
 *
 * **학과와 다른 축이다.** 같은 학과가 해마다 여러 기수를 돌리고, 한 기수에
 * 여러 학과가 섞이기도 한다. 회차(`test_sessions`)는 언제 열고 닫는가이고
 * 기수는 누구 묶음인가라, 둘을 한 표에 담으면 다시 쓸 수 없다.
 */
export default async function CampusCohorts({
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
        `SELECT c.id, c.name, c.description, c.starts_on::text, c.ends_on::text,
                count(m.user_id)::int AS members,
                count(*) FILTER (WHERE a.submitted_at IS NOT NULL)::int AS done
           FROM cohorts c
           LEFT JOIN cohort_members m ON m.cohort_id = c.id
           LEFT JOIN attempts a ON a.user_id = m.user_id
          WHERE c.org_id = $1
          GROUP BY c.id ORDER BY c.starts_on DESC NULLS LAST, c.id DESC`,
        [org.id],
      ).catch(() => [] as Row[])
    : [];

  return (
    <Shell
      surface="campus" lang={L} nav={NAV_CAMPUS} active="/org/cohorts"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={org ? org.name : BRAND.campus} topRight={<LangSelect current={L} />}
    >
      <PageHead
        eyebrow={org?.name}
        title={T("navCohorts")}
        sub="기수는 누구 묶음인가이고, 회차는 언제 열고 닫는가입니다. 둘은 다른 축입니다."
      />

      {rows.length ? (
        <Card pad={false}>
          <div className="sf-tw">
            <table className="sf-table">
              <thead>
                <tr><th>{T("campusColCohort")}</th><th>기간</th><th>인원</th>
                  <th>완료</th><th>설명</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const rate = r.members > 0 ? Math.round((r.done / r.members) * 100) : null;
                  return (
                    <tr key={r.id}>
                      <td className="sf-strong">{r.name}</td>
                      <td className="sf-meta">
                        {r.starts_on ?? "—"} ~ {r.ends_on ?? "—"}
                      </td>
                      <td className="num">{r.members}</td>
                      <td className="num">
                        {r.done}
                        {/* 바닥이 0 이면 비율을 만들지 않는다 */}
                        {rate === null ? null : <span className="sf-meta"> · {rate}%</span>}
                      </td>
                      <td className="sf-meta">{r.description ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Empty
          icon="group"
          title="아직 기수가 없습니다."
          body="기수를 만들면 참여자를 묶어서 진행 상태와 집계를 견주어 보실 수 있습니다."
          cta={{ href: "/org/sessions/new", label: "회차 열기" }}
        />
      )}
    </Shell>
  );
}
