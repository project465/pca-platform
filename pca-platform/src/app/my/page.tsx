import LogoutButton from "@/components/logout-button";
import { requireRole } from "@/lib/session";

export const metadata = { title: "내 검사 — 단체 PCA 플랫폼" };

export default async function StudentHome() {
  const user = await requireRole(["student"]);

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">단체 PCA</span>
        <div className="who">
          <span>{user.name} 님</span>
          <LogoutButton />
        </div>
      </header>
      <main className="main">
        <div className="empty">
          <b>아직 응시할 검사가 없습니다</b>
          학과에서 회차를 열고 명단에 포함되면 여기에 표시됩니다.
        </div>
      </main>
    </div>
  );
}
