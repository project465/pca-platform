import { query } from "@/lib/db";
import { namesOf } from "@/lib/i18n";
import { requireRole } from "@/lib/session";
import { priceTable } from "@/lib/billing";
import AdminShell from "@/components/admin-shell";
import PackForm, { type OrgOption } from "./pack-form";

export const metadata = { title: "이용권 발급 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

export default async function NewPackPage() {
  const user = await requireRole(["superadmin"]);

  // 학과뿐 아니라 대학·기업도 살 수 있다. 소속이 붙는 단위면 어디든 된다
  const orgs = await query<{ id: string; code: string }>(
    `SELECT id, code FROM organizations WHERE status = 'active' ORDER BY org_type, code`,
  );
  const names = await namesOf("organizations", orgs.map((o) => o.id), user.locale);
  const options: OrgOption[] = orgs.map((o) => ({ id: o.id, label: names.get(o.id) ?? o.code }));

  return (
    <AdminShell user={user} current="/admin/mentoring-packs">
      <div className="page-head">
        <h1>이용권 발급</h1>
      </div>
      <div className="panel form-panel">
        <PackForm orgs={options} prices={await priceTable()} />
      </div>
    </AdminShell>
  );
}
