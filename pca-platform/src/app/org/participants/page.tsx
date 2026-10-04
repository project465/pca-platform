import { requireRole } from "@/lib/session";
import { resolveLang } from "@/lib/locale-server";
import { orgsOf } from "@/lib/org";
import { participants } from "@/lib/insights";
import { ROLE_LABEL } from "@/lib/roles";
import { BRAND, toLang2, txer } from "@/lib/surface-text";
import { Shell, PageHead } from "@/components/sf/shell";
import { NAV_CAMPUS } from "@/components/sf/nav";
import { Card, Empty, Pill } from "@/components/sf/parts";
import LangSelect from "@/components/sf/lang-select";

export const metadata = { title: `참여자 · ${BRAND.campus}` };

const ASSESS: Record<string, { ko: string; tone: "ok" | "part" | "not" }> = {
  scored: { ko: "채점 완료", tone: "ok" },
  submitted: { ko: "제출됨", tone: "part" },
  in_progress: { ko: "응시 중", tone: "part" },
  ready: { ko: "시작 전", tone: "not" },
  not_started: { ko: "시작 전", tone: "not" },
};
const SEAT: Record<string, { ko: string; tone: "ok" | "part" | "not" }> = {
  available: { ko: "미배정", tone: "not" },
  invited: { ko: "초대", tone: "part" },
  claimed: { ko: "받음", tone: "part" },
  started: { ko: "사용 중", tone: "ok" },
  completed: { ko: "사용 완료", tone: "ok" },
  revoked: { ko: "거둠", tone: "not" },
  expired: { ko: "기간 지남", tone: "not" },
};

const PAGE = 25;

/**
 * 참여자 표.
 *
 * **개인 결과지 내용은 한 글자도 담지 않는다.** 열람 칸에 적는 것은
 * '열람 불가' 이고, 그 이유까지 같이 적는다. 담당자가 왜 못 여는지 모르면
 * 운영사에 전화가 온다.
 *
 * 찾기·거르기·쪽 넘기기는 전부 주소로 한다(`?q=` · `?st=` · `?p=`).
 * **읽는 화면에 상태를 심지 않는다**: 링크를 그대로 보내면 같은 화면이
 * 열려야 담당자끼리 주고받을 수 있다.
 */
export default async function CampusParticipants({
  searchParams,
}: { searchParams: Promise<{ lang?: string; q?: string; st?: string; p?: string }> }) {
  const user = await requireRole(["org_admin", "instructor"]);
  const sp = await searchParams;
  const L = toLang2(await resolveLang(sp.lang));
  const T = txer(L);

  const orgs = await orgsOf(user.id);
  const org = orgs[0];
  const all = org ? await participants(Number(org.id)) : [];

  const q = (sp.q ?? "").trim().toLowerCase();
  const st = sp.st ?? "";
  const filtered = all.filter((r) => {
    const okQ = !q
      || r.display_name.toLowerCase().includes(q)
      || (r.login_id ?? "").toLowerCase().includes(q)
      || (r.cohort ?? "").toLowerCase().includes(q);
    const okS = !st || r.assessment_status === st;
    return okQ && okS;
  });
  const page = Math.max(1, Number(sp.p ?? 1) || 1);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE);
  const link = (p: number) =>
    `/org/participants?${new URLSearchParams({
      ...(q ? { q } : {}), ...(st ? { st } : {}), p: String(p),
    }).toString()}`;

  return (
    <Shell
      surface="campus" lang={L} nav={NAV_CAMPUS} active="/org/participants"
      who={{ name: user.name, role: ROLE_LABEL[user.role] ?? "" }}
      topTitle={org ? org.name : BRAND.campus} topRight={<LangSelect current={L} />}
    >
      <PageHead
        eyebrow={org?.name}
        title={T("navParticipants")}
        sub={`${T("campusReportPrivateWhy")} 여기 쌓이는 것은 진행 상태뿐입니다.`}
      />

      {all.length ? (
        <Card pad={false}>
          <form className="sf-toolbar" method="get">
            <input
              className="sf-input" type="search" name="q" defaultValue={sp.q ?? ""}
              placeholder={`${T("search")}: 이름 · 아이디 · 회차`}
            />
            <select className="sf-select" name="st" defaultValue={st}>
              <option value="">{T("filterAll")}</option>
              <option value="not_started">시작 전</option>
              <option value="in_progress">응시 중</option>
              <option value="submitted">제출됨</option>
              <option value="scored">채점 완료</option>
            </select>
            <button type="submit" className="sf-btn ghost sm">{T("search")}</button>
            <span className="sf-meta">
              {filtered.length.toLocaleString()} / {all.length.toLocaleString()}
            </span>
          </form>

          <div className="sf-tw">
            <table className="sf-table">
              <thead>
                <tr>
                  <th>{T("campusColParticipant")}</th>
                  <th>{T("campusColCohort")}</th>
                  <th>{T("campusColLicense")}</th>
                  <th>{T("campusColAssessment")}</th>
                  <th>{T("campusColEvidence")}</th>
                  <th>{T("campusColReport")}</th>
                  <th>{T("campusColActivity")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const a = ASSESS[r.assessment_status] ?? { ko: r.assessment_status, tone: "not" as const };
                  const s = r.seat_status ? SEAT[r.seat_status] : null;
                  return (
                    <tr key={r.user_id}>
                      <td>
                        <span className="sf-strong">{r.display_name}</span>
                        {r.login_id ? <div className="sf-code">{r.login_id}</div> : null}
                      </td>
                      <td>{r.cohort ?? "—"}</td>
                      <td>{s ? <Pill tone={s.tone}>{s.ko}</Pill> : "—"}</td>
                      <td><Pill tone={a.tone}>{a.ko}</Pill></td>
                      <td className="sf-meta">—</td>
                      <td><span className="sf-meta">{T("campusReportPrivate")}</span></td>
                      <td className="sf-meta">{r.last_activity?.slice(0, 10) ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 ? (
            <div className="sf-pager">
              <span className="sf-meta">{page} / {pages}</span>
              <a className="sf-btn ghost sm" href={link(Math.max(1, page - 1))}
                aria-disabled={page <= 1}>{T("prev")}</a>
              <a className="sf-btn ghost sm" href={link(Math.min(pages, page + 1))}
                aria-disabled={page >= pages}>{T("next")}</a>
            </div>
          ) : null}
        </Card>
      ) : (
        <Empty
          icon="users"
          title={T("campusNoParticipantsTitle")}
          body={T("campusNoParticipantsBody")}
          cta={{ href: "/org/sessions/new", label: "회차 열기" }}
        />
      )}
    </Shell>
  );
}
