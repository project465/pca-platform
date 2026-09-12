import { query } from "@/lib/db";
import { namesOf } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import AdminShell from "@/components/admin-shell";
import ContractForm, { type DeptOption } from "./contract-form";

export const metadata = { title: "계약 등록 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

export default async function NewContractPage() {
  const user = await requireRole(["superadmin"]);

  const depts = await query<{ id: string; code: string; parent_id: string | null }>(
    `SELECT id, code, parent_id FROM organizations
      WHERE org_type = 'department' AND status = 'active'
      ORDER BY code`,
  );
  const ids = depts.flatMap((d) => [d.id, d.parent_id].filter((v): v is string => v !== null));
  const names = await namesOf("organizations", ids, user.locale);

  const options: DeptOption[] = depts.map((d) => ({
    id: d.id,
    label: names.get(d.id) ?? d.code,
  }));

  return (
    <AdminShell user={user} current="/admin/contracts">
      <div className="page-head">
        <h1>계약 등록</h1>
      </div>
      <div className="panel form-panel">
        <ContractForm depts={options} />
      </div>
    </AdminShell>
  );
}
