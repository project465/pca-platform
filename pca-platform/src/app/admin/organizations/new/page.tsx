import { query } from "@/lib/db";
import { namesOf } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";
import OrgForm, { type ParentOption } from "./org-form";

export const metadata = { title: "기관 등록 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

export default async function NewOrganizationPage() {
  const user = await requireRole(["superadmin"]);

  const universities = await query<{ id: string; code: string }>(
    `SELECT id, code FROM organizations
      WHERE org_type = 'university' AND status = 'active'
      ORDER BY code`,
  );
  const names = await namesOf(
    "organizations",
    universities.map((u) => u.id),
    user.locale,
  );
  const parents: ParentOption[] = universities.map((u) => ({
    id: u.id,
    label: `${names.get(u.id) ?? u.code} (${u.code})`,
  }));

  return (
    <AdminShell user={user} current="/admin/organizations">
      <div className="page-head">
        <h1>기관 등록</h1>
      </div>
      <div className="panel form-panel">
        <OrgForm parents={parents} />
      </div>
    </AdminShell>
  );
}
