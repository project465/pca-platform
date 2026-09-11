import Link from "next/link";
import { requireRole } from "@/lib/session";
import { contractsOf, orgsOf } from "@/lib/org";
import SessionForm from "./session-form";

export const metadata = { title: "회차 열기 — METRI" };

export default async function NewSession() {
  const user = await requireRole(["org_admin"]);
  const orgs = await orgsOf(user.id);
  const contracts = await contractsOf(orgs.map((o) => o.id));

  return (
    <div className="center-wrap">
      <div className="panel" style={{ maxWidth: 560 }}>
        <h1>회차 열기</h1>
        <p className="sub">
          응시 기간과 좌석을 댈 계약을 고릅니다. 결과 공개는 기본이 승인제입니다 —
          학과가 먼저 보고 나서 학생에게 엽니다.
        </p>
        {contracts.length === 0 ? (
          <>
            <p className="notice warn">활성 계약이 없습니다. 운영사에 계약 등록을 요청하세요.</p>
            <Link className="act" href="/org">
              돌아가기
            </Link>
          </>
        ) : (
          <SessionForm contracts={contracts} />
        )}
      </div>
    </div>
  );
}
