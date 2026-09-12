import { requireRole } from "@/lib/session";
import { priceTable } from "@/lib/billing";
import { payConfigured, payDryRun } from "@/lib/pay";
import AdminShell from "@/components/admin-shell";
import PriceForm from "./price-form";
import { PayoutForm, RefundForm } from "./policy-forms";
import { payoutSettings, refundRules } from "@/lib/refund";

export const metadata = { title: "멘토링 가격과 정책 — 단체 PCA 플랫폼" };
export const dynamic = "force-dynamic";

export default async function PricesPage() {
  const user = await requireRole(["superadmin"]);
  const [rows, rules, settings] = await Promise.all([
    priceTable(),
    refundRules(),
    payoutSettings(),
  ]);

  return (
    <AdminShell user={user} current="/admin/prices">
      <div className="page-head">
        <h1>멘토링 가격과 정책</h1>
      </div>

      {!payConfigured() && !payDryRun() ? (
        <div className="notice error" style={{ marginBottom: 18 }}>
          결제 연동이 설정돼 있지 않아 개인 회원이 신청을 마칠 수 없습니다.
          NEXT_PUBLIC_TOSS_CLIENT_KEY 와 TOSS_SECRET_KEY 를 넣으세요.
        </div>
      ) : null}

      <h2 className="sec-h first">정가표</h2>
      <div className="panel form-panel">
        <PriceForm rows={rows} />
      </div>

      <h2 className="sec-h">환불 규칙</h2>
      <div className="panel form-panel">
        <RefundForm rules={rules} />
      </div>

      <h2 className="sec-h">정산 설정</h2>
      <div className="panel form-panel">
        <PayoutForm
          fee={settings.fee_percent}
          withholding={settings.withholding_percent}
          holdHours={settings.hold_hours}
        />
      </div>
    </AdminShell>
  );
}
