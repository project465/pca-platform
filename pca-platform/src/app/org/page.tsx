import LogoutButton from "@/components/logout-button";
import { ROLE_LABEL } from "@/lib/roles";
import { requireRole, roleInOrg } from "@/lib/session";
import { namesOf } from "@/lib/i18n";
import { linksOf, seatsOf, visibleOrgIds } from "@/lib/org-links";
import LinksPanel from "./links-panel";

export const metadata = { title: "학과 담당자 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

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
      // 교수는 보기만 한다. 만들고 회수하는 것은 담당자 몫이다
      canManage: roleInOrg(user, id) === "org_admin",
    })),
  );

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
          등록 인원은 계약한 응시권 수를 넘지 않습니다.
        </p>

        {orgs.length === 0 ? (
          <div className="empty">
            <b>소속된 기관이 없습니다</b>
            계정에 기관이 연결되어 있지 않습니다. 운영사에 문의해 주세요.
          </div>
        ) : (
          orgs.map((o) => (
            <LinksPanel
              key={o.id}
              orgId={o.id}
              orgName={o.name}
              links={o.links}
              seats={o.seats}
              baseUrl={baseUrl}
              canManage={o.canManage}
            />
          ))
        )}

        <div className="empty">
          <b>나머지 담당자 화면은 2단계에서 만듭니다</b>
          회차 생성, 명단 업로드와 계정 일괄 발급, 응시 진행 현황, 단체 리포트 순서입니다.
        </div>
      </main>
    </div>
  );
}
