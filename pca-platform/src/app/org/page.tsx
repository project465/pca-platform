import LogoutButton from "@/components/logout-button";
import { ROLE_LABEL } from "@/lib/roles";
import { requireRole } from "@/lib/session";

export const metadata = { title: "학과 담당자 — 단체 PCA 플랫폼" };

export default async function OrgHome() {
  const user = await requireRole(["org_admin", "instructor"]);

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
        <div className="empty">
          <b>학과 담당자 화면은 2단계에서 만듭니다</b>
          회차 생성, 명단 업로드와 계정 일괄 발급, 응시 진행 현황, 단체 리포트 순서입니다.
        </div>
      </main>
    </div>
  );
}
