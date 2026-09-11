import LogoutButton from "@/components/logout-button";
import { ROLE_LABEL } from "@/lib/roles";
import { requireRole, roleInOrg } from "@/lib/session";
import { namesOf } from "@/lib/i18n";
import { linksOf, publishedInstruments, seatsOf, sessionsOf, visibleOrgIds } from "@/lib/org-links";
import { activeContract, usageOf, money, type UsageSummary } from "@/lib/billing";
import LinksPanel from "./links-panel";
import SessionsPanel from "./sessions-panel";

export const metadata = { title: "학과 담당자 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

/** 건당 계약일 때만 쓰는 값. 선불이면 보여줄 것이 없다 */
async function usageFor(orgId: string): Promise<UsageSummary | null> {
  const ct = await activeContract(orgId);
  if (!ct || ct.billing !== "per_use") return null;
  return usageOf(ct);
}

export default async function OrgHome() {
  const user = await requireRole(["org_admin", "instructor"]);

  /* 볼 수 있는 기관은 세션의 소속에서 나온다. 주소나 폼으로 고르게 하지
     않는다 — 고를 수 있으면 남의 기관을 넣어 볼 수 있게 된다 */
  const orgIds = visibleOrgIds(user);
  const names = await namesOf("organizations", orgIds, user.locale);

  const orgs = await Promise.all(
    orgIds.map(async (id) => ({
      id,
      name: names.get(id) ?? "이름 없는 기관",
      links: await linksOf(id),
      seats: await seatsOf(id),
      sessions: await sessionsOf(id),
      usage: await usageFor(id),
      // 교수는 보기만 한다. 만들고 회수하는 것은 담당자 몫이다
      canManage: roleInOrg(user, id) === "org_admin",
    })),
  );

  const instruments = await publishedInstruments();
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">단체 PCA</span>
        <div className="who">
          <span>
            {user.name} · {ROLE_LABEL[user.role]}
          </span>
          <LogoutButton />
        </div>
      </header>
      <main className="main">
        <div className="page-head">
          <h1>전용 링크</h1>
        </div>
        <p className="help" style={{ maxWidth: 640, marginTop: -8 }}>
          학생은 이 링크로 들어와 응시자로 등록합니다. 그대로 전달하셔도 됩니다.
          등록 인원은 계약한 범위를 넘지 않습니다.
        </p>

        {orgs.length === 0 ? (
          <div className="empty">
            <b>소속된 기관이 없습니다</b>
            계정에 기관이 연결되어 있지 않습니다. 운영사에 문의해 주세요.
          </div>
        ) : (
          orgs.map((o) => (
            <div key={o.id}>
              {/* 건당 계약이면 지금 얼마가 쌓였는지 담당자가 알아야 한다.
                  달이 끝난 뒤에 청구서를 받고 놀라는 일이 없어야 한다 */}
              {o.usage ? (
                <div className="usage">
                  <div>
                    <b>{o.usage.thisMonth.toLocaleString("ko-KR")}건</b>
                    <span>이번 달 발생</span>
                  </div>
                  <div>
                    <b>{money(o.usage.thisMonthAmount, o.usage.currency)}</b>
                    <span>이번 달 예상 청구액</span>
                  </div>
                  <div>
                    <b>{o.usage.total.toLocaleString("ko-KR")}건</b>
                    <span>계약 시작부터</span>
                  </div>
                  <div>
                    <b>
                      {o.usage.cap === null
                        ? "제한 없음"
                        : `${(o.usage.left ?? 0).toLocaleString("ko-KR")}건`}
                    </b>
                    <span>{o.usage.cap === null ? "건수 상한" : "남은 건수"}</span>
                  </div>
                  <p className="note">
                    제출을 마친 응시 한 건마다 쌓입니다. 시작만 하고 만 것은 세지 않습니다.
                    {o.usage.unitPrice !== null
                      ? ` 건당 ${money(o.usage.unitPrice, o.usage.currency)}.`
                      : ""}
                    확정 금액은 월 정산 때 발행되는 청구서를 따릅니다.
                  </p>
                </div>
              ) : null}

              <LinksPanel
                orgId={o.id}
                orgName={o.name}
                links={o.links}
                seats={o.seats}
                baseUrl={baseUrl}
                canManage={o.canManage}
              />
              <SessionsPanel
                orgId={o.id}
                sessions={o.sessions}
                instruments={instruments}
                canManage={o.canManage}
              />
            </div>
          ))
        )}

        <div className="empty">
          <b>남은 담당자 화면</b>
          명단 업로드와 계정 일괄 발급, 응시 진행 현황, 단체 리포트가 아직 없습니다.
        </div>
      </main>
    </div>
  );
}
