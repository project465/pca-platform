"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { decide, executeRefund } from "@/lib/refund-requests";

/**
 * 운영자가 정한다.
 *
 * **승인하면 지금 규칙으로 한 번 더 본다**(`decide` 안에서 `refundable`
 * 이 다시 판정한다). 요청 뒤에 응시를 시작했을 수 있고, 그때는 돌려주면
 * 그 사람의 결과지를 빼앗는 셈이 된다.
 *
 * 승인하면 결제대행사에 취소를 요청하고, **대행사가 확인한 뒤에만** 장부 · 기간 · `refund_done` 메일이
 * 움직인다(`executeRefund`). 대행사가 거절하면 요청은 `approved` 로 남고 다시 시도 단추가 선다.
 */
export async function decideAction(form: FormData): Promise<void> {
  const user = await requireRole(["superadmin"]);
  const id = String(form.get("id") ?? "");
  const action = String(form.get("action") ?? "");
  if (!id || (action !== "approve" && action !== "deny")) return;
  await decide({ requestId: id, by: user.id, action });
  revalidatePath("/admin/refunds");
}

/** 승인했는데 대행사가 거절한 요청을 다시 보낸다 */
export async function retryRefundAction(form: FormData): Promise<void> {
  await requireRole(["superadmin"]);
  const id = String(form.get("id") ?? "");
  if (!/^\d+$/.test(id)) return;
  await executeRefund(id);
  revalidatePath("/admin/refunds");
}
