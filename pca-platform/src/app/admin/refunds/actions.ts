"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { decide } from "@/lib/refund-requests";
import { enqueue } from "@/lib/outbox";
import { queryOne } from "@/lib/db";

/**
 * 운영자가 정한다.
 *
 * **승인하면 지금 규칙으로 한 번 더 본다**(`decide` 안에서 `recordRefund`
 * 가 다시 판정한다). 요청 뒤에 응시를 시작했을 수 있고, 그때는 돌려주면
 * 그 사람의 결과지를 빼앗는 셈이 된다.
 */
export async function decideAction(form: FormData): Promise<void> {
  const user = await requireRole(["superadmin"]);
  const id = String(form.get("id") ?? "");
  const action = String(form.get("action") ?? "");
  if (!id || (action !== "approve" && action !== "deny")) return;

  const r = await decide({ requestId: id, by: user.id, action });
  if (r.ok && action === "approve") {
    /* 처리됐다는 것을 알린다. **처리 기간을 약속하지 않는다**: 카드사에
       반영되는 시점은 카드사마다 다르다 */
    const who = await queryOne<{ user_id: string; order_no: string; locale: string | null }>(
      `SELECT rr.user_id::text, o.order_no, u.locale
         FROM refund_requests rr
         JOIN orders o ON o.id = rr.order_id
         JOIN users u ON u.id = rr.user_id
        WHERE rr.id = $1`,
      [id],
    ).catch(() => null);
    if (who) {
      await enqueue({
        kind: "refund_done",
        userId: who.user_id,
        payload: { orderNo: who.order_no },
        dedupeKey: `refund_done:${id}`,
        locale: who.locale,
      });
    }
  }
  revalidatePath("/admin/refunds");
}
