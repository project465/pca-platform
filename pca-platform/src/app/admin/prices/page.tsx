import { requireRole } from "@/lib/session";
import { priceTable } from "@/lib/billing";
import { payConfigured, payDryRun } from "@/lib/pay";
import AdminShell from "@/components/admin-shell";
import PriceForm from "./price-form";

export const metadata = { title: "멘토링 가격 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

export default async function PricesPage() {
  const user = await requireRole(["superadmin"]);
  const rows = await priceTable();

  return (
    <AdminShell user={user} current="/admin/prices">
      <div className="page-head">
        <h1>멘토링 가격</h1>
      </div>

      {!payConfigured() && !payDryRun() ? (
        <div className="notice error" style={{ marginBottom: 18 }}>
          결제 연동이 설정돼 있지 않아 개인 회원이 신청을 마칠 수 없습니다.
          NEXT_PUBLIC_TOSS_CLIENT_KEY 와 TOSS_SECRET_KEY 를 넣으세요.
        </div>
      ) : null}

      <div className="panel form-panel">
        <PriceForm rows={rows} />
      </div>
    </AdminShell>
  );
}
