import { requireRole } from "@/lib/session";
import { query } from "@/lib/db";
import ContractForm from "./contract-form";

export const metadata = { title: "계약 등록 — METRI" };

export default async function NewContract({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  await requireRole(["superadmin"]);
  // 기관 상세에서 넘어오면 그 기관이 미리 골라져 있다
  const { org } = await searchParams;
  const orgs = await query<{ id: string; code: string; name: string }>(
    `SELECT o.id, o.code,
            COALESCE((SELECT value FROM translations WHERE table_name = 'organizations'
                       AND row_id = o.id AND lang = 'ko' AND field = 'name'), o.code) AS name
       FROM organizations o WHERE o.status = 'active' ORDER BY o.id`,
  );

  return (
    <div className="center-wrap">
      <div className="panel" style={{ maxWidth: 560 }}>
        <h1>계약 등록</h1>
        <p className="sub">
          좌석은 계약에서 나옵니다. 저장하면 좌석 수만큼 응시권이 그 자리에서 만들어집니다.
        </p>
        <ContractForm orgs={orgs} preset={org} />
      </div>
    </div>
  );
}
