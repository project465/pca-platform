"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { redeemCode, type RedeemFail } from "@/lib/redeem";
import { lastScoredAttempt } from "@/lib/attempts";

export type RedeemState = { error?: RedeemFail; reportId?: string };

/**
 * 응시권 코드를 좌석으로 바꾼다.
 *
 * `/free` 와 같은 이유로 **POST 로만 연다.** 주소만 눌러도 코드가 쓰이면
 * 링크 미리보기가 남의 응시권을 태워 버린다.
 */
export async function redeemAction(_prev: RedeemState, formData: FormData): Promise<RedeemState> {
  const user = await requireUser();
  const raw = String(formData.get("code") ?? "");
  const r = await redeemCode(user.id, raw);

  if (!r.ok) {
    // 이미 쓴 코드인데 그 사람이 본인이면, 막다른 길 대신 자기 결과지로 가는
    // 문을 준다. "이미 사용됨" 만 띄우면 산 사람이 갈 곳이 없다
    if (r.reason === "used") {
      const done = await lastScoredAttempt(user.id);
      if (done) return { error: r.reason, reportId: done };
    }
    return { error: r.reason };
  }
  redirect("/test");
}
